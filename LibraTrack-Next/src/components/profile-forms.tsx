"use client";
import { useState } from "react";
import type { SafeUser } from "@/lib/types";
import { api } from "@/lib/client-api";
import { Avatar, Button, Card, Field, inputClass } from "./ui";
import { useRun } from "./use-run";

export function ProfileForms({ user }: { user: SafeUser }) {
  const { run } = useRun();
  const [busy, setBusy] = useState("");
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card title="My profile">
        <div className="mb-4 flex items-center gap-3"><Avatar name={user.name} size={52} /><div><p className="font-bold text-navy">{user.name}</p><p className="text-sm capitalize text-muted">{user.role}</p></div></div>
        <form className="grid gap-4" onSubmit={async (e) => {
          e.preventDefault();
          setBusy("profile");
          await run(() => api("/api/profile", "PATCH", Object.fromEntries(new FormData(e.currentTarget).entries())), "Profile updated");
          setBusy("");
        }}>
          <Field label="Full name">{(id) => <input id={id} name="name" required defaultValue={user.name} className={inputClass} />}</Field>
          <Field label="Email">{(id) => <input id={id} name="email" type="email" required defaultValue={user.email} className={inputClass} />}</Field>
          <div><Button type="submit" disabled={busy === "profile"}>Save profile</Button></div>
        </form>
      </Card>
      <Card title="Change password">
        <form className="grid gap-4" onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy("password");
          const ok = await run(() => api("/api/profile/password", "POST", Object.fromEntries(new FormData(form).entries())), "Password changed");
          if (ok) form.reset();
          setBusy("");
        }}>
          <Field label="Current password">{(id) => <input id={id} name="current" type="password" required autoComplete="current-password" className={inputClass} />}</Field>
          <Field label="New password" hint="At least 6 characters.">{(id) => <input id={id} name="next" type="password" required minLength={6} autoComplete="new-password" className={inputClass} />}</Field>
          <Field label="Confirm new password">{(id) => <input id={id} name="confirm" type="password" required autoComplete="new-password" className={inputClass} />}</Field>
          <div><Button type="submit" disabled={busy === "password"}>Change password</Button></div>
        </form>
      </Card>
    </div>
  );
}
