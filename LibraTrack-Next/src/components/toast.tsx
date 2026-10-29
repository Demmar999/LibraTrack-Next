"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { Icon } from "./icons";

type Kind = "success" | "error";
interface Item { id: number; kind: Kind; text: string }
const Ctx = createContext<(text: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const show = useCallback((text: string, kind: Kind = "success") => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, kind, text }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 z-[60] flex flex-col items-end gap-2 sm:left-auto" role="status" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`pop flex max-w-sm items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${i.kind === "success" ? "bg-navy" : "bg-danger-dark"}`}>
            <Icon name={i.kind === "success" ? "success" : "warning"} size={16} />
            {i.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
