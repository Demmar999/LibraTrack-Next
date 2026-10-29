import { mutate } from "@/lib/db";
import { setUserStatus } from "@/lib/service";
import { json, readJson, requireUser, route, str } from "@/lib/http";
import { AppError } from "@/lib/errors";

/** PATCH { status: "active" | "inactive" } */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const status = str((await readJson(req)).status);
  if (status !== "active" && status !== "inactive")
    throw new AppError("Invalid status.");
  await mutate((db) => {
    requireUser(db, req, "admin");
    setUserStatus(db, id, status);
  });
  return json({ ok: true });
});
