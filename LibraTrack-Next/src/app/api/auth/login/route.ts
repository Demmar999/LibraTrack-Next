import { query } from "@/lib/db";
import { verifyLogin } from "@/lib/service";
import { signSession, sessionCookie } from "@/lib/auth";
import { HOME } from "@/lib/nav";

function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has("content-type")) {
    responseHeaders.set("content-type", "application/json; charset=utf-8");
  }
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function isHttps(req: Request): boolean {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  return forwardedProto === "https" || new URL(req.url).protocol === "https:";
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = await req.json();

    const user = await query((db) =>
      verifyLogin(db, String(body.email ?? ""), String(body.password ?? "")),
    );

    return json({ user, redirect: HOME[user.role] }, 200, {
      "set-cookie": sessionCookie(signSession(user.id), isHttps(req)),
    });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      500,
    );
  }
}
