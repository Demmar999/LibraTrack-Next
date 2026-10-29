"use client";
import type { LoanView, ReservationView } from "@/lib/types";
import { api } from "@/lib/client-api";
import { formatDate, peso } from "@/lib/format";
import { Button, Card, DataTable, EmptyState, StatusBadge } from "./ui";
import { useRun } from "./use-run";

export function MemberBorrowings({
  current,
  history,
  reservations,
  maxRenewals,
}: {
  current: LoanView[];
  history: LoanView[];
  reservations: ReservationView[];
  maxRenewals: number;
}) {
  const { run } = useRun();
  return (
    <>
      <Card title={`Currently borrowed (${current.length})`}>
        <DataTable
          rows={current}
          rowKey={(l) => l.id}
          empty={
            <EmptyState
              icon="borrowed"
              title="No books borrowed"
              text="Go to Search Books to borrow one."
            />
          }
          columns={[
            {
              header: "Book",
              primary: true,
              cell: (l) => (
                <div>
                  <p className="font-semibold text-navy">{l.bookTitle}</p>
                  <p className="text-xs font-normal text-muted">{l.category}</p>
                </div>
              ),
            },
            { header: "Borrowed", cell: (l) => formatDate(l.borrowedOn) },
            {
              header: "Due",
              cell: (l) => (
                <div>
                  <p>{formatDate(l.dueOn)}</p>
                  <p className="text-xs text-muted">{l.dueLabel}</p>
                </div>
              ),
            },
            {
              header: "Renewals",
              cell: (l) => `${l.renewals} / ${maxRenewals}`,
            },
            {
              header: "Status",
              cell: (l) => <StatusBadge status={l.status} />,
            },
            {
              header: "Fine",
              cell: (l) =>
                l.fineNow > 0 ? (
                  <span className="font-semibold text-danger-dark">
                    {peso(l.fineNow)}
                  </span>
                ) : (
                  "—"
                ),
            },
            {
              header: "Action",
              className: "text-right",
              cell: (l) => (
                <Button
                  size="sm"
                  variant="ghost"
                  icon="renew"
                  disabled={l.status === "Overdue" || l.renewals >= maxRenewals}
                  onClick={() =>
                    run(
                      () =>
                        api(`/api/loans/${l.id}`, "PATCH", { action: "renew" }),
                      "Loan renewed",
                    )
                  }
                >
                  Renew
                </Button>
              ),
            },
          ]}
        />
        {current.some((l) => l.status === "Overdue") && (
          <p className="mt-3 text-sm text-danger-dark">
            Overdue books cannot be renewed. Please return them to the library
            and settle the fine.
          </p>
        )}
      </Card>

      <Card
        title={`My reservations (${reservations.filter((r) => r.status === "active").length})`}
      >
        <DataTable
          rows={reservations}
          rowKey={(r) => r.id}
          empty={<EmptyState icon="reserve" title="No reservations" />}
          columns={[
            { header: "Book", primary: true, cell: (r) => r.bookTitle },
            { header: "Reserved on", cell: (r) => formatDate(r.createdOn) },
            {
              header: "Copies free",
              cell: (r) =>
                r.available > 0 ? (
                  <span className="font-semibold text-brand-dark">
                    {r.available} — ask the librarian
                  </span>
                ) : (
                  "None yet"
                ),
            },
            {
              header: "Status",
              cell: (r) => <StatusBadge status={r.status} />,
            },
            {
              header: "Action",
              className: "text-right",
              cell: (r) =>
                r.status === "active" ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="close"
                    onClick={() =>
                      run(
                        () =>
                          api(`/api/reservations/${r.id}`, "PATCH", {
                            action: "cancel",
                          }),
                        "Reservation cancelled",
                      )
                    }
                  >
                    Cancel
                  </Button>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </Card>

      <Card title="Borrowing history">
        <DataTable
          rows={history}
          rowKey={(l) => l.id}
          empty={<EmptyState icon="clock" title="No history yet" />}
          columns={[
            { header: "Book", primary: true, cell: (l) => l.bookTitle },
            { header: "Borrowed", cell: (l) => formatDate(l.borrowedOn) },
            { header: "Returned", cell: (l) => formatDate(l.returnedOn) },
            {
              header: "Fine",
              cell: (l) =>
                l.fine > 0 ? (
                  <span className="font-semibold text-danger-dark">
                    {peso(l.fine)}
                  </span>
                ) : (
                  "—"
                ),
            },
            {
              header: "Fine status",
              cell: (l) =>
                l.fine > 0 ? (
                  <StatusBadge status={l.finePaid ? "Paid" : "Unpaid"} />
                ) : (
                  "—"
                ),
            },
          ]}
        />
      </Card>
    </>
  );
}
