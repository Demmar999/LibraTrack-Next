import { mutate } from "@/lib/db";
import { deleteBook, saveBook } from "@/lib/service";
import { json, readJson, requireUser, route } from "@/lib/http";

export const PUT = route<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req);
  await mutate((db) => {
    requireUser(db, req, "admin");
    saveBook(db, { ...body, id });
  });
  return json({ ok: true });
});

export const DELETE = route<{ id: string }>(async (req, { id }) => {
  await mutate((db) => {
    requireUser(db, req, "admin");
    deleteBook(db, id);
  });
  return json({ ok: true });
});
