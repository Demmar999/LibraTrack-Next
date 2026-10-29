/* Browser helper for calling our own API routes. Throws an Error with the server's friendly message. */

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export async function api<T = unknown>(url: string, method: Method = "POST", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof data === "object" && data !== null && "error" in data ? String((data as { error: unknown }).error) : "";
    throw new Error(message || "Something went wrong. Please try again.");
  }
  return data as T;
}
