/* Shared types: the "shape" of every record in LibraTrack. */

export type Role = "admin" | "member";
export type UserStatus = "active" | "inactive";
export type ResourceType = "Book" | "Journal" | "E-Resource";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  createdOn: string; // YYYY-MM-DD
}
export type SafeUser = Omit<User, "passwordHash">;

export interface Book {
  id: string;
  accession: string;
  title: string;
  author: string;
  category: string;
  type: ResourceType;
  year: number | null;
  copies: number;
  archived: boolean; // "deleted" books are hidden but kept for history
}

export interface Loan {
  id: string;
  userId: string;
  bookId: string;
  borrowedOn: string;
  dueOn: string;
  returnedOn: string | null;
  renewals: number;
  fine: number; // final fine, saved when the book is returned
  finePaid: boolean;
}

export type ReservationStatus = "active" | "fulfilled" | "cancelled";
export interface Reservation {
  id: string;
  userId: string;
  bookId: string;
  createdOn: string;
  status: ReservationStatus;
}

export type EventType = "borrow" | "return" | "renew" | "reserve" | "cancel" | "fine-paid";
export interface EventLog {
  id: string;
  type: EventType;
  userId: string;
  bookId: string;
  at: string; // YYYY-MM-DDTHH:mm:ss
  note: string;
}

export interface Settings {
  finePerDay: number;
  loanDays: number;
  renewDays: number;
  maxRenewals: number;
  maxLoans: number;
}

export type IdPrefix = "U" | "B" | "L" | "R" | "E";

/** The whole database (saved as one JSON file). */
export interface Db {
  users: User[];
  books: Book[];
  loans: Loan[];
  reservations: Reservation[];
  events: EventLog[];
  seq: Record<IdPrefix, number>;
  settings: Settings;
}

/* ---------- "views": records with extra info for the screens ---------- */
export type LoanStatus = "Borrowed" | "Due soon" | "Overdue" | "Returned";
export type BookStatus = "Available" | "Reserved" | "Borrowed";

export interface BookInfo extends Book {
  out: number; // copies currently borrowed
  reserved: number; // active reservations
  available: number; // copies on the shelf
  status: BookStatus;
}
export interface LoanView extends Loan {
  userName: string;
  userEmail: string;
  bookTitle: string;
  category: string;
  status: LoanStatus;
  fineNow: number; // fine so far (accrues while overdue)
  unpaid: number;
  lateDays: number;
  dueLabel: string; // "Due in 3 days", "5 days overdue" ...
}
export interface ReservationView extends Reservation {
  userName: string;
  bookTitle: string;
  available: number;
  copies: number;
}
export interface EventView extends EventLog {
  userName: string;
  bookTitle: string;
  whenLabel: string; // "Today", "2 days ago" ...
}
export interface MemberView extends SafeUser {
  activeLoans: number;
  totalLoans: number;
  unpaid: number;
}
export interface TopBook extends Book {
  count: number;
}

export interface Stats {
  titles: number;
  copies: number;
  borrowed: number;
  overdue: number;
  activeMembers: number;
  members: number;
  reserved: number;
  unpaid: number;
}
export interface Trend {
  labels: string[];
  borrowed: number[];
  overdue: number[];
}

export type ReportType = "inventory" | "circulation" | "overdue";
export interface ReportFilters {
  from?: string;
  to?: string;
  cat?: string;
}
export interface ReportData {
  title: string;
  slug: string;
  columns: string[];
  money: number[]; // indexes of money columns
  rows: (string | number)[][];
  summary: [string, string | number][];
}
