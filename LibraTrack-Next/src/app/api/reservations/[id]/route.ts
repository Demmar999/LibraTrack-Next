import { mutate } from "@/lib/db";
import { cancelReservation, issueReservation } from "@/lib/service";
import { json, readJson, requireUser, route, str } from "@/lib/http";
import { AppError } from "@/lib/errors";

/** PATCH { action: "cancel" | "issue" } */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const action = str((await readJson(req)).action);
  await mutate((db) => {
    const user = requireUser(db, req);
    if (action === "cancel")
      return cancelReservation(
        db,
        id,
        user.role === "admin" ? undefined : user.id,
      );
    requireUser(db, req, "admin");
    if (action === "issue") return issueReservation(db, id);
    throw new AppError("Unknown action.");
  });
  return json({ ok: true });
});
