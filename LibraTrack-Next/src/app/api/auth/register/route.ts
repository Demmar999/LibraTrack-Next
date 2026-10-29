import { mutate } from "@/lib/db";
import { createMember } from "@/lib/service";
import { json, readJson, route } from "@/lib/http";
import { AppError } from "@/lib/errors";

/** Creates the member account in PostgreSQL. It does NOT log the person in: they go to the login page next. */
export const POST = route(async (req) => {
  const body = await readJson(req);
  if (String(body.password ?? "") !== String(body.confirm ?? ""))
    throw new AppError("Passwords do not match.");
  const user = await mutate((db) => createMember(db, body));
  return json({ user: { name: user.name, email: user.email } }, 201);
});
