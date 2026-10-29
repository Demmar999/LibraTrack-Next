/* Login checks for pages (server components). API routes use http.ts instead. */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_NAME, readSession } from "./auth";
import { query } from "./db";
import { safeUser } from "./service";
import { HOME } from "./nav";
import type { Role, SafeUser } from "./types";

export async function getCurrentUser(): Promise<SafeUser | null> {
  const store = await cookies();
  const id = readSession(store.get(COOKIE_NAME)?.value);
  if (!id) return null;
  return query((db) => {
    const u = db.users.find((x) => x.id === id);
    return u && u.status === "active" ? safeUser(u) : null;
  });
}

/** Use at the top of a page: sends visitors to the login page, or to their own area if the role is wrong. */
export async function requireRole(role: Role): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(HOME[user.role]);
  return user;
}
