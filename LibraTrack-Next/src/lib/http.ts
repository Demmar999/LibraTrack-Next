async function getCurrentSessionUser() {
  try {
    const mod = (await import("@/lib/session")) as {
      getSessionUser?: () => Promise<unknown | null> | unknown | null;
    };
    return typeof mod.getSessionUser === "function"
      ? await mod.getSessionUser()
      : null;
  } catch {
    return null;
  }
}

/** Error that `route()` turns into a clean JSON response. */
export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** JSON response helper. */
export function json(data: unknown, init?: number | ResponseInit): Response {
  const resolved: ResponseInit =
    typeof init === "number" ? { status: init } : (init ?? {});
  return Response.json(data, resolved);
}

/** Parse a JSON body; throws 400 on missing or invalid JSON. */
export async function readJson<T = Record<string, unknown>>(
  req: Request,
): Promise<T> {
  try {
    const body = await req.json();
    if (body === null || typeof body !== "object") {
      throw new Error("not an object");
    }
    return body as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

/** Validate a string field. Trims, enforces required / max length. */
export function str(
  value: unknown,
  name = "value",
  opts: { required?: boolean; max?: number } = {},
): string {
  const { required = true, max = 1000 } = opts;
  if (value === undefined || value === null || value === "") {
    if (required) throw new HttpError(400, `${name} is required`);
    return "";
  }
  if (typeof value !== "string") {
    throw new HttpError(400, `${name} must be a string`);
  }
  const trimmed = value.trim();
  if (required && !trimmed) throw new HttpError(400, `${name} is required`);
  if (trimmed.length > max) {
    throw new HttpError(400, `${name} must be at most ${max} characters`);
  }
  return trimmed;
}

/** Require a signed-in user for an API route; throws 401 otherwise. */
export async function requireUser() {
  const user = await getCurrentSessionUser();
  if (!user) throw new HttpError(401, "Not signed in");
  return user;
}

/** Download response (CSV, JSON, etc.). */
export function file(
  content: string | Uint8Array,
  filename: string,
  contentType = "text/csv; charset=utf-8",
): Response {
  const body =
    typeof content === "string" ? content : new Blob([content as BlobPart]);
  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "no-store",
    },
  });
}

/** True when the request came in over HTTPS (works behind Vercel's proxy). */
export function isHttps(req: Request): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return new URL(req.url).protocol === "https:";
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
    ctx: { params: Promise<P> },
  ): Promise<Response> => {
    try {
      const params = await ctx.params;
      return await fn(req, params);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

function errorResponse(e: unknown): Response {
  const error = e instanceof Error ? e : undefined;
  const candidateStatus =
    e && typeof e === "object"
      ? ((e as { statusCode?: unknown }).statusCode ??
        (e as { status?: unknown }).status)
      : undefined;
  const status =
    typeof candidateStatus === "number" &&
    Number.isInteger(candidateStatus) &&
    candidateStatus >= 400 &&
    candidateStatus <= 599
      ? candidateStatus
      : 500;
  const message =
    status === 500
      ? "Internal server error"
      : (error?.message ?? "Request failed");

  return Response.json({ error: message }, { status });
}
