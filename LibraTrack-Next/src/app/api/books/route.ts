import { mutate, query } from "@/lib/db";
import { listBooks, saveBook } from "@/lib/service";
import { json, readJson, requireUser, route } from "@/lib/http";

export const GET = route(async (req) =>
  json(
    await query((db) => {
      requireUser(db, req);
      return { books: listBooks(db) };
    }),
  ),
);

export const POST = route(async (req) => {
  const body = await readJson(req);
  await mutate((db) => {
    requireUser(db, req, "admin");
    saveBook(db, { ...body, id: undefined });
  });
  return json({ ok: true }, 201);
});
