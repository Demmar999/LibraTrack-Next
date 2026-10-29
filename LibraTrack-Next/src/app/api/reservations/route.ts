import { mutate } from "@/lib/db";
import { reserve } from "@/lib/service";
import { json, readJson, requireUser, route, str } from "@/lib/http";

export const POST = route(async (req) => {
  const body = await readJson(req);
  await mutate((db) => {
    const user = requireUser(db, req);
    reserve(
      db,
      user.role === "admin" && str(body.userId) ? str(body.userId) : user.id,
      str(body.bookId),
    );
  });
  return json({ ok: true }, 201);
});
