/* Report data (shown as a preview on screen, and saved as PDF / Excel). */
import { bookInfo, loansDetailed } from "./service";
import type { Db, ReportData, ReportFilters, ReportType } from "./types";

export const REPORT_TYPES: ReportType[] = ["inventory", "circulation", "overdue"];
export const isReportType = (v: string): v is ReportType => (REPORT_TYPES as string[]).includes(v);

export function buildReport(db: Db, type: ReportType, f: ReportFilters = {}): ReportData {
  const inRange = (d: string): boolean => (!f.from || d >= f.from) && (!f.to || d <= f.to);
  const categoryOk = (c: string): boolean => !f.cat || f.cat === "All" || c === f.cat;

  if (type === "inventory") {
    const times: Record<string, number> = {};
    db.loans.forEach((l) => {
      times[l.bookId] = (times[l.bookId] ?? 0) + 1;
    });
    const rows = db.books
      .filter((b) => !b.archived && categoryOk(b.category))
      .map((b) => bookInfo(db, b))
      .sort((a, b) => a.accession.localeCompare(b.accession))
      .map((b) => [b.accession, b.title, b.author, b.category, b.type, b.year ?? "", b.copies, b.available, times[b.id] ?? 0, b.status]);
    return {
      title: "Book Inventory Report",
      slug: "Inventory",
      columns: ["Accession", "Title", "Author", "Category", "Type", "Year", "Copies", "Available", "Times Borrowed", "Status"],
      money: [],
      rows,
      summary: [
        ["Titles", rows.length],
        ["Copies", rows.reduce((s, r) => s + Number(r[6]), 0)],
        ["Available copies", rows.reduce((s, r) => s + Number(r[7]), 0)],
      ],
    };
  }

  if (type === "circulation") {
    const rows = loansDetailed(db)
      .filter((l) => categoryOk(l.category) && inRange(l.borrowedOn))
      .map((l) => [l.id, l.userName, l.bookTitle, l.category, l.borrowedOn, l.dueOn, l.returnedOn ?? "", l.renewals, l.status, l.fineNow]);
    return {
      title: "Circulation Report",
      slug: "Circulation",
      columns: ["Loan ID", "Member", "Book", "Category", "Borrowed", "Due", "Returned", "Renewals", "Status", "Fine (PHP)"],
      money: [9],
      rows,
      summary: [
        ["Transactions", rows.length],
        ["Returned", rows.filter((r) => r[8] === "Returned").length],
        ["Still out", rows.filter((r) => r[8] !== "Returned").length],
      ],
    };
  }

  const rows = loansDetailed(db)
    .filter((l) => (l.status === "Overdue" || l.fine > 0) && categoryOk(l.category) && inRange(l.dueOn))
    .map((l) => [
      l.userName,
      l.bookTitle,
      l.dueOn,
      l.returnedOn ?? "",
      l.lateDays,
      l.fineNow,
      l.returnedOn ? (l.finePaid ? "Paid" : "Unpaid") : "Accruing",
    ]);
  return {
    title: "Overdue and Fines Report",
    slug: "Overdue-Fines",
    columns: ["Member", "Book", "Due", "Returned", "Days Late", "Fine (PHP)", "Fine Status"],
    money: [5],
    rows,
    summary: [
      ["Records", rows.length],
      ["Total fines (PHP)", rows.reduce((s, r) => s + Number(r[5]), 0)],
      ["Unpaid / accruing (PHP)", rows.filter((r) => r[6] !== "Paid").reduce((s, r) => s + Number(r[5]), 0)],
    ],
  };
}
