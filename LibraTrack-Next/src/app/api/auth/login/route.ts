import { query } from "@/lib/db";
import { verifyLogin } from "@/lib/service";
import { signSession, sessionCookie } from "@/lib/auth";
import { HOME } from "@/lib/nav";
import { isHttps, json, readJson, route, str } from "@/lib/http";

export const POST = route(async (req) => {
  const body = await readJson(req);
  const user = await query((db) =>
    verifyLogin(db, str(body.email), String(body.password ?? "")),
  );
  return json({ user, redirect: HOME[user.role] }, 200, {
    "set-cookie": sessionCookie(signSession(user.id), isHttps(req)),
  });
});
