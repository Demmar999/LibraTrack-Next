/* Small formatting helpers. Safe to use in both server and browser code. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const peso = (n: number): string => "₱" + (Math.round((n || 0) * 100) / 100).toLocaleString("en-US");

/** "2026-10-20" -> "Oct 20, 2026" */
export function formatDate(s: string | null | undefined): string {
  if (!s) return "—";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

export const initials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();

const AVATAR_COLORS = ["#2b5fc1", "#12b76a", "#8b5cf6", "#f97316", "#0ea5a4", "#d946ef"];
export function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Join class names, skipping empty values. */
export const cn = (...parts: (string | false | null | undefined)[]): string => parts.filter(Boolean).join(" ");

export const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
