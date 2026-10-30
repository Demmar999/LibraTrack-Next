/* Helpers shared by the API route files (src/app/api/**). They use the standard Request / Response objects. */

import { AppError } from "./errors";
import { readSession, tokenFromRequest } from "./auth";
import type { Db, Role, SafeUser } from "./types";
import { safeUser } from "./service";

export const str = (v: unknown): string =>
  (v === undefined || v === null ? "" : String(v)).trim();

export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** Sends a file (PDF / Excel) to be downloaded. */
export function file(
  bytes: Uint8Array,
  mime: string,
  filename: string,
): Response {
  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "content-type": mime,
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

const DB_DOWN = [
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "28P01",
  "28000",
  "3D000",
  "57P03",
];

export function errorResponse(e: unknown): Response {
  if (e instanceof AppError) return json({ error: e.message }, e.status);

  const code =
    typeof e === "object" && e !== null && "code" in e
      ? String((e as { code: unknown }).code)
      : "";

  if (code === "23505") {
    return json({ error: "That email is already registered." }, 409);
  }

  if (
    DB_DOWN.includes(code) ||
    (e instanceof Error && e.message.includes("DATABASE_URL"))
  ) {
    console.error(e);
    return json(
      {
        error:
          "Cannot connect to the database. Check DATABASE_URL in .env.local and that PostgreSQL is running.",
      },
      503,
    );
  }

  console.error(e);
  return json({ error: "Something went wrong. Please try again." }, 500);
}

/**
 * Wraps a route so that thrown AppErrors become clean JSON errors.
 * Supports both regular API routes and dynamic API routes.
 */
export function route<P extends Record<string, string> = Record<string, never>>(
  fn: (req: Request, params: P) => Promise<Response> | Response,
) {
  return async (
    req: Request,
    ctx: { params: Promise<P> } = {
      params: Promise.resolve({} as P),
    },
  ): Promise<Response> => {
    try {
      const params = await ctx.params;
      return await fn(req, params);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await req.json();

    return typeof body === "object" && body !== null
      ? (body as Record<string, unknown>)
      : {};
  } catch {
    throw new AppError("Invalid request.");
  }
}

export function isHttps(req: Request): boolean {
  return (
    req.headers.get("x-forwarded-proto") === "https" ||
    new URL(req.url).protocol === "https:"
  );
}

/** The logged-in user for this request (or null). */
export function currentUser(db: Db, req: Request): SafeUser | null {
  const id = readSession(tokenFromRequest(req));

  if (!id) return null;

  const u = db.users.find((x) => x.id === id);

  return u && u.status === "active" ? safeUser(u) : null;
}

/** Stops the request unless someone is logged in and has the right role. */
export function requireUser(db: Db, req: Request, role?: Role): SafeUser {
  const user = currentUser(db, req);

  if (!user) throw new AppError("Please log in first.", 401);

  if (role && user.role !== role) {
    throw new AppError("You do not have permission to do this.", 403);
  }

  return user;
}
