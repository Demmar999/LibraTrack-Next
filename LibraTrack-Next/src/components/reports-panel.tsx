"use client";
import { useEffect, useState } from "react";
import type { ReportData, ReportType } from "@/lib/types";
import { api } from "@/lib/client-api";
import { Button, Card, DataTable, EmptyState, Field, inputClass } from "./ui";

const TYPES: { key: ReportType; label: string }[] = [
  { key: "inventory", label: "Book inventory" },
  { key: "circulation", label: "Circulation" },
  { key: "overdue", label: "Overdue and fines" },
];

export function ReportsPanel({ categories }: { categories: string[] }) {
  const [type, setType] = useState<ReportType>("inventory");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [cat, setCat] = useState("All");
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState("");

  const qs = (extra = "") => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (cat !== "All") p.set("cat", cat);
    return `?${p.toString()}${extra}`.replace("?&", "?");
  };

  useEffect(() => {
    let live = true;
    api<{ report: ReportData }>(`/api/reports/${type}${qs()}`, "GET")
      .then((r) => {
        if (live) {
          setReport(r.report);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (live)
          setError(
            e instanceof Error ? e.message : "Could not load the report.",
          );
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, from, to, cat]);

  const money = report?.money ?? [];
  return (
    <div className="grid gap-5">
      <Card title="Report options">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Report">
            {(id) => (
              <select
                id={id}
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                className={inputClass}
              >
                {TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="From">
            {(id) => (
              <input
                id={id}
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="To">
            {(id) => (
              <input
                id={id}
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
          <Field label="Category">
            {(id) => (
              <select
                id={id}
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className={inputClass}
              >
                <option>All</option>
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`/api/reports/${type}${qs("&format=pdf")}`}>
            <Button type="button" icon="pdf" variant="navy">
              Download PDF
            </Button>
          </a>
          <a href={`/api/reports/${type}${qs("&format=xlsx")}`}>
            <Button type="button" icon="excel">
              Download Excel
            </Button>
          </a>
        </div>
      </Card>
      <Card title={report?.title ?? "Report"}>
        {error && (
          <p role="alert" className="text-sm font-medium text-danger-dark">
            {error}
          </p>
        )}
        {report && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {report.summary.map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-full bg-panel px-3 py-1 text-xs ring-1 ring-line"
                >
                  <span className="text-muted">{k}: </span>
                  <b className="text-navy">{v}</b>
                </span>
              ))}
            </div>
            <DataTable
              rows={report.rows.map((r, i) => ({ r, i }))}
              rowKey={(x) => String(x.i)}
              empty={
                <EmptyState
                  icon="reports"
                  title="No records for these filters"
                />
              }
              columns={report.columns.map((h, i) => ({
                header: h,
                primary: i === 0,
                cell: (x: { r: (string | number)[] }) =>
                  money.includes(i)
                    ? Number(x.r[i]).toFixed(2)
                    : String(x.r[i] ?? ""),
              }))}
            />
          </>
        )}
      </Card>
    </div>
  );
}
