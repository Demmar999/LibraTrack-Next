"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BookInfo } from "@/lib/types";
import { api } from "@/lib/client-api";
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  StatusBadge,
  inputClass,
} from "./ui";
import { useRun } from "./use-run";

export interface BookMine {
  borrowed: boolean;
  reserved: boolean;
}

interface MemberSearchProps {
  books?: BookInfo[];
  categories?: string[];
  mine?: Record<string, BookMine>;
}

export function MemberSearch({ books, categories, mine }: MemberSearchProps) {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [cat, setCat] = useState("All");
  const [onlyFree, setOnlyFree] = useState(false);
  const { run } = useRun();

  const safeBooks = Array.isArray(books) ? books : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeMine = mine ?? {};

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();

    return safeBooks.filter((b) => {
      if (!b) return false;

      const matchesCategory = cat === "All" || b.category === cat;

      const matchesAvailability = !onlyFree || Number(b.available ?? 0) > 0;

      const matchesSearch =
        !n ||
        [b.title, b.author, b.category, b.type].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(n),
        );

      return matchesCategory && matchesAvailability && matchesSearch;
    });
  }, [safeBooks, q, cat, onlyFree]);

  return (
    <Card title={`Find a book (${rows.length})`}>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, author or category..."
          aria-label="Search books"
          className={inputClass}
        />

        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          aria-label="Category"
          className={inputClass}
        >
          <option value="All">All</option>
          {safeCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm">
          <input
            type="checkbox"
            checked={onlyFree}
            onChange={(e) => setOnlyFree(e.target.checked)}
            className="accent-[#12b76a]"
          />
          Available only
        </label>
      </div>

      {books === undefined || !Array.isArray(books) ? (
        <EmptyState
          icon="search"
          title="Books could not be loaded"
          text="Check the member search page and book data source."
        />
      ) : (
        <DataTable
          rows={rows}
          rowKey={(b) => b.id}
          empty={
            <EmptyState
              icon="search"
              title="No books found"
              text="Try a different search or category."
            />
          }
          columns={[
            {
              header: "Title",
              primary: true,
              cell: (b) => (
                <div>
                  <p className="font-semibold text-navy">{b.title}</p>
                  <p className="text-xs font-normal text-muted">
                    {b.author}
                    {b.year ? ` · ${b.year}` : ""}
                  </p>
                </div>
              ),
            },
            {
              header: "Category",
              cell: (b) => b.category,
            },
            {
              header: "Type",
              cell: (b) => b.type,
            },
            {
              header: "Available",
              cell: (b) => `${b.available ?? 0} of ${b.copies ?? 0}`,
            },
            {
              header: "Status",
              cell: (b) => <StatusBadge status={b.status} />,
            },
            {
              header: "Action",
              className: "text-right",
              cell: (b) => {
                const m = safeMine[b.id];

                if (m?.borrowed) {
                  return (
                    <span className="text-xs font-semibold text-ocean">
                      You have this
                    </span>
                  );
                }

                if (m?.reserved) {
                  return (
                    <span className="text-xs font-semibold text-[#8a6500]">
                      Reserved by you
                    </span>
                  );
                }

                return Number(b.available ?? 0) > 0 ? (
                  <Button
                    size="sm"
                    icon="borrowed"
                    onClick={() =>
                      run(
                        () =>
                          api("/api/loans", "POST", {
                            bookId: b.id,
                          }),
                        "Book borrowed",
                      )
                    }
                  >
                    Borrow
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="reserve"
                    onClick={() =>
                      run(
                        () =>
                          api("/api/reservations", "POST", {
                            bookId: b.id,
                          }),
                        "Book reserved",
                      )
                    }
                  >
                    Reserve
                  </Button>
                );
              },
            },
          ]}
        />
      )}
    </Card>
  );
}
