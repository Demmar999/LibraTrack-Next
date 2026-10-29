import type { Metadata } from "next";
import { today } from "@/lib/dates";
import { query } from "@/lib/db";
import { listBooks, loansDetailed, members, reservationsDetailed } from "@/lib/service";
import { BorrowingManager } from "@/components/borrowing-manager";

export const metadata: Metadata = { title: "Borrowing" };
export const dynamic = "force-dynamic";

export default async function BorrowingPage() {
  const d = await query((db) => ({
    loans: loansDetailed(db), reservations: reservationsDetailed(db), members: members(db), books: listBooks(db), loanDays: db.settings.loanDays,
  }));
  return <BorrowingManager {...d} today={today()} />;
}
