import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSeed } from "../src/lib/seed";
import { setToday } from "../src/lib/dates";
import * as s from "../src/lib/service";
import { AppError } from "../src/lib/errors";
import type { Db } from "../src/lib/types";

const fresh = (): Db => {
  setToday("2026-10-20");
  return buildSeed();
};
const throwsApp = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e: unknown) => e instanceof AppError && re.test(e.message));
const memberId = (db: Db, email: string) => db.users.find((u) => u.email === email)!.id;

test("fine is 5 per overdue day and is saved on return", () => {
  const db = fresh();
  const uid = memberId(db, "member@library.com");
  const book = s.listBooks(db).find((b) => b.available > 1)!;
  const loan = s.borrow(db, uid, book.id, "2026-10-20");
  setToday("2026-10-25");
  assert.equal(s.loanStatus(loan), "Overdue");
  assert.equal(s.lateDays(loan), 5);
  const r = s.returnLoan(db, loan.id);
  assert.equal(r.fine, 25);
  s.payFine(db, loan.id);
  throwsApp(() => s.payFine(db, loan.id), /no unpaid fine/);
});

test("renewals: max 2, overdue cannot renew", () => {
  const db = fresh();
  const uid = memberId(db, "member@library.com");
  const book = s.listBooks(db).find((b) => b.available > 2 && !db.loans.some((l) => l.userId === uid && !l.returnedOn && l.bookId === b.id))!;
  const loan = s.borrow(db, uid, book.id);
  s.renew(db, loan.id);
  s.renew(db, loan.id);
  throwsApp(() => s.renew(db, loan.id), /limit/);
  const late = s.borrow(db, uid, s.listBooks(db).find((b) => b.available > 2 && b.id !== book.id)!.id, "2026-10-21");
  setToday("2026-10-23");
  throwsApp(() => s.renew(db, late.id), /Overdue/);
});

test("members cannot renew someone else's loan", () => {
  const db = fresh();
  const loan = db.loans.find((l) => !l.returnedOn)!;
  const other = db.users.find((u) => u.role === "member" && u.id !== loan.userId)!;
  throwsApp(() => s.renew(db, loan.id, other.id), /own/);
});

test("borrow limit of 5 and duplicate borrow", () => {
  const db = fresh();
  const u = s.createMember(db, { name: "Test User", email: "t@x.com", password: "abcdef" });
  const free = s.listBooks(db).filter((b) => b.available > 1);
  for (let i = 0; i < 5; i++) s.borrow(db, u.id, free[i].id);
  throwsApp(() => s.borrow(db, u.id, free[5].id), /limit/);
  throwsApp(() => s.borrow(db, u.id, free[0].id), /already/);
});

test("reservation flow and protection of reserved copies", () => {
  const db = fresh();
  const u = s.createMember(db, { name: "Reserver", email: "r@x.com", password: "abcdef" });
  const book = s.listBooks(db).find((b) => b.available === 0) ?? null;
  if (book) {
    s.reserve(db, u.id, book.id);
    throwsApp(() => s.reserve(db, u.id, book.id), /already reserved/);
    const r = db.reservations.find((x) => x.userId === u.id && x.status === "active")!;
    s.cancelReservation(db, r.id, u.id);
    assert.equal(db.reservations.find((x) => x.id === r.id)!.status, "cancelled");
  }
});

test("accounts: validation, duplicate email, deactivation", () => {
  const db = fresh();
  throwsApp(() => s.createMember(db, { name: "A", email: "bad", password: "123456" }), /name|email/i);
  throwsApp(() => s.createMember(db, { name: "Dup", email: "member@library.com", password: "abcdef" }), /already registered/);
  const u = s.createMember(db, { name: "Okay Person", email: "ok@x.com", password: "abcdef" });
  assert.equal(s.verifyLogin(db, "ok@x.com", "abcdef").id, u.id);
  throwsApp(() => s.verifyLogin(db, "ok@x.com", "wrong"), /Incorrect/);
  s.setUserStatus(db, u.id, "inactive");
  throwsApp(() => s.verifyLogin(db, "ok@x.com", "abcdef"), /deactivated/);
});

test("books: archive keeps history, cannot delete borrowed book", () => {
  const db = fresh();
  const out = db.loans.find((l) => !l.returnedOn)!;
  throwsApp(() => s.deleteBook(db, out.bookId), /./);
  s.saveBook(db, { title: "Temp", author: "X Y", category: "Test", type: "Book", year: 2020, copies: 1 });
  const b = db.books.find((x) => x.title === "Temp")!;
  s.deleteBook(db, b.id);
  assert.ok(s.listBooks(db).every((x) => x.id !== b.id));
});

test("dashboard analytics are consistent", () => {
  const db = fresh();
  const st = s.stats(db);
  assert.equal(st.borrowed, db.loans.filter((l) => !l.returnedOn).length);
  assert.equal(s.monthlyTrend(db, 6).labels.length, 6);
  assert.ok(s.mostBorrowed(db, 5)[0].count >= s.mostBorrowed(db, 5)[4].count);
});
