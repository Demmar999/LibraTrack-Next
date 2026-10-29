import { clearCookie } from "@/lib/auth";
import { isHttps, json, route } from "@/lib/http";

export const POST = route((req) => json({ ok: true }, 200, { "set-cookie": clearCookie(isHttps(req)) }));
