"use client";
import { useState } from "react";
import type { Settings } from "@/lib/types";
import { api } from "@/lib/client-api";
import { Button, Card, Field, inputClass } from "./ui";
import { useRun } from "./use-run";

const FIELDS: { key: keyof Settings; label: string; hint: string; min: number }[] = [
  { key: "loanDays", label: "Loan period (days)", hint: "How long a book can be borrowed.", min: 1 },
  { key: "finePerDay", label: "Fine per overdue day (PHP)", hint: "Charged for each day a book is late.", min: 0 },
  { key: "renewDays", label: "Renewal period (days)", hint: "Days added each time a loan is renewed.", min: 1 },
  { key: "maxRenewals", label: "Maximum renewals", hint: "How many times one loan can be renewed.", min: 0 },
  { key: "maxLoans", label: "Maximum books per member", hint: "Books a member can hold at the same time.", min: 1 },
];

export function SettingsPanel({ settings }: { settings: Settings }) {
  const [busy, setBusy] = useState(false);
  const { run } = useRun();
  const [resetting, setResetting] = useState(false);
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card title="Library rules" className="lg:col-span-2">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await run(() => api("/api/settings", "PUT", Object.fromEntries(new FormData(e.currentTarget).entries())), "Settings saved");
          setBusy(false);
        }}>
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>{(id) => <input id={id} name={f.key} type="number" min={f.min} required defaultValue={settings[f.key]} className={inputClass} />}</Field>
          ))}
          <div className="sm:col-span-2"><Button type="submit" disabled={busy}>Save settings</Button></div>
        </form>
      </Card>
      <Card title="Demo data">
        <p className="mb-4 text-sm text-muted">Put the sample books, members and loans back to how they were at the start. Accounts you created will be removed.</p>
        <Button variant="danger" icon="return" disabled={resetting} onClick={async () => {
          if (!confirm("Reset all demo data? This cannot be undone.")) return;
          setResetting(true);
          await run(() => api("/api/demo/reset", "POST"), "Demo data restored");
          setResetting(false);
        }}>Reset demo data</Button>
      </Card>
    </div>
  );
}
