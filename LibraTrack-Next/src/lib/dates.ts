/* Date helpers. All dates are plain "YYYY-MM-DD" text, so there are no time zone surprises. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const timeZone = () => process.env.APP_TIMEZONE || "Asia/Manila";

let override: string | null = null;
/** For tests only: pretend today is this date. */
export function setToday(date: string | null): void {
  override = date;
}

function parts(): Record<string, string> {
  const out: Record<string, string> = {};
  new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date())
    .forEach((p) => {
      out[p.type] = p.value;
    });
  return out;
}

export function today(): string {
  if (override) return override;
  const p = parts();
  return `${p.year}-${p.month}-${p.day}`;
}

export function nowStamp(): string {
  const p = parts();
  return `${override ?? `${p.year}-${p.month}-${p.day}`}T${p.hour}:${p.minute}:${p.second}`;
}

const toUtc = (s: string): number => {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export const addDays = (s: string, n: number): string => new Date(toUtc(s) + n * 86400000).toISOString().slice(0, 10);

/** Number of days from a to b (b - a). */
export const diffDays = (a: string, b: string): number => Math.round((toUtc(b) - toUtc(a)) / 86400000);

/** The last n months (including this one) as keys "2026-10" and labels "Oct". */
export function monthWindow(n: number): { keys: string[]; labels: string[] } {
  const [y, m] = today().split("-").map(Number);
  const keys: string[] = [];
  const labels: string[] = [];
  for (let k = n - 1; k >= 0; k--) {
    const d = new Date(Date.UTC(y, m - 1 - k, 1));
    keys.push(d.toISOString().slice(0, 7));
    labels.push(MONTHS[d.getUTCMonth()]);
  }
  return { keys, labels };
}
