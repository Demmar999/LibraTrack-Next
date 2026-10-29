import type { Metadata } from "next";
import { Suspense } from "react";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import {
  categories,
  listBooks,
  loansDetailed,
  reservationsDetailed,
} from "@/lib/service";
import { MemberSearch, type BookMine } from "@/components/member-search";

export const metadata: Metadata = {
  title: "Search Books",
};

export const dynamic = "force-dynamic";

export default async function SearchPage() {
  const user = await requireRole("member");

  const d = await query((db) => {
    const mine: Record<string, BookMine> = {};

    loansDetailed(db, user.id)
      .filter((loan) => !loan.returnedOn)
      .forEach((loan) => {
        mine[loan.bookId] = {
          borrowed: true,
          reserved: false,
        };
      });

    reservationsDetailed(db, user.id)
      .filter((reservation) => reservation.status === "active")
      .forEach((reservation) => {
        mine[reservation.bookId] = {
          ...(mine[reservation.bookId] ?? {
            borrowed: false,
            reserved: false,
          }),
          reserved: true,
        };
      });

    return {
      books: listBooks(db) ?? [],
      cats: categories(db) ?? [],
      mine,
    };
  });

  return (
    <Suspense fallback={<p>Loading books...</p>}>
      <MemberSearch books={d.books} categories={d.cats} mine={d.mine} />
    </Suspense>
  );
}
