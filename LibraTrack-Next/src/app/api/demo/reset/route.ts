import { query, resetDb } from "@/lib/db";
import { json, requireUser, route } from "@/lib/http";

/** Puts the demo data back to the start (admin only). Remove this file in a real deployment. */
export const POST = route(async (req) => {
  await query((db) => requireUser(db, req, "admin"));
  await resetDb();
  return json({ ok: true });
});
