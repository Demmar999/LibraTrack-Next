/*
  The database: PostgreSQL (through the "pg" package).

  The tables are created automatically the first time the app runs, and the demo data
  (admin account, books, members...) is added if the users table is empty.

  How it works, in short:
    query(fn)   reads the tables into one plain object (db), runs fn(db) and returns its result.
    mutate(fn)  does the same, then saves whatever fn changed, all inside ONE transaction.
                If fn throws an error, nothing is saved.
  So all library rules stay in service.ts, and every account / book / loan is stored in PostgreSQL.
*/
declare const require: (id: string) => unknown;

type Row = Record<string, unknown>;
interface PoolClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: Row[] }>;
  release(): void;
}
interface Pool {
  connect(): Promise<PoolClient>;
}
const { Pool } = require("pg") as {
  Pool: new (options: {
    connectionString: string;
    max: number;
    ssl?: { rejectUnauthorized: boolean };
  }) => Pool;
};
import { buildSeed } from "./seed";
import type { Db, IdPrefix } from "./types";

const LOCK = 727001; // lets only one request change data at a time

/* ---------- tables (created automatically) ---------- */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  n bigint GENERATED ALWAYS AS IDENTITY,
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member')),
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  created_on text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));

CREATE TABLE IF NOT EXISTS books (
  n bigint GENERATED ALWAYS AS IDENTITY,
  id text PRIMARY KEY,
  accession text NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  category text NOT NULL,
  type text NOT NULL,
  year integer,
  copies integer NOT NULL,
  archived boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS loans (
  n bigint GENERATED ALWAYS AS IDENTITY,
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users (id),
  book_id text NOT NULL REFERENCES books (id),
  borrowed_on text NOT NULL,
  due_on text NOT NULL,
  returned_on text,
  renewals integer NOT NULL DEFAULT 0,
  fine integer NOT NULL DEFAULT 0,
  fine_paid boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS reservations (
  n bigint GENERATED ALWAYS AS IDENTITY,
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users (id),
  book_id text NOT NULL REFERENCES books (id),
  created_on text NOT NULL,
  status text NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  n bigint GENERATED ALWAYS AS IDENTITY,
  id text PRIMARY KEY,
  type text NOT NULL,
  user_id text NOT NULL,
  book_id text NOT NULL,
  at text NOT NULL,
  note text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS settings (
  id integer PRIMARY KEY CHECK (id = 1),
  fine_per_day integer NOT NULL,
  loan_days integer NOT NULL,
  renew_days integer NOT NULL,
  max_renewals integer NOT NULL,
  max_loans integer NOT NULL
);

CREATE TABLE IF NOT EXISTS counters (
  prefix text PRIMARY KEY,
  value integer NOT NULL
);
`;

/* ---------- how each table maps to the db object: [field in code, column in table] ---------- */
type Pair = [field: string, column: string];
interface TableDef {
  key: "users" | "books" | "loans" | "reservations" | "events";
  table: string;
  fields: Pair[]; // the first pair is the primary key
}

// Parents first (users, books), then the tables that point to them.
const TABLES: TableDef[] = [
  {
    key: "users",
    table: "users",
    fields: [
      ["id", "id"],
      ["name", "name"],
      ["email", "email"],
      ["passwordHash", "password_hash"],
      ["role", "role"],
      ["status", "status"],
      ["createdOn", "created_on"],
    ],
  },
  {
    key: "books",
    table: "books",
    fields: [
      ["id", "id"],
      ["accession", "accession"],
      ["title", "title"],
      ["author", "author"],
      ["category", "category"],
      ["type", "type"],
      ["year", "year"],
      ["copies", "copies"],
      ["archived", "archived"],
    ],
  },
  {
    key: "loans",
    table: "loans",
    fields: [
      ["id", "id"],
      ["userId", "user_id"],
      ["bookId", "book_id"],
      ["borrowedOn", "borrowed_on"],
      ["dueOn", "due_on"],
      ["returnedOn", "returned_on"],
      ["renewals", "renewals"],
      ["fine", "fine"],
      ["finePaid", "fine_paid"],
    ],
  },
  {
    key: "reservations",
    table: "reservations",
    fields: [
      ["id", "id"],
      ["userId", "user_id"],
      ["bookId", "book_id"],
      ["createdOn", "created_on"],
      ["status", "status"],
    ],
  },
  {
    key: "events",
    table: "events",
    fields: [
      ["id", "id"],
      ["type", "type"],
      ["userId", "user_id"],
      ["bookId", "book_id"],
      ["at", "at"],
      ["note", "note"],
    ],
  },
];

const SETTINGS: Pair[] = [
  ["finePerDay", "fine_per_day"],
  ["loanDays", "loan_days"],
  ["renewDays", "renew_days"],
  ["maxRenewals", "max_renewals"],
  ["maxLoans", "max_loans"],
];

/* ---------- connection ---------- */
const g = globalThis as unknown as {
  __ltPool?: Pool;
  __ltReady?: Promise<void>;
};

function pool(): Pool {
  if (!g.__ltPool) {
    const url = process.env.DATABASE_URL;
    if (!url)
      throw new Error(
        "DATABASE_URL is not set. Add it to .env.local, then restart `npm run dev`.",
      );
    g.__ltPool = new Pool({
      connectionString: url,
      max: 10,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: false }
          : undefined,
    });
  }
  return g.__ltPool;
}

/* ---------- reading ---------- */
const signature = (fields: Pair[], item: Row): string =>
  JSON.stringify(fields.map(([f]) => item[f] ?? null));

type Snapshot = Record<string, Map<string, string>>;

async function load(c: PoolClient): Promise<{ db: Db; snap: Snapshot }> {
  const db = {
    users: [],
    books: [],
    loans: [],
    reservations: [],
    events: [],
  } as unknown as Db;
  const snap: Snapshot = {};
  for (const t of TABLES) {
    const { rows } = await c.query(`SELECT * FROM ${t.table} ORDER BY n`);
    const items = rows.map((r: Row) => {
      const o: Row = {};
      for (const [f, col] of t.fields) o[f] = r[col];
      return o;
    });
    (db as unknown as Record<string, Row[]>)[t.key] = items;
    snap[t.key] = new Map(
      items.map((o) => [String(o.id), signature(t.fields, o)]),
    );
  }
  const s = (await c.query("SELECT * FROM settings WHERE id = 1")).rows[0] as
    | Row
    | undefined;
  const settings: Row = {};
  for (const [f, col] of SETTINGS) settings[f] = s ? s[col] : 0;
  db.settings = settings as unknown as Db["settings"];
  const seq = { U: 0, B: 0, L: 0, R: 0, E: 0 } as Record<IdPrefix, number>;
  for (const r of (await c.query("SELECT prefix, value FROM counters"))
    .rows as { prefix: IdPrefix; value: number }[])
    seq[r.prefix] = r.value;
  db.seq = seq;
  snap.settings = new Map([["1", signature(SETTINGS, settings)]]);
  snap.seq = new Map(Object.entries(seq).map(([k, v]) => [k, String(v)]));
  return { db, snap };
}

/* ---------- writing (only what changed) ---------- */
async function save(c: PoolClient, db: Db, before: Snapshot): Promise<void> {
  // new and changed rows, parents first
  for (const t of TABLES) {
    const cols = t.fields.map(([, col]) => col);
    const marks = cols.map((_, i) => `$${i + 1}`).join(", ");
    const updates = cols
      .slice(1)
      .map((col) => `${col} = EXCLUDED.${col}`)
      .join(", ");
    const sql = `INSERT INTO ${t.table} (${cols.join(", ")}) VALUES (${marks}) ON CONFLICT (id) DO UPDATE SET ${updates}`;
    for (const item of (db as unknown as Record<string, Row[]>)[t.key]) {
      if (before[t.key].get(String(item.id)) === signature(t.fields, item))
        continue;
      await c.query(
        sql,
        t.fields.map(([f]) => item[f] ?? null),
      );
    }
  }
  // removed rows, children first
  for (const t of [...TABLES].reverse()) {
    const now = new Set(
      (db as unknown as Record<string, Row[]>)[t.key].map((o) => String(o.id)),
    );
    const gone = [...before[t.key].keys()].filter((id) => !now.has(id));
    if (gone.length)
      await c.query(`DELETE FROM ${t.table} WHERE id = ANY($1)`, [gone]);
  }
  // settings and id counters
  const settings = db.settings as unknown as Row;
  if (before.settings.get("1") !== signature(SETTINGS, settings)) {
    await c.query(
      `INSERT INTO settings (id, ${SETTINGS.map(([, col]) => col).join(", ")}) VALUES (1, ${SETTINGS.map((_, i) => `$${i + 1}`).join(", ")})
       ON CONFLICT (id) DO UPDATE SET ${SETTINGS.map(([, col]) => `${col} = EXCLUDED.${col}`).join(", ")}`,
      SETTINGS.map(([f]) => settings[f]),
    );
  }
  for (const [prefix, value] of Object.entries(db.seq)) {
    if (before.seq.get(prefix) === String(value)) continue;
    await c.query(
      "INSERT INTO counters (prefix, value) VALUES ($1, $2) ON CONFLICT (prefix) DO UPDATE SET value = EXCLUDED.value",
      [prefix, value],
    );
  }
}

/** Empties every table and puts the given data in. */
async function replaceAll(c: PoolClient, db: Db): Promise<void> {
  await c.query(
    "TRUNCATE events, reservations, loans, books, users, settings, counters RESTART IDENTITY",
  );
  const empty: Snapshot = {
    users: new Map(),
    books: new Map(),
    loans: new Map(),
    reservations: new Map(),
    events: new Map(),
    settings: new Map(),
    seq: new Map(),
  };
  await save(c, db, empty);
}

/* ---------- first run: create tables + demo data ---------- */
async function init(): Promise<void> {
  const c = await pool().connect();
  try {
    await c.query("SELECT pg_advisory_lock($1)", [LOCK]);
    await c.query(SCHEMA);
    const { rows } = await c.query("SELECT count(*)::int AS n FROM users");
    if (rows[0].n === 0) {
      await c.query("BEGIN");
      try {
        await replaceAll(c, buildSeed());
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    await c.query("SELECT pg_advisory_unlock($1)", [LOCK]).catch(() => {});
    c.release();
  }
}

function ready(): Promise<void> {
  if (!g.__ltReady) {
    g.__ltReady = init().catch((e) => {
      g.__ltReady = undefined; // try again on the next request
      throw e;
    });
  }
  return g.__ltReady;
}

async function transaction<T>(
  readOnly: boolean,
  work: (c: PoolClient) => Promise<T>,
): Promise<T> {
  await ready();
  const c = await pool().connect();
  try {
    await c.query(
      readOnly ? "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY" : "BEGIN",
    );
    if (!readOnly) await c.query("SELECT pg_advisory_xact_lock($1)", [LOCK]);
    const result = await work(c);
    await c.query("COMMIT");
    return result;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/* ---------- what the rest of the app uses ---------- */

/** Read-only access. */
export function query<T>(fn: (db: Db) => T): Promise<T> {
  return transaction(true, async (c) => fn((await load(c)).db));
}

/** Read, change, then save. If fn throws, nothing is saved. */
export function mutate<T>(fn: (db: Db) => T): Promise<T> {
  return transaction(false, async (c) => {
    const { db, snap } = await load(c);
    const result = fn(db);
    await save(c, db, snap);
    return result;
  });
}

/** Throw away all changes and restore the demo data. */
export function resetDb(): Promise<void> {
  return transaction(false, (c) => replaceAll(c, buildSeed()));
}
