"use client";

import { useMemo, useState } from "react";
import type {
  BookInfo,
  LoanView,
  MemberView,
  ReservationView,
} from "@/lib/types";
import { api } from "@/lib/client-api";
import { formatDate, peso } from "@/lib/format";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
  FormModal,
  StatusBadge,
  inputClass,
} from "./ui";
import { useRun } from "./use-run";

type Tab = "loans" | "reservations";

const FILTERS = [
  "All",
  "Borrowed",
  "Due soon",
  "Overdue",
  "Returned",
  "Unpaid fines",
] as const;

const DISPLAY_LIMIT = 5;

export function BorrowingManager({
  loans,
  reservations,
  members,
  books,
  loanDays,
  today,
}: {
  loans: LoanView[];
  reservations: ReservationView[];
  members: MemberView[];
  books: BookInfo[];
  loanDays: number;
  today: string;
}) {
  const [tab, setTab] = useState<Tab>("loans");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { run, done } = useRun();

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();

    return loans.filter(
      (l) =>
        (filter === "All" ||
          (filter === "Unpaid fines" ? l.unpaid > 0 : l.status === filter)) &&
        (!n ||
          [l.userName, l.bookTitle, l.id].some((x) =>
            x.toLowerCase().includes(n),
          )),
    );
  }, [loans, filter, q]);

  const visibleRows = showAll ? rows : rows.slice(0, DISPLAY_LIMIT);

  const active = reservations.filter((r) => r.status === "active");

  const patch = (url: string, action: string, ok: string) =>
    run(() => api(url, "PATCH", { action }), ok);

  return (
    <Card
      title="Borrowing and returns"
      action={
        <Button icon="add" onClick={() => setModal(true)}>
          New borrow
        </Button>
      }
    >
      <div
        className="mb-4 flex gap-1 rounded-xl bg-panel p-1 ring-1 ring-line sm:w-fit"
        role="tablist"
      >
        {(
          [
            ["loans", `Transactions (${loans.length})`],
            ["reservations", `Reservations (${active.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              tab === k
                ? "bg-white text-navy shadow-sm"
                : "text-muted hover:text-navy"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "loans" ? (
        <>
          <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setShowAll(false);
              }}
              placeholder="Search member, book or ID..."
              aria-label="Search transactions"
              className={inputClass}
            />

            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as (typeof FILTERS)[number]);
                setShowAll(false);
              }}
              aria-label="Status filter"
              className={inputClass}
            >
              {FILTERS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </div>

          <DataTable
            rows={visibleRows}
            rowKey={(l) => l.id}
            empty={<EmptyState icon="search" title="No transactions found" />}
            columns={[
              {
                header: "Book",
                primary: true,
                cell: (l) => (
                  <div>
                    <p className="font-semibold text-navy">{l.bookTitle}</p>
                    <p className="text-xs font-normal text-muted">{l.id}</p>
                  </div>
                ),
              },
              {
                header: "Member",
                cell: (l) => l.userName,
              },
              {
                header: "Borrowed",
                cell: (l) => formatDate(l.borrowedOn),
              },
              {
                header: "Due",
                cell: (l) => (
                  <div>
                    <p>{formatDate(l.dueOn)}</p>
                    {!l.returnedOn && (
                      <p className="text-xs text-muted">{l.dueLabel}</p>
                    )}
                  </div>
                ),
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
                      {l.fine > 0 && l.finePaid ? " (paid)" : ""}
                    </span>
                  ) : (
                    "—"
                  ),
              },
              {
                header: "Actions",
                className: "text-right",
                cell: (l) => (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {!l.returnedOn && (
                      <Button
                        size="sm"
                        variant="soft"
                        icon="return"
                        onClick={() =>
                          patch(`/api/loans/${l.id}`, "return", "Book returned")
                        }
                      >
                        Return
                      </Button>
                    )}

                    {!l.returnedOn && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon="renew"
                        onClick={() =>
                          patch(`/api/loans/${l.id}`, "renew", "Loan renewed")
                        }
                      >
                        Renew
                      </Button>
                    )}

                    {l.returnedOn && l.unpaid > 0 && (
                      <Button
                        size="sm"
                        variant="navy"
                        icon="fine"
                        onClick={() =>
                          patch(
                            `/api/loans/${l.id}`,
                            "pay",
                            "Fine recorded as paid",
                          )
                        }
                      >
                        Mark paid
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />

          {rows.length > DISPLAY_LIMIT && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="soft"
                onClick={() => setShowAll((prev) => !prev)}
              >
                {showAll
                  ? "Show Less"
                  : `Show More (${rows.length - DISPLAY_LIMIT} more)`}
              </Button>
            </div>
          )}
        </>
      ) : (
        <DataTable
          rows={reservations}
          rowKey={(r) => r.id}
          empty={<EmptyState icon="reserve" title="No reservations" />}
          columns={[
            {
              header: "Book",
              primary: true,
              cell: (r) => r.bookTitle,
            },
            {
              header: "Member",
              cell: (r) => r.userName,
            },
            {
              header: "Reserved on",
              cell: (r) => formatDate(r.createdOn),
            },
            {
              header: "Copies free",
              cell: (r) => `${r.available} / ${r.copies}`,
            },
            {
              header: "Status",
              cell: (r) => <StatusBadge status={r.status} />,
            },
            {
              header: "Actions",
              className: "text-right",
              cell: (r) =>
                r.status !== "active" ? (
                  "—"
                ) : (
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="soft"
                      icon="borrowed"
                      disabled={r.available < 1}
                      onClick={() =>
                        patch(
                          `/api/reservations/${r.id}`,
                          "issue",
                          "Book issued",
                        )
                      }
                    >
                      Issue
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      icon="close"
                      onClick={() =>
                        patch(
                          `/api/reservations/${r.id}`,
                          "cancel",
                          "Reservation cancelled",
                        )
                      }
                    >
                      Cancel
                    </Button>
                  </div>
                ),
            },
          ]}
        />
      )}

      {modal && (
        <FormModal
          title="New borrow"
          submitLabel="Issue book"
          onClose={() => setModal(false)}
          onSubmit={async (f) => {
            await api("/api/loans", "POST", {
              userId: f.get("userId"),
              bookId: f.get("bookId"),
              dueOn: f.get("dueOn"),
            });

            done("Book issued");
            setModal(false);
          }}
        >
          <Field label="Member">
            {(id) => (
              <select
                id={id}
                name="userId"
                required
                className={inputClass}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose a member
                </option>

                {members
                  .filter((m) => m.status === "active")
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.activeLoans} borrowed)
                    </option>
                  ))}
              </select>
            )}
          </Field>

          <Field label="Resource">
            {(id) => (
              <select
                id={id}
                name="bookId"
                required
                className={inputClass}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose a book
                </option>

                {books
                  .filter((b) => b.available > 0)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title} — {b.available} free
                    </option>
                  ))}
              </select>
            )}
          </Field>

          <Field
            label="Due date"
            hint={`Leave empty for the default ${loanDays} days.`}
          >
            {(id) => (
              <input
                id={id}
                name="dueOn"
                type="date"
                min={today}
                className={inputClass}
              />
            )}
          </Field>
        </FormModal>
      )}
    </Card>
  );
}
