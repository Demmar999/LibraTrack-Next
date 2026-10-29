/* Demo data: accounts, books, loans and reservations (dates are relative to "today"). */
import { hashPassword } from "./auth";
import { addDays, diffDays, today } from "./dates";
import type { Db, IdPrefix, ResourceType, Role, User } from "./types";

type BookSeed = [title: string, author: string, category: string, type: ResourceType, year: number, copies: number];

// Most popular titles first (the history below favors the top of this list).
const BOOKS: BookSeed[] = [
  ["Introduction to Algorithms", "Thomas H. Cormen", "Computer Science", "Book", 2022, 3],
  ["Noli Me Tangere", "José Rizal", "Literature", "Book", 1887, 4],
  ["Fundamentals of Nursing", "Patricia A. Potter", "Health Science", "Book", 2021, 3],
  ["Principles of Accounting", "Carl S. Warren", "Business", "Book", 2018, 3],
  ["Clean Code", "Robert C. Martin", "Computer Science", "Book", 2008, 2],
  ["El Filibusterismo", "José Rizal", "Literature", "Book", 1891, 3],
  ["Database System Concepts", "Abraham Silberschatz", "Computer Science", "Book", 2019, 3],
  ["Marketing Management", "Philip Kotler", "Business", "Book", 2021, 2],
  ["Anatomy and Physiology", "Gerard J. Tortora", "Health Science", "Book", 2020, 2],
  ["Educational Psychology", "Anita Woolfolk", "Education", "Book", 2019, 2],
  ["Python Crash Course", "Eric Matthes", "Computer Science", "Book", 2023, 3],
  ["To Kill a Mockingbird", "Harper Lee", "Literature", "Book", 1960, 2],
  ["1984", "George Orwell", "Literature", "Book", 1949, 2],
  ["Medical-Surgical Nursing", "Linda Ignatavicius", "Health Science", "Book", 2020, 2],
  ["Financial Management", "Eugene F. Brigham", "Business", "Book", 2019, 2],
  ["Computer Networking: A Top-Down Approach", "James Kurose", "Computer Science", "Book", 2021, 2],
  ["Operating System Concepts", "Abraham Silberschatz", "Computer Science", "Book", 2018, 2],
  ["Principles of Management", "Stephen P. Robbins", "Business", "Book", 2020, 2],
  ["Curriculum Development", "Ralph W. Tyler", "Education", "Book", 1949, 2],
  ["Classroom Management That Works", "Robert J. Marzano", "Education", "Book", 2003, 2],
  ["Facilitating Learning", "Paz I. Bilbao", "Education", "Book", 2015, 2],
  ["Pharmacology for Nursing", "Pamela Lehne", "Health Science", "Book", 2019, 2],
  ["The Great Gatsby", "F. Scott Fitzgerald", "Literature", "Book", 1925, 2],
  ["Entrepreneurship", "Robert D. Hisrich", "Business", "Book", 2017, 2],
  ["Software Engineering", "Ian Sommerville", "Computer Science", "Book", 2015, 2],
  ["Philippine Journal of Nursing", "Philippine Nurses Association", "Health Science", "Journal", 2024, 1],
  ["Harvard Business Review Collection", "Harvard Business Publishing", "Business", "Journal", 2025, 1],
  ["ACM Digital Library Access", "ACM", "Computer Science", "E-Resource", 2026, 5],
];

/** A small repeatable random number generator, so the demo data looks the same every time. */
function mulberry(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export function buildSeed(): Db {
  const t = today();
  const rand = mulberry(2026);
  const db: Db = {
    users: [],
    books: [],
    loans: [],
    reservations: [],
    events: [],
    seq: { U: 0, B: 0, L: 0, R: 0, E: 0 },
    settings: { finePerDay: 5, loanDays: 14, renewDays: 7, maxRenewals: 2, maxLoans: 5 },
  };
  const nid = (p: IdPrefix): string => `${p}${++db.seq[p]}`;
  const hour = (): string => `${pad(8 + Math.floor(rand() * 10))}:${pad(Math.floor(rand() * 60))}:00`;
  const ev = (type: "borrow" | "return" | "renew" | "reserve", userId: string, bookId: string, date: string): void => {
    db.events.push({ id: nid("E"), type, userId, bookId, at: `${date}T${hour()}`, note: "" });
  };
  const addUser = (name: string, email: string, password: string, role: Role, ago: number): User => {
    const u: User = { id: nid("U"), name, email, passwordHash: hashPassword(password), role, status: "active", createdOn: addDays(t, -ago) };
    db.users.push(u);
    return u;
  };

  /* ---- temporary demo accounts ---- */
  addUser("Maria Santos", "admin@library.com", "admin123", "admin", 400);
  const juan = addUser("Juan Dela Cruz", "member@library.com", "member123", "member", 200);
  const m: User[] = [
    juan,
    addUser("Ana Reyes", "ana.reyes@school.edu", "member123", "member", 190),
    addUser("Paolo Lim", "paolo.lim@school.edu", "member123", "member", 180),
    addUser("Kim Tan", "kim.tan@school.edu", "member123", "member", 170),
    addUser("Liza Mendoza", "liza.mendoza@school.edu", "member123", "member", 160),
    addUser("Carlo Bautista", "carlo.bautista@school.edu", "member123", "member", 150),
    addUser("Bea Villanueva", "bea.villanueva@school.edu", "member123", "member", 140),
    addUser("Miguel Torres", "miguel.torres@school.edu", "member123", "member", 130),
  ];

  /* ---- catalog ---- */
  BOOKS.forEach((b, i) =>
    db.books.push({
      id: nid("B"),
      accession: `LB-${String(i + 1).padStart(4, "0")}`,
      title: b[0],
      author: b[1],
      category: b[2],
      type: b[3],
      year: b[4],
      copies: b[5],
      archived: false,
    }),
  );
  const bookId = (title: string): string => {
    const b = db.books.find((x) => x.title === title);
    if (!b) throw new Error(`Seed book not found: ${title}`);
    return b.id;
  };

  /* ---- loans ---- */
  interface LoanOptions {
    returnedAgo?: number;
    dueIn?: number;
    renewals?: number;
    paid?: boolean;
  }
  const addLoan = (u: User, title: string, borrowedAgo: number, o: LoanOptions = {}): void => {
    const borrowedOn = addDays(t, -borrowedAgo);
    const dueOn = o.dueIn !== undefined ? addDays(t, o.dueIn) : addDays(borrowedOn, 14);
    let returnedOn: string | null = null;
    let fine = 0;
    if (o.returnedAgo !== undefined) {
      returnedOn = addDays(t, -o.returnedAgo);
      fine = Math.max(0, diffDays(dueOn, returnedOn)) * 5;
    }
    const bid = bookId(title);
    db.loans.push({
      id: nid("L"),
      userId: u.id,
      bookId: bid,
      borrowedOn,
      dueOn,
      returnedOn,
      renewals: o.renewals ?? 0,
      fine,
      finePaid: fine > 0 ? Boolean(o.paid) : false,
    });
    ev("borrow", u.id, bid, borrowedOn);
    if (o.renewals) ev("renew", u.id, bid, addDays(borrowedOn, 12));
    if (returnedOn) ev("return", u.id, bid, returnedOn);
  };

  // Juan Dela Cruz (the demo member)
  addLoan(juan, "Introduction to Algorithms", 62, { returnedAgo: 52 });
  addLoan(juan, "Database System Concepts", 55, { returnedAgo: 38 }); // 3 days late, fine unpaid
  addLoan(juan, "Python Crash Course", 30, { returnedAgo: 21 });
  addLoan(juan, "Noli Me Tangere", 7); // due in 7 days
  addLoan(juan, "Fundamentals of Nursing", 25); // overdue
  addLoan(juan, "Principles of Accounting", 12); // due in 2 days
  // other members: current loans
  addLoan(m[1], "Introduction to Algorithms", 10);
  addLoan(m[2], "Introduction to Algorithms", 3);
  addLoan(m[3], "Introduction to Algorithms", 20); // overdue
  addLoan(m[3], "Fundamentals of Nursing", 22); // overdue
  addLoan(m[6], "Fundamentals of Nursing", 4);
  addLoan(m[4], "Clean Code", 5);
  addLoan(m[5], "Clean Code", 13);
  addLoan(m[2], "Principles of Accounting", 16, { renewals: 1, dueIn: 5 });
  addLoan(m[7], "Database System Concepts", 8);
  addLoan(m[7], "Python Crash Course", 9);
  addLoan(m[4], "To Kill a Mockingbird", 6);
  addLoan(m[5], "Marketing Management", 18); // overdue
  addLoan(m[6], "Anatomy and Physiology", 11);
  addLoan(m[1], "1984", 2);
  // history, so the charts have something to show
  for (let i = 0; i < 95; i++) {
    const u = m[1 + Math.floor(rand() * 7)];
    const b = db.books[Math.floor(Math.pow(rand(), 1.7) * db.books.length)];
    const ago = 20 + Math.floor(rand() * 160);
    const dur = rand() < 0.2 ? 15 + Math.floor(rand() * 5) : 4 + Math.floor(rand() * 11);
    addLoan(u, b.title, ago, { returnedAgo: ago - dur, paid: true });
  }

  /* ---- reservations ---- */
  const addReservation = (u: User, title: string, ago: number): void => {
    const bid = bookId(title);
    const createdOn = addDays(t, -ago);
    db.reservations.push({ id: nid("R"), userId: u.id, bookId: bid, createdOn, status: "active" });
    ev("reserve", u.id, bid, createdOn);
  };
  addReservation(juan, "Clean Code", 2);
  addReservation(m[2], "Fundamentals of Nursing", 1);

  return db;
}
