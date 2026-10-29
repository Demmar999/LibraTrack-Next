"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { NAV, type NavLink } from "@/lib/nav";
import type { Role, SafeUser } from "@/lib/types";
import { cn } from "@/lib/format";
import { api } from "@/lib/client-api";
import { Icon } from "./icons";
import { Avatar } from "./ui";

export function AppShell({ user, role, children }: { user: SafeUser; role: Role; children: React.ReactNode }) {
  const nav = NAV[role];
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const all = [...nav.items.filter((i): i is NavLink => i.kind === "link"), nav.bottom];
  const current = all.find((l) => path === l.href || path.startsWith(l.href + "/"));
  const showSearch = !!current?.search;

  const item = (l: NavLink) => {
    const active = current?.href === l.href;
    return (
      <Link key={l.href} href={l.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
        className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}>
        <Icon name={l.icon} />
        {l.label}
      </Link>
    );
  };

  async function logout() {
    await api("/api/auth/logout", "POST").catch(() => {});
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen lg:pl-64">
      {open && <div className="fixed inset-0 z-30 bg-navy/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-navy p-4 text-white transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="mb-6 flex items-center gap-2.5 px-2 pt-1">
          <span className="grid size-9 place-items-center rounded-xl bg-brand"><Icon name="logo" size={20} /></span>
          <div>
            <p className="text-lg font-extrabold leading-none">LibraTrack</p>
            <p className="mt-1 text-[11px] text-white/60">{nav.roleLabel}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {nav.items.map((e) => e.kind === "label"
            ? <p key={e.label} className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{e.label}</p>
            : item(e))}
        </nav>
        <div className="grid gap-1 border-t border-white/10 pt-3">
          {item(nav.bottom)}
          <button onClick={logout} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white">
            <Icon name="logout" /> Log out
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-page/90 px-4 py-3 backdrop-blur sm:px-6">
        <button className="rounded-lg p-2 text-navy hover:bg-white lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
        <h1 className="text-lg font-extrabold text-navy sm:text-xl">{current?.label ?? "LibraTrack"}</h1>
        {showSearch && (
          <form className="relative ml-auto hidden w-full max-w-xs sm:block" onSubmit={(e) => {
            e.preventDefault();
            const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
            router.push(`${nav.searchPath}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
          }}>
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input name="q" type="search" placeholder="Search books..." aria-label="Search books" className="w-full rounded-full border border-line bg-white py-2 pl-9 pr-4 text-sm focus:border-ocean focus:outline-none" />
          </form>
        )}
        <div className={cn("flex items-center gap-2.5", showSearch ? "" : "ml-auto")}>
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-sm font-semibold text-navy">{user.name}</p>
            <p className="text-xs capitalize text-muted">{user.role}</p>
          </div>
          <Avatar name={user.name} />
        </div>
      </header>
      <main className="mx-auto grid max-w-7xl gap-5 p-4 sm:p-6">{children}</main>
    </div>
  );
}
