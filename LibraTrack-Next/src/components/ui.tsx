"use client";
import { useEffect, useId, useState } from "react";
import { cn, avatarColor, initials } from "@/lib/format";
import { Icon, type IconKey } from "./icons";

/* ---------- Button ---------- */
const BTN = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  navy: "bg-navy text-white hover:bg-navy-2",
  ghost: "bg-white text-ink border border-line hover:bg-panel",
  danger: "bg-danger text-white hover:bg-danger-dark",
  soft: "bg-brand/10 text-brand-dark hover:bg-brand/20",
} as const;

export function Button({
  variant = "primary", size = "md", icon, className, children, ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof BTN; size?: "sm" | "md"; icon?: IconKey }) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm", BTN[variant], className,
      )}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

/* ---------- Badge ---------- */
const TONES = {
  green: "bg-brand/10 text-brand-dark", red: "bg-danger/10 text-danger-dark", yellow: "bg-sun/25 text-[#8a6500]",
  blue: "bg-ocean/10 text-ocean", gray: "bg-line text-muted",
} as const;
export const Badge = ({ tone = "gray", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) => (
  <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", TONES[tone])}>{children}</span>
);
const STATUS_TONE: Record<string, keyof typeof TONES> = {
  Available: "green", Borrowed: "blue", Reserved: "yellow", "Due soon": "yellow", Overdue: "red", Returned: "gray",
  active: "green", inactive: "gray", Paid: "green", Unpaid: "red", fulfilled: "green", cancelled: "gray",
};
export const StatusBadge = ({ status }: { status: string }) => <Badge tone={STATUS_TONE[status] ?? "gray"}>{status}</Badge>;

/* ---------- Card, StatCard, Avatar, EmptyState ---------- */
export function Card({ title, action, children, className }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl bg-white p-4 shadow-sm ring-1 ring-line sm:p-5", className)}>
      {(title || action) && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="text-base font-bold text-navy">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

const STAT_TONE = { green: "bg-brand/10 text-brand-dark", blue: "bg-ocean/10 text-ocean", red: "bg-danger/10 text-danger-dark", yellow: "bg-sun/30 text-[#8a6500]" } as const;
export function StatCard({ label, value, note, icon, tone = "blue" }: { label: string; value: string | number; note?: string; icon: IconKey; tone?: keyof typeof STAT_TONE }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-line">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", STAT_TONE[tone])}><Icon name={icon} size={22} /></span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted">{label}</p>
        <p className="text-2xl font-extrabold leading-tight text-navy">{value}</p>
        {note && <p className="truncate text-xs text-muted">{note}</p>}
      </div>
    </div>
  );
}

export const Avatar = ({ name, size = 36 }: { name: string; size?: number }) => (
  <span className="grid shrink-0 place-items-center rounded-full font-bold text-white" style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.38 }} aria-hidden="true">
    {initials(name)}
  </span>
);

export const EmptyState = ({ icon = "info", title, text }: { icon?: IconKey; title: string; text?: string }) => (
  <div className="grid place-items-center gap-1 rounded-xl border border-dashed border-line px-4 py-10 text-center">
    <span className="grid size-12 place-items-center rounded-full bg-panel text-muted"><Icon name={icon} size={22} /></span>
    <p className="font-semibold text-navy">{title}</p>
    {text && <p className="max-w-xs text-sm text-muted">{text}</p>}
  </div>
);

/* ---------- Form fields ---------- */
export const inputClass =
  "w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20";

export function Field({ label, children, hint }: { label: string; children: (id: string) => React.ReactNode; hint?: string }) {
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">{label}</label>
      {children(id)}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className="pop flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-lg font-bold text-navy">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-muted hover:bg-panel"><Icon name="close" /></button>
        </header>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

/** A modal with a form. onSubmit may be async; errors it throws are shown inside the form. */
export function FormModal({ title, submitLabel = "Save", onClose, onSubmit, children }: {
  title: string; submitLabel?: string; onClose: () => void; onSubmit: (form: FormData) => Promise<void>; children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <Modal title={title} onClose={onClose}>
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await onSubmit(new FormData(e.currentTarget));
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
            setBusy(false);
          }
        }}
      >
        {children}
        {error && <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger-dark">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? "Saving..." : submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmModal({ title, message, confirmLabel = "Confirm", danger, onClose, onConfirm }: {
  title: string; message: string; confirmLabel?: string; danger?: boolean; onClose: () => void; onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} disabled={busy} onClick={async () => { setBusy(true); await onConfirm(); }}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  );
}

/* ---------- Table that becomes cards on phones ---------- */
export interface Column<T> { header: string; cell: (row: T) => React.ReactNode; className?: string; primary?: boolean }

export function DataTable<T>({ rows, columns, rowKey, empty }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; empty: React.ReactNode }) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              {columns.map((c) => <th key={c.header} className={cn("px-3 py-2.5 font-semibold", c.className)}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} className="border-b border-line/70 last:border-0 hover:bg-panel/70">
                {columns.map((c) => <td key={c.header} className={cn("px-3 py-3 align-middle", c.className)}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} className="grid gap-1.5 rounded-xl border border-line bg-panel/60 p-3">
            {columns.map((c) =>
              c.primary ? (
                <div key={c.header} className="font-semibold text-navy">{c.cell(r)}</div>
              ) : (
                <div key={c.header} className="flex items-start justify-between gap-3 text-sm">
                  <span className="shrink-0 text-muted">{c.header}</span>
                  <span className="text-right">{c.cell(r)}</span>
                </div>
              ),
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
