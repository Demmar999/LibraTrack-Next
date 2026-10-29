import { mutate } from "@/lib/db";
import { updateProfile } from "@/lib/service";
import { json, readJson, requireUser, route } from "@/lib/http";

export const PATCH = route(async (req) => {
  const body = await readJson(req);
  const user = await mutate((db) =>
    updateProfile(db, requireUser(db, req).id, body),
  );
  return json({ user });
});
