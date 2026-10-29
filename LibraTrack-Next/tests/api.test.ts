import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "lt-")), "db.json");
process.env.SESSION_SECRET = "test-secret";

type Handler = (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>;
const load = async (p: string): Promise<Record<string, Handler>> => (await import(p)) as Record<string, Handler>;

async function call(h: Handler, method: string, url: string, body?: unknown, cookie = "", params: Record<string, string> = {}) {
  const req = new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const res = await h(req, { params: Promise.resolve(params) });
  return res;
}
const data = async (r: Response) => (await r.json()) as Record<string, any>;
const cookieOf = (r: Response) => (r.headers.get("set-cookie") ?? "").split(";")[0];

let admin = "";
let member = "";
let login: Handler;

before(async () => {
  login = (await load("../src/app/api/auth/login/route.ts")).POST;
  admin = cookieOf(await call(login, "POST", "/api/auth/login", { email: "admin@library.com", password: "admin123" }));
  member = cookieOf(await call(login, "POST", "/api/auth/login", { email: "member@library.com", password: "member123" }));
});

test("login works and bad password fails", async () => {
  assert.ok(admin.startsWith("lt_session="));
  const bad = await call(login, "POST", "/api/auth/login", { email: "admin@library.com", password: "nope" });
  assert.equal(bad.status, 401);
  const r = await call(login, "POST", "/api/auth/login", { email: "member@library.com", password: "member123" });
  assert.equal((await data(r)).redirect, "/member/dashboard");
});

test("cookie is HttpOnly", async () => {
  const r = await call(login, "POST", "/api/auth/login", { email: "admin@library.com", password: "admin123" });
  assert.match(r.headers.get("set-cookie") ?? "", /HttpOnly/i);
});

test("roles are enforced", async () => {
  const members = await load("../src/app/api/members/route.ts");
  assert.equal((await call(members.GET, "GET", "/api/members")).status, 401);
  assert.equal((await call(members.GET, "GET", "/api/members", undefined, member)).status, 403);
  assert.equal((await call(members.GET, "GET", "/api/members", undefined, admin)).status, 200);
  const books = await load("../src/app/api/books/route.ts");
  assert.equal((await call(books.POST, "POST", "/api/books", { title: "X" }, member)).status, 403);
});

test("register creates a member and logs in", async () => {
  const reg = (await load("../src/app/api/auth/register/route.ts")).POST;
  const r = await call(reg, "POST", "/api/auth/register", { name: "New Person", email: "new@x.com", password: "abcdef", confirm: "abcdef" });
  assert.equal(r.status, 201);
  assert.ok(cookieOf(r).startsWith("lt_session="));
  const dup = await call(reg, "POST", "/api/auth/register", { name: "New Person", email: "new@x.com", password: "abcdef", confirm: "abcdef" });
  assert.equal(dup.status, 400);
  const mismatch = await call(reg, "POST", "/api/auth/register", { name: "Other", email: "o@x.com", password: "abcdef", confirm: "abcdeg" });
  assert.equal(mismatch.status, 400);
});

test("book add / edit / delete", async () => {
  const books = await load("../src/app/api/books/route.ts");
  const one = await load("../src/app/api/books/[id]/route.ts");
  const add = await call(books.POST, "POST", "/api/books", { title: "Test Book", author: "A. Writer", category: "Science", type: "Book", year: 2020, copies: 2 }, admin);
  assert.equal(add.status, 201);
  const list = (await data(await call(books.GET, "GET", "/api/books", undefined, member))).books as { id: string; title: string }[];
  const b = list.find((x) => x.title === "Test Book");
  assert.ok(b);
  const put = await call(one.PUT, "PUT", `/api/books/${b.id}`, { title: "Test Book 2", author: "A. Writer", category: "Science", type: "Book", year: 2021, copies: 3 }, admin, { id: b.id });
  assert.equal(put.status, 200);
  const del = await call(one.DELETE, "DELETE", `/api/books/${b.id}`, undefined, admin, { id: b.id });
  assert.equal(del.status, 200);
  const after = (await data(await call(books.GET, "GET", "/api/books", undefined, member))).books as { id: string }[];
  assert.ok(!after.some((x) => x.id === b.id));
});

test("borrow, renew, return flow", async () => {
  const loans = await load("../src/app/api/loans/route.ts");
  const one = await load("../src/app/api/loans/[id]/route.ts");
  const books = await load("../src/app/api/books/route.ts");
  const list = (await data(await call(books.GET, "GET", "/api/books", undefined, member))).books as { id: string; available: number }[];
  const free = list.find((b) => b.available > 1);
  assert.ok(free);
  const r = await call(loans.POST, "POST", "/api/loans", { bookId: free.id }, member);
  assert.equal(r.status, 201);
  const loan = (await data(r)).loan as { id: string };
  const renew = await call(one.PATCH, "PATCH", `/api/loans/${loan.id}`, { action: "renew" }, member, { id: loan.id });
  assert.equal(renew.status, 200);
  const memberReturn = await call(one.PATCH, "PATCH", `/api/loans/${loan.id}`, { action: "return" }, member, { id: loan.id });
  assert.equal(memberReturn.status, 403);
  const ret = await call(one.PATCH, "PATCH", `/api/loans/${loan.id}`, { action: "return" }, admin, { id: loan.id });
  assert.equal(ret.status, 200);
});

test("settings can be saved by admin only", async () => {
  const s = await load("../src/app/api/settings/route.ts");
  const body = { finePerDay: 10, loanDays: 14, renewDays: 7, maxRenewals: 2, maxLoans: 5 };
  assert.equal((await call(s.PUT, "PUT", "/api/settings", body, member)).status, 403);
  assert.equal((await call(s.PUT, "PUT", "/api/settings", body, admin)).status, 200);
  assert.equal((await call(s.PUT, "PUT", "/api/settings", { ...body, loanDays: 0 }, admin)).status, 400);
});

test("profile and password", async () => {
  const pw = await load("../src/app/api/profile/password/route.ts");
  const bad = await call(pw.POST, "POST", "/api/profile/password", { current: "wrong", next: "abcdef", confirm: "abcdef" }, member);
  assert.equal(bad.status, 400);
  const prof = await load("../src/app/api/profile/route.ts");
  const ok = await call(prof.PATCH, "PATCH", "/api/profile", { name: "Juan D. Cruz", email: "member@library.com" }, member);
  assert.equal(ok.status, 200);
});

test("member status toggle blocks login", async () => {
  const one = await load("../src/app/api/members/[id]/route.ts");
  const list = (await data(await call((await load("../src/app/api/members/route.ts")).GET, "GET", "/api/members", undefined, admin))).members as { id: string; email: string }[];
  const m = list.find((x) => x.email.endsWith("@school.edu"));
  assert.ok(m);
  assert.equal((await call(one.PATCH, "PATCH", `/api/members/${m.id}`, { status: "inactive" }, admin, { id: m.id })).status, 200);
  assert.equal((await call(login, "POST", "/api/auth/login", { email: m.email, password: "member123" })).status, 403);
});

test("reports: json, pdf, xlsx", async () => {
  const rep = (await load("../src/app/api/reports/[type]/route.ts")).GET;
  assert.equal((await call(rep, "GET", "/api/reports/inventory", undefined, member, { type: "inventory" })).status, 403);
  assert.equal((await call(rep, "GET", "/api/reports/nope", undefined, admin, { type: "nope" })).status, 404);
  const out = process.env.REPORT_OUT;
  for (const type of ["inventory", "circulation", "overdue"]) {
    const j = await data(await call(rep, "GET", `/api/reports/${type}`, undefined, admin, { type }));
    assert.ok(j.report.rows.length >= 0 && j.report.columns.length > 0);
    const pdf = await call(rep, "GET", `/api/reports/${type}?format=pdf`, undefined, admin, { type });
    const pb = Buffer.from(await pdf.arrayBuffer());
    assert.equal(pb.subarray(0, 5).toString(), "%PDF-");
    const xl = await call(rep, "GET", `/api/reports/${type}?format=xlsx`, undefined, admin, { type });
    const xb = Buffer.from(await xl.arrayBuffer());
    assert.equal(xb.subarray(0, 2).toString(), "PK");
    if (out) {
      fs.writeFileSync(path.join(out, `${type}.pdf`), pb);
      fs.writeFileSync(path.join(out, `${type}.xlsx`), xb);
    }
  }
});

test("demo reset restores data", async () => {
  const reset = (await load("../src/app/api/demo/reset/route.ts")).POST;
  assert.equal((await call(reset, "POST", "/api/demo/reset")).status, 401);
  assert.equal((await call(reset, "POST", "/api/demo/reset", undefined, member)).status, 403);
  assert.equal((await call(reset, "POST", "/api/demo/reset", undefined, admin)).status, 200);
});
