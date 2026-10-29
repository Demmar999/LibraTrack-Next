import type { Metadata } from "next";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { loansDetailed, reservationsDetailed } from "@/lib/service";
import { MemberBorrowings } from "@/components/member-borrowings";

export const metadata: Metadata = { title: "My Borrowings" };
export const dynamic = "force-dynamic";

export default async function BorrowingsPage() {
  const user = await requireRole("member");
  const d = await query((db) => {
    const loans = loansDetailed(db, user.id);
    return {
      current: loans.filter((l) => !l.returnedOn),
      history: loans.filter((l) => l.returnedOn),
      reservations: reservationsDetailed(db, user.id),
      maxRenewals: db.settings.maxRenewals,
    };
  });
  return <MemberBorrowings {...d} />;
}
