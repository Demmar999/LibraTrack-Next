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
function errorResponse(e: unknown): Response | PromiseLike<Response> {
  const error = e instanceof Error ? e : undefined;
  const candidateStatus =
    e && typeof e === "object"
      ? (e as { status?: unknown; statusCode?: unknown }).statusCode ??
        (e as { status?: unknown }).status
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
      : error?.message ?? "Request failed";

  return Response.json({ error: message }, { status });
}
