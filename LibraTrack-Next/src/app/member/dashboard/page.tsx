import type { Metadata } from "next";
import Link from "next/link";
import { query } from "@/lib/db";
import { requireRole } from "@/lib/session";
import {
  loansDetailed,
  mostBorrowed,
  recentEvents,
  reservationsDetailed,
} from "@/lib/service";
import { peso } from "@/lib/format";
import { Card, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { Activity } from "@/components/activity";

export const metadata: Metadata = { title: "My Dashboard" };
export const dynamic = "force-dynamic";

export default async function MemberDashboard() {
  const user = await requireRole("member");
  const d = await query((db) => {
    const loans = loansDetailed(db, user.id);
    const current = loans.filter((l) => !l.returnedOn);
    return {
      current,
      total: loans.length,
      fines: loans.reduce((s, l) => s + l.unpaid, 0),
      reserved: reservationsDetailed(db, user.id).filter(
        (r) => r.status === "active",
      ).length,
      events: recentEvents(db, 6, user.id),
      popular: mostBorrowed(db, 4),
    };
  });
  const dueSoon = d.current.filter(
    (l) => l.status === "Due soon" || l.status === "Overdue",
  ).length;
  return (
    <>
      <div className="rounded-2xl bg-navy p-5 text-white sm:p-6">
        <p className="text-sm text-white/70">Welcome back</p>
        <h2 className="text-2xl font-extrabold">{user.name}</h2>
        <p className="mt-1 text-sm text-white/70">
          {dueSoon > 0
            ? `${dueSoon} book${dueSoon > 1 ? "s" : ""} due soon or overdue.`
            : "You are all caught up."}
        </p>
        <Link
          href="/member/search"
          className="mt-4 inline-block rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold hover:bg-brand-dark"
        >
          Find a book
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Borrowed now"
          value={d.current.length}
          icon="borrowed"
          tone="green"
        />
        <StatCard
          label="Due soon / overdue"
          value={dueSoon}
          icon="overdue"
          tone={dueSoon ? "red" : "blue"}
        />
        <StatCard
          label="Reservations"
          value={d.reserved}
          icon="reserve"
          tone="yellow"
        />
        <StatCard
          label="Unpaid fines"
          value={peso(d.fines)}
          note={`${d.total} books borrowed in total`}
          icon="fine"
          tone={d.fines ? "red" : "blue"}
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="My books"
          action={
            <Link
              href="/member/borrowings"
              className="text-sm font-semibold text-brand-dark hover:underline"
            >
              View all
            </Link>
          }
        >
          {d.current.length === 0 ? (
            <EmptyState icon="borrowed" title="No books borrowed" />
          ) : (
            <ul className="grid gap-3">
              {d.current.slice(0, 5).map((l) => (
                <li
                  key={l.id}
                  className="flex items-start justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">
                      {l.bookTitle}
                    </p>
                    <p className="text-xs text-muted">{l.dueLabel}</p>
                  </div>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Popular right now">
          <ol className="grid gap-2.5 text-sm">
            {d.popular.map((b, i) => (
              <li key={b.id} className="flex justify-between gap-2">
                <span className="truncate">
                  <b className="text-navy">{i + 1}.</b> {b.title}
                </span>
                <span className="text-muted">{b.count} loans</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="My recent activity" className="lg:col-span-2">
          <Activity events={d.events} showUser={false} />
        </Card>
      </div>
    </>
  );
}
