import type { Metadata } from "next";
import { query } from "@/lib/db";
import {
  categoryBreakdown,
  loansDetailed,
  monthlyTrend,
  mostBorrowed,
  recentEvents,
  stats,
} from "@/lib/service";
import { peso } from "@/lib/format";
import { Card, EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { Donut, LineChart } from "@/components/charts";
import { Activity } from "@/components/activity";

export const metadata: Metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const d = await query((db) => ({
    s: stats(db),
    trend: monthlyTrend(db, 6),
    cats: categoryBreakdown(db),
    top: mostBorrowed(db, 5),
    events: recentEvents(db, 7),
    overdue: loansDetailed(db)
      .filter((l) => l.status === "Overdue")
      .sort((a, b) => b.lateDays - a.lateDays)
      .slice(0, 5),
  }));
  const max = Math.max(1, ...d.top.map((t) => t.count));
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total titles"
          value={d.s.titles}
          note={`${d.s.copies} copies`}
          icon="resources"
          tone="blue"
        />
        <StatCard
          label="Borrowed now"
          value={d.s.borrowed}
          note={`${d.s.reserved} reserved`}
          icon="borrowed"
          tone="green"
        />
        <StatCard
          label="Overdue"
          value={d.s.overdue}
          note="Need follow-up"
          icon="overdue"
          tone="red"
        />
        <StatCard
          label="Active members"
          value={d.s.activeMembers}
          note={`of ${d.s.members} members · ${peso(d.s.unpaid)} unpaid`}
          icon="members"
          tone="yellow"
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <Card title="Borrowing and overdue trend" className="xl:col-span-2">
          <LineChart trend={d.trend} />
        </Card>
        <Card title="Books by category">
          <Donut data={d.cats} />
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Card title="Most borrowed">
          <ol className="grid gap-3">
            {d.top.map((t, i) => (
              <li key={t.id} className="grid gap-1">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-navy">
                    {i + 1}. {t.title}
                  </span>
                  <span className="font-semibold">{t.count}</span>
                </div>
                <div className="h-2 rounded-full bg-line">
                  <div
                    className="h-2 rounded-full bg-brand"
                    style={{ width: `${(t.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Overdue books">
          {d.overdue.length === 0 ? (
            <EmptyState icon="success" title="Nothing overdue" />
          ) : (
            <ul className="grid gap-3">
              {d.overdue.map((l) => (
                <li
                  key={l.id}
                  className="flex items-start justify-between gap-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-navy">
                      {l.bookTitle}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {l.userName} · {l.dueLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status="Overdue" />
                    <p className="mt-1 text-xs font-semibold text-danger-dark">
                      {peso(l.fineNow)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent activity" className="lg:col-span-2 xl:col-span-1">
          <Activity events={d.events} />
        </Card>
      </div>
    </>
  );
}
