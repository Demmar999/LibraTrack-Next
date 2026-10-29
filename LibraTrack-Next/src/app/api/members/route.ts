import { mutate, query } from "@/lib/db";
import { createMember, members } from "@/lib/service";
import { json, readJson, requireUser, route } from "@/lib/http";

export const GET = route(async (req) =>
  json(
    await query((db) => {
      requireUser(db, req, "admin");
      return { members: members(db) };
    }),
  ),
);

export const POST = route(async (req) => {
  const body = await readJson(req);
  const member = await mutate((db) => {
    requireUser(db, req, "admin");
    return createMember(db, body);
  });
  return json({ member }, 201);
});
