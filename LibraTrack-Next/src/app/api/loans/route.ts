import { mutate } from "@/lib/db";
import { borrow } from "@/lib/service";
import { json, readJson, requireUser, route, str } from "@/lib/http";

/** Admin can borrow for any member; a member can only borrow for themselves. */
export const POST = route(async (req) => {
  const body = await readJson(req);
  const loan = await mutate((db) => {
    const user = requireUser(db, req);
    const userId = user.role === "admin" ? str(body.userId) : user.id;
    return borrow(
      db,
      userId,
      str(body.bookId),
      user.role === "admin" ? str(body.dueOn) || undefined : undefined,
    );
  });
  return json({ loan }, 201);
});
