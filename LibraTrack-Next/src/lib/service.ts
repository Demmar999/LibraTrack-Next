/*
  LibraTrack business logic: every rule for borrowing, returning, renewing,
  reserving and fines lives here. The functions take the database object `db`
  and change it directly; the API routes decide when to save it (see db.ts).
*/
import { AppError } from "./errors";
import { hashPassword, verifyPassword } from "./auth";
import { addDays, diffDays, monthWindow, nowStamp, today } from "./dates";
import { formatDate } from "./format";
import type {
  Book,
  BookInfo,
  Db,
  EventType,
  EventView,
  IdPrefix,
  Loan,
  LoanStatus,
  LoanView,
  MemberView,
  ReservationView,
  SafeUser,
  Settings,
  Stats,
  TopBook,
  Trend,
  User,
  UserStatus,
} from "./types";

const fail = (message: string, status = 400): never => {
  throw new AppError(message, status);
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const idNumber = (id: string): number => parseInt(id.slice(1), 10) || 0;

export const text = (v: unknown): string =>
  v === undefined || v === null ? "" : String(v).trim();

export function nextId(db: Db, prefix: IdPrefix): string {
  db.seq[prefix] += 1;
  return `${prefix}${db.seq[prefix]}`;
}

export const safeUser = (u: User): SafeUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  status: u.status,
  createdOn: u.createdOn,
});

const userById = (db: Db, id: string): User | undefined =>
  db.users.find((u) => u.id === id);

const bookById = (db: Db, id: string): Book | undefined =>
  db.books.find((b) => b.id === id);

const activeLoans = (db: Db): Loan[] => db.loans.filter((l) => !l.returnedOn);

const activeReservations = (db: Db) =>
  db.reservations.filter((r) => r.status === "active");

function log(
  db: Db,
  type: EventType,
  userId: string,
  bookId: string,
  note = "",
): void {
  db.events.push({
    id: nextId(db, "E"),
    type,
    userId,
    bookId,
    at: nowStamp(),
    note,
  });
}

/* =====================================================================
   Loan maths
   ===================================================================== */

export function lateDays(l: Loan): number {
  const end = l.returnedOn ?? today();
  return Math.max(0, diffDays(l.dueOn, end));
}

const fineOf = (db: Db, l: Loan): number =>
  l.returnedOn ? l.fine : lateDays(l) * db.settings.finePerDay;

const unpaidFine = (db: Db, l: Loan): number =>
  l.returnedOn ? (l.finePaid ? 0 : l.fine) : fineOf(db, l);

export function loanStatus(l: Loan): LoanStatus {
  if (l.returnedOn) return "Returned";
  const left = diffDays(today(), l.dueOn);
  if (left < 0) return "Overdue";
  if (left <= 2) return "Due soon";
  return "Borrowed";
}

function dueLabel(l: Loan): string {
  if (l.returnedOn) return `Returned ${formatDate(l.returnedOn)}`;
  const left = diffDays(today(), l.dueOn);
  if (left < 0) return `${-left} ${-left === 1 ? "day" : "days"} overdue`;
  if (left === 0) return "Due today";
  return `Due in ${left} ${left === 1 ? "day" : "days"}`;
}

/* =====================================================================
   Accounts
   ===================================================================== */

export function verifyLogin(db: Db, email: string, password: string): SafeUser {
  const e = text(email).toLowerCase();
  const u = db.users.find((x) => x.email.toLowerCase() === e);

  if (!u || !verifyPassword(password, u.passwordHash)) {
    return fail("Incorrect email or password.", 401);
  }

  if (u.status !== "active") {
    return fail(
      "This account is deactivated. Please contact the librarian.",
      403,
    );
  }

  return safeUser(u);
}

export function createMember(
  db: Db,
  input: { name?: unknown; email?: unknown; password?: unknown },
): SafeUser {
  const name = text(input.name);
  const email = text(input.email).toLowerCase();
  const password = String(input.password ?? "");

  if (name.length < 2) fail("Please enter the full name.");
  if (!EMAIL_RE.test(email)) fail("Please enter a valid email address.");
  if (password.length < 6) fail("Password must be at least 6 characters.");
  if (db.users.some((u) => u.email.toLowerCase() === email)) {
    fail("That email is already registered.");
  }

  const u: User = {
    id: nextId(db, "U"),
    name,
    email,
    passwordHash: hashPassword(password),
    role: "member",
    status: "active",
    createdOn: today(),
  };

  db.users.push(u);
  return safeUser(u);
}

export function updateProfile(
  db: Db,
  userId: string,
  input: { name?: unknown; email?: unknown },
): SafeUser {
  const u = userById(db, userId);
  if (!u) return fail("Account not found.", 404);

  const name = text(input.name);
  const email = text(input.email).toLowerCase();

  if (name.length < 2) fail("Please enter your name.");
  if (!EMAIL_RE.test(email)) fail("Please enter a valid email address.");

  if (
    db.users.some((x) => x.id !== userId && x.email.toLowerCase() === email)
  ) {
    fail("That email is already used by another account.");
  }

  u.name = name;
  u.email = email;
  return safeUser(u);
}

export function changePassword(
  db: Db,
  userId: string,
  current: string,
  next: string,
  confirm: string,
): void {
  const u = userById(db, userId);
  if (!u) return fail("Account not found.", 404);
  if (!verifyPassword(current, u.passwordHash)) {
    fail("Current password is incorrect.");
  }
  if (next.length < 6) fail("New password must be at least 6 characters.");
  if (next !== confirm) fail("New passwords do not match.");

  u.passwordHash = hashPassword(next);
}

export function setUserStatus(
  db: Db,
  userId: string,
  status: UserStatus,
): void {
  const u = userById(db, userId);
  if (!u || u.role !== "member") return fail("Member not found.", 404);
  if (status !== "active" && status !== "inactive") fail("Invalid status.");

  u.status = status;
}

/* =====================================================================
   Resources (books)
   ===================================================================== */

export function bookInfo(db: Db, b: Book): BookInfo {
  const out = activeLoans(db).filter((l) => l.bookId === b.id).length;
  const reserved = activeReservations(db).filter(
    (r) => r.bookId === b.id,
  ).length;
  const available = Math.max(0, b.copies - out);
  const status =
    available > 0 ? "Available" : reserved > 0 ? "Reserved" : "Borrowed";

  return { ...b, out, reserved, available, status };
}

export const listBooks = (db: Db): BookInfo[] =>
  db.books
    .filter((b) => !b.archived)
    .map((b) => bookInfo(db, b))
    .sort((a, b) => idNumber(b.id) - idNumber(a.id));

export const categories = (db: Db): string[] =>
  Array.from(
    new Set(db.books.filter((b) => !b.archived).map((b) => b.category)),
  ).sort();

export interface BookInput {
  id?: unknown;
  title?: unknown;
  author?: unknown;
  category?: unknown;
  type?: unknown;
  year?: unknown;
  copies?: unknown;
}

export function saveBook(db: Db, input: BookInput): void {
  const title = text(input.title);
  const author = text(input.author);
  const category = text(input.category);

  if (!title || !author || !category) {
    fail("Title, author and category are required.");
  }

  const copies = parseInt(text(input.copies), 10);
  if (!(copies >= 1)) fail("Copies must be at least 1.");

  const yearText = text(input.year);
  const year = yearText ? parseInt(yearText, 10) : null;

  if (yearText && !(year !== null && year >= 1000 && year <= 2100)) {
    fail("Please enter a valid year.");
  }

  const typeText = text(input.type) || "Book";

  if (
    typeText !== "Book" &&
    typeText !== "Journal" &&
    typeText !== "E-Resource"
  ) {
    fail("Invalid resource type.");
  }

  const type = typeText as Book["type"];
  const id = text(input.id);

  if (id) {
    const b = bookById(db, id);
    if (!b) return fail("Resource not found.", 404);

    const out = bookInfo(db, b).out;
    if (copies < out) {
      fail(`Copies cannot be lower than the ${out} currently borrowed.`);
    }

    Object.assign(b, { title, author, category, type, year, copies });
    return;
  }

  const duplicate = db.books.some(
    (b) =>
      !b.archived &&
      b.title.toLowerCase() === title.toLowerCase() &&
      b.author.toLowerCase() === author.toLowerCase(),
  );

  if (duplicate) fail("This resource is already in the catalog.");

  const next =
    Math.max(
      0,
      ...db.books.map((b) => parseInt(b.accession.slice(3), 10) || 0),
    ) + 1;

  db.books.push({
    id: nextId(db, "B"),
    accession: `LB-${String(next).padStart(4, "0")}`,
    title,
    author,
    category,
    type,
    year,
    copies,
    archived: false,
  });
}

export function deleteBook(db: Db, id: string): void {
  const b = bookById(db, id);
  if (!b) return fail("Resource not found.", 404);
  if (bookInfo(db, b).out > 0) {
    fail("Cannot delete: copies of this resource are still borrowed.");
  }

  b.archived = true;

  activeReservations(db)
    .filter((r) => r.bookId === id)
    .forEach((r) => {
      r.status = "cancelled";
    });
}

/* =====================================================================
   Borrow / return / renew / reserve / fines
   ===================================================================== */

export function borrow(
  db: Db,
  userId: string,
  bookId: string,
  dueOn?: string,
): Loan {
  const u = userById(db, userId);
  const b = bookById(db, bookId);

  if (!u || u.role !== "member") return fail("Please choose a member.");
  if (u.status !== "active") return fail("This member account is deactivated.");
  if (!b || b.archived) return fail("Please choose a resource.");

  const info = bookInfo(db, b);

  if (activeLoans(db).some((l) => l.userId === userId && l.bookId === bookId)) {
    fail("This member already has this book.");
  }

  if (
    activeLoans(db).filter((l) => l.userId === userId).length >=
    db.settings.maxLoans
  ) {
    fail(`Borrow limit reached (${db.settings.maxLoans} items at a time).`);
  }

  const mine = activeReservations(db).find(
    (r) => r.userId === userId && r.bookId === bookId,
  );

  const others = activeReservations(db).filter(
    (r) => r.bookId === bookId && r.userId !== userId,
  ).length;

  if (info.available < 1) {
    fail("No copies are available right now. You can reserve it instead.");
  }

  if (!mine && info.available - others < 1) {
    fail("The remaining copies are reserved for other members.");
  }

  const due = dueOn || addDays(today(), db.settings.loanDays);
  if (due < today()) fail("Due date cannot be in the past.");

  const loan: Loan = {
    id: nextId(db, "L"),
    userId,
    bookId,
    borrowedOn: today(),
    dueOn: due,
    returnedOn: null,
    renewals: 0,
    fine: 0,
    finePaid: false,
  };

  db.loans.push(loan);
  if (mine) mine.status = "fulfilled";

  log(db, "borrow", userId, bookId);
  return loan;
}

export function returnLoan(db: Db, loanId: string): Loan {
  const l = db.loans.find((x) => x.id === loanId);
  if (!l) return fail("Transaction not found.", 404);
  if (l.returnedOn) fail("This book was already returned.");

  l.returnedOn = today();
  l.fine = lateDays(l) * db.settings.finePerDay;
  l.finePaid = false;

  log(db, "return", l.userId, l.bookId, l.fine ? `fine ${l.fine}` : "");
  return l;
}

export function renew(db: Db, loanId: string, onlyForUserId?: string): Loan;
export function renew(db: Db, loanId: string, onlyForUserId?: string): Loan {
  const l = db.loans.find((x) => x.id === loanId);
  if (!l) return fail("Transaction not found.", 404);
  if (onlyForUserId && l.userId !== onlyForUserId) {
    fail("You can only renew your own books.", 403);
  }
  if (l.returnedOn) fail("This book was already returned.");
  if (diffDays(today(), l.dueOn) < 0) {
    fail(
      "Overdue books cannot be renewed. Please return the book and settle the fine.",
    );
  }
  if (l.renewals >= db.settings.maxRenewals) {
    fail(`Renewal limit reached (${db.settings.maxRenewals} times).`);
  }

  const book = bookById(db, l.bookId);
  const others = activeReservations(db).filter(
    (r) => r.bookId === l.bookId && r.userId !== l.userId,
  ).length;

  if (book && others > 0 && bookInfo(db, book).available < 1) {
    fail("Another member reserved this book, so it cannot be renewed.");
  }

  l.dueOn = addDays(l.dueOn, db.settings.renewDays);
  l.renewals += 1;

  log(db, "renew", l.userId, l.bookId);
  return l;
}

export function payFine(db: Db, loanId: string): void {
  const l = db.loans.find((x) => x.id === loanId);
  if (!l) return fail("Transaction not found.", 404);
  if (!l.returnedOn) {
    fail("Return the book first, then record the payment.");
  }
  if (!(l.fine > 0) || l.finePaid) {
    fail("There is no unpaid fine on this transaction.");
  }

  l.finePaid = true;
  log(db, "fine-paid", l.userId, l.bookId, `fine ${l.fine}`);
}

export function reserve(db: Db, userId: string, bookId: string): void {
  const u = userById(db, userId);
  if (!u || u.status !== "active") return fail("Account not available.");

  const b = bookById(db, bookId);
  if (!b || b.archived) return fail("Resource not found.", 404);

  if (activeLoans(db).some((l) => l.userId === userId && l.bookId === bookId)) {
    fail("This book is already borrowed by this member.");
  }

  if (
    activeReservations(db).some(
      (r) => r.userId === userId && r.bookId === bookId,
    )
  ) {
    fail("This book is already reserved by this member.");
  }

  db.reservations.push({
    id: nextId(db, "R"),
    userId,
    bookId,
    createdOn: today(),
    status: "active",
  });

  log(db, "reserve", userId, bookId);
}

export function cancelReservation(
  db: Db,
  id: string,
  onlyForUserId?: string,
): void {
  const r = db.reservations.find((x) => x.id === id);
  if (!r || r.status !== "active") return fail("Reservation not found.", 404);

  if (onlyForUserId && r.userId !== onlyForUserId) {
    fail("You can only cancel your own reservations.", 403);
  }

  r.status = "cancelled";
  log(db, "cancel", r.userId, r.bookId);
}

export function issueReservation(db: Db, id: string): void {
  const r = db.reservations.find((x) => x.id === id);
  if (!r || r.status !== "active") return fail("Reservation not found.", 404);

  borrow(db, r.userId, r.bookId);
}

/* =====================================================================
   Lists for the screens
   ===================================================================== */

export function loansDetailed(db: Db, userId?: string): LoanView[] {
  return db.loans
    .filter((l) => !userId || l.userId === userId)
    .map((l) => {
      const u = userById(db, l.userId);
      const b = bookById(db, l.bookId);

      return {
        ...l,
        userName: u?.name ?? "Unknown",
        userEmail: u?.email ?? "",
        bookTitle: b?.title ?? "Deleted resource",
        category: b?.category ?? "—",
        status: loanStatus(l),
        fineNow: fineOf(db, l),
        unpaid: unpaidFine(db, l),
        lateDays: lateDays(l),
        dueLabel: dueLabel(l),
      };
    })
    .sort((a, b) =>
      a.borrowedOn < b.borrowedOn
        ? 1
        : a.borrowedOn > b.borrowedOn
          ? -1
          : idNumber(b.id) - idNumber(a.id),
    );
}

export function reservationsDetailed(
  db: Db,
  userId?: string,
): ReservationView[] {
  return db.reservations
    .filter((r) => !userId || r.userId === userId)
    .map((r) => {
      const b = bookById(db, r.bookId);
      const info = b ? bookInfo(db, b) : null;

      return {
        ...r,
        userName: userById(db, r.userId)?.name ?? "Unknown",
        bookTitle: b?.title ?? "Deleted resource",
        available: info?.available ?? 0,
        copies: info?.copies ?? 0,
      };
    })
    .sort(
      (a, b) =>
        (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) ||
        (a.createdOn < b.createdOn ? 1 : -1),
    );
}

function whenLabel(at: string): string {
  const d = diffDays(at.slice(0, 10), today());
  return d <= 0 ? "Today" : d === 1 ? "Yesterday" : `${d} days ago`;
}

export function recentEvents(db: Db, limit = 10, userId?: string): EventView[] {
  return db.events
    .filter((e) => !userId || e.userId === userId)
    .slice()
    .sort((a, b) =>
      a.at < b.at ? 1 : a.at > b.at ? -1 : idNumber(b.id) - idNumber(a.id),
    )
    .slice(0, limit)
    .map((e) => ({
      ...e,
      userName: userById(db, e.userId)?.name ?? "Unknown",
      bookTitle: bookById(db, e.bookId)?.title ?? "Deleted resource",
      whenLabel: whenLabel(e.at),
    }));
}

export function members(db: Db): MemberView[] {
  return db.users
    .filter((u) => u.role === "member")
    .map((u) => {
      const mine = db.loans.filter((l) => l.userId === u.id);

      return {
        ...safeUser(u),
        activeLoans: mine.filter((l) => !l.returnedOn).length,
        totalLoans: mine.length,
        unpaid: mine.reduce((s, l) => s + unpaidFine(db, l), 0),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* =====================================================================
   Dashboard analytics
   ===================================================================== */

export function stats(db: Db): Stats {
  const cutoff = addDays(today(), -30);
  const books = db.books.filter((b) => !b.archived);
  const recent = new Set(
    db.loans
      .filter((l) => l.borrowedOn >= cutoff || !l.returnedOn)
      .map((l) => l.userId),
  );
  const active = activeLoans(db);

  return {
    titles: books.length,
    copies: books.reduce((s, b) => s + b.copies, 0),
    borrowed: active.length,
    overdue: active.filter((l) => loanStatus(l) === "Overdue").length,
    activeMembers: recent.size,
    members: db.users.filter((u) => u.role === "member").length,
    reserved: activeReservations(db).length,
    unpaid: db.loans.reduce((s, l) => s + unpaidFine(db, l), 0),
  };
}

export function mostBorrowed(db: Db, n = 5): TopBook[] {
  const count: Record<string, number> = {};

  db.loans.forEach((l) => {
    count[l.bookId] = (count[l.bookId] ?? 0) + 1;
  });

  return db.books
    .filter((b) => !b.archived)
    .map((b) => ({ ...b, count: count[b.id] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title))
    .slice(0, n);
}

export function categoryBreakdown(db: Db): { name: string; count: number }[] {
  const c: Record<string, number> = {};

  db.books
    .filter((b) => !b.archived)
    .forEach((b) => {
      c[b.category] = (c[b.category] ?? 0) + 1;
    });

  return Object.keys(c)
    .map((name) => ({ name, count: c[name] }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export function monthlyTrend(db: Db, months = 6): Trend {
  const { keys, labels } = monthWindow(months);

  return {
    labels,
    borrowed: keys.map(
      (k) => db.loans.filter((l) => l.borrowedOn.slice(0, 7) === k).length,
    ),
    overdue: keys.map(
      (k) =>
        db.loans.filter((l) => l.dueOn.slice(0, 7) === k && lateDays(l) > 0)
          .length,
    ),
  };
}

/* =====================================================================
   Settings
   ===================================================================== */

export function saveSettings(db: Db, input: Record<string, unknown>): Settings {
  const pick = (key: keyof Settings, min: number, label: string): number => {
    const v = parseInt(text(input[key]), 10);
    if (!(v >= min)) fail(`${label} must be ${min} or more.`);
    return v;
  };

  db.settings = {
    finePerDay: pick("finePerDay", 0, "Fine per day"),
    loanDays: pick("loanDays", 1, "Loan period"),
    renewDays: pick("renewDays", 1, "Renewal period"),
    maxRenewals: pick("maxRenewals", 0, "Maximum renewals"),
    maxLoans: pick("maxLoans", 1, "Maximum books per member"),
  };

  return db.settings;
}
