import { mutate } from "@/lib/db";
import { saveSettings } from "@/lib/service";
import { json, readJson, requireUser, route } from "@/lib/http";

export const PUT = route(async (req) => {
  const body = await readJson(req);
  const settings = await mutate((db) => {
    requireUser(db, req, "admin");
    return saveSettings(db, body);
  });
  return json({ settings });
});
