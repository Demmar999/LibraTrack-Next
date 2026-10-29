"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { BookInfo } from "@/lib/types";
import { api } from "@/lib/client-api";
import {
  Button,
  Card,
  ConfirmModal,
  DataTable,
  EmptyState,
  Field,
  FormModal,
  StatusBadge,
  inputClass,
} from "./ui";
import { useRun } from "./use-run";

const TYPES = ["Book", "E-Book", "Journal", "Magazine", "Thesis"];
const DISPLAY_LIMIT = 5;

export function ResourcesManager({
  books,
  categories,
}: {
  books: BookInfo[];
  categories: string[];
}) {
  const sp = useSearchParams();

  const [q, setQ] = useState(sp.get("q") ?? "");
  const [cat, setCat] = useState("All");
  const [status, setStatus] = useState("All");
  const [showAll, setShowAll] = useState(false);
  const [edit, setEdit] = useState<BookInfo | "new" | null>(null);
  const [del, setDel] = useState<BookInfo | null>(null);

  const { run, done } = useRun();

  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();

    return [...books]
      .sort((a, b) => {
        const aId = Number(a.id);
        const bId = Number(b.id);

        if (Number.isFinite(aId) && Number.isFinite(bId)) {
          return bId - aId;
        }

        return 0;
      })
      .filter(
        (b) =>
          (cat === "All" || b.category === cat) &&
          (status === "All" || b.status === status) &&
          (!n ||
            [b.title, b.author, b.accession, b.category].some((x) =>
              String(x ?? "")
                .toLowerCase()
                .includes(n),
            )),
      );
  }, [books, q, cat, status]);

  const visibleRows = showAll ? rows : rows.slice(0, DISPLAY_LIMIT);
  const cur = edit && edit !== "new" ? edit : null;

  return (
    <Card
      title={`Library resources (${rows.length})`}
      action={
        <Button icon="add" onClick={() => setEdit("new")}>
          Add resource
        </Button>
      }
    >
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setShowAll(false);
          }}
          placeholder="Search title, author, accession..."
          aria-label="Search resources"
          className={inputClass}
        />

        <select
          value={cat}
          onChange={(e) => {
            setCat(e.target.value);
            setShowAll(false);
          }}
          aria-label="Category"
          className={inputClass}
        >
          <option>All</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setShowAll(false);
          }}
          aria-label="Status"
          className={inputClass}
        >
          {["All", "Available", "Reserved", "Borrowed"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <DataTable
        rows={visibleRows}
        rowKey={(b) => b.id}
        empty={
          <EmptyState
            icon="search"
            title="No resources found"
            text="Try a different search or filter."
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
                  {b.author} · {b.accession}
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
            header: "Copies",
            cell: (b) => `${b.available} / ${b.copies}`,
          },
          {
            header: "Status",
            cell: (b) => <StatusBadge status={b.status} />,
          },
          {
            header: "Actions",
            className: "text-right",
            cell: (b) => (
              <div className="flex justify-end gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  icon="edit"
                  onClick={() => setEdit(b)}
                >
                  Edit
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  icon="delete"
                  onClick={() => setDel(b)}
                  aria-label={`Delete ${b.title}`}
                >
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />

      {rows.length > DISPLAY_LIMIT && (
        <div className="mt-4 flex justify-center">
          <Button variant="soft" onClick={() => setShowAll((prev) => !prev)}>
            {showAll
              ? "Show Less"
              : `Show More (${rows.length - DISPLAY_LIMIT} more)`}
          </Button>
        </div>
      )}

      {edit && (
        <FormModal
          title={cur ? "Edit resource" : "Add resource"}
          onClose={() => setEdit(null)}
          submitLabel={cur ? "Save changes" : "Add resource"}
          onSubmit={async (f) => {
            const body = Object.fromEntries(f.entries());

            await (cur
              ? api(`/api/books/${cur.id}`, "PUT", body)
              : api("/api/books", "POST", body));

            done(cur ? "Resource updated" : "Resource added");
            setEdit(null);
            setShowAll(false);
          }}
        >
          <Field label="Title">
            {(id) => (
              <input
                id={id}
                name="title"
                required
                defaultValue={cur?.title}
                className={inputClass}
              />
            )}
          </Field>

          <Field label="Author">
            {(id) => (
              <input
                id={id}
                name="author"
                required
                defaultValue={cur?.author}
                className={inputClass}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              {(id) => (
                <input
                  id={id}
                  name="category"
                  required
                  list="cats"
                  defaultValue={cur?.category}
                  className={inputClass}
                />
              )}
            </Field>

            <Field label="Type">
              {(id) => (
                <select
                  id={id}
                  name="type"
                  defaultValue={cur?.type ?? "Book"}
                  className={inputClass}
                >
                  {TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              )}
            </Field>

            <Field label="Year">
              {(id) => (
                <input
                  id={id}
                  name="year"
                  type="number"
                  min={1000}
                  max={2100}
                  defaultValue={cur?.year ?? ""}
                  className={inputClass}
                />
              )}
            </Field>

            <Field label="Copies">
              {(id) => (
                <input
                  id={id}
                  name="copies"
                  type="number"
                  min={1}
                  required
                  defaultValue={cur?.copies ?? 1}
                  className={inputClass}
                />
              )}
            </Field>
          </div>

          <datalist id="cats">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </FormModal>
      )}

      {del && (
        <ConfirmModal
          danger
          title="Delete resource"
          confirmLabel="Delete"
          message={`Remove "${del.title}" from the library? Borrowing history is kept.`}
          onClose={() => setDel(null)}
          onConfirm={async () => {
            await run(
              () => api(`/api/books/${del.id}`, "DELETE"),
              "Resource deleted",
            );
            setDel(null);
          }}
        />
      )}
    </Card>
  );
}
