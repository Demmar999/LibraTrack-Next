/* Small charts drawn with plain SVG (no chart library needed). */
import type { Trend } from "@/lib/types";

const COLORS = ["#12b76a", "#2b5fc1", "#fdc72f", "#9fd8f2", "#f04438", "#0f2a5c"];

export function Donut({ data }: { data: { name: string; count: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 140 140" className="size-36 shrink-0 -rotate-90" role="img" aria-label="Books by category">
        <circle cx="70" cy="70" r={R} fill="none" stroke="#e6edf5" strokeWidth="18" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.count / total) * C;
            const el = <circle key={d.name} cx="70" cy="70" r={R} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="18" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        <text x="70" y="70" textAnchor="middle" dominantBaseline="central" className="rotate-90 fill-[#0f2a5c] text-[22px] font-extrabold" transform="rotate(90 70 70)">{total}</text>
      </svg>
      <ul className="grid min-w-32 flex-1 gap-1.5 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2">
            <span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="flex-1 truncate">{d.name}</span>
            <span className="font-semibold text-navy">{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LineChart({ trend }: { trend: Trend }) {
  const W = 520, H = 220, L = 30, B = 26, T = 12, Rr = 10;
  const max = Math.max(4, ...trend.borrowed, ...trend.overdue);
  const top = Math.ceil(max / 4) * 4;
  const x = (i: number) => L + (i * (W - L - Rr)) / Math.max(1, trend.labels.length - 1);
  const y = (v: number) => T + (1 - v / top) * (H - T - B);
  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const series = [
    { name: "Borrowed", vals: trend.borrowed, color: "#12b76a" },
    { name: "Overdue", vals: trend.overdue, color: "#f04438" },
  ];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Borrowed and overdue books per month">
        {[0, 1, 2, 3, 4].map((g) => {
          const v = (top / 4) * g;
          return (
            <g key={g}>
              <line x1={L} x2={W - Rr} y1={y(v)} y2={y(v)} stroke="#e6edf5" />
              <text x={L - 6} y={y(v)} textAnchor="end" dominantBaseline="central" className="fill-[#66728f] text-[10px]">{v}</text>
            </g>
          );
        })}
        {trend.labels.map((l, i) => <text key={l} x={x(i)} y={H - 8} textAnchor="middle" className="fill-[#66728f] text-[10px]">{l}</text>)}
        {series.map((s) => (
          <g key={s.name}>
            <path d={path(s.vals)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
            {s.vals.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill="#fff" stroke={s.color} strokeWidth="2" />)}
          </g>
        ))}
      </svg>
      <div className="mt-1 flex gap-4 text-xs text-muted">
        {series.map((s) => <span key={s.name} className="flex items-center gap-1.5"><span className="h-1 w-4 rounded" style={{ background: s.color }} />{s.name}</span>)}
      </div>
    </div>
  );
}
