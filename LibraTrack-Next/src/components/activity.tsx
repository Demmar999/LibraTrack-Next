import type { EventView, EventType } from "@/lib/types";
import { Icon, type IconKey } from "./icons";
import { EmptyState } from "./ui";

const META: Record<EventType, { icon: IconKey; verb: string; color: string }> = {
  borrow: { icon: "borrowed", verb: "borrowed", color: "bg-brand/10 text-brand-dark" },
  return: { icon: "return", verb: "returned", color: "bg-ocean/10 text-ocean" },
  renew: { icon: "renew", verb: "renewed", color: "bg-sun/30 text-[#8a6500]" },
  reserve: { icon: "reserve", verb: "reserved", color: "bg-sky/40 text-ocean" },
  cancel: { icon: "close", verb: "cancelled a reservation for", color: "bg-line text-muted" },
  "fine-paid": { icon: "fine", verb: "paid the fine for", color: "bg-brand/10 text-brand-dark" },
};

export function Activity({ events, showUser = true }: { events: EventView[]; showUser?: boolean }) {
  if (events.length === 0) return <EmptyState title="No activity yet" />;
  return (
    <ul className="grid gap-3">
      {events.map((e) => {
        const m = META[e.type];
        return (
          <li key={e.id} className="flex items-start gap-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-full ${m.color}`}><Icon name={m.icon} size={16} /></span>
            <div className="min-w-0 text-sm">
              <p><b className="text-navy">{showUser ? e.userName : "You"}</b> {m.verb} <b className="text-navy">{e.bookTitle}</b></p>
              <p className="text-xs text-muted">{e.whenLabel}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
