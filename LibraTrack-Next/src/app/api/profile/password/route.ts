import { mutate } from "@/lib/db";
import { changePassword } from "@/lib/service";
import { json, readJson, requireUser, route } from "@/lib/http";

export const POST = route(async (req) => {
  const b = await readJson(req);
  await mutate((db) =>
    changePassword(
      db,
      requireUser(db, req).id,
      String(b.current ?? ""),
      String(b.next ?? ""),
      String(b.confirm ?? ""),
    ),
  );
  return json({ ok: true });
});
