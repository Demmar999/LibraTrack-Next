import { mutate } from "@/lib/db";
import { payFine, renew, returnLoan } from "@/lib/service";
import { json, readJson, requireUser, route, str } from "@/lib/http";
import { AppError } from "@/lib/errors";

/** PATCH { action: "return" | "renew" | "pay" } */
export const PATCH = route<{ id: string }>(async (req, { id }) => {
  const action = str((await readJson(req)).action);
  const loan = await mutate((db) => {
    const user = requireUser(db, req);
    if (action === "renew")
      return renew(db, id, user.role === "admin" ? undefined : user.id);
    requireUser(db, req, "admin");
    if (action === "return") return returnLoan(db, id);
    if (action === "pay") {
      payFine(db, id);
      return null;
    }
    throw new AppError("Unknown action.");
  });
  return json({ loan });
});
