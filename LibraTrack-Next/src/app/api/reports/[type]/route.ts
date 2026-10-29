import { query } from "@/lib/db";
import { buildReport, isReportType } from "@/lib/reports";
import { buildPdf } from "@/lib/export-pdf";
import { buildXlsx } from "@/lib/export-xlsx";
import { today, nowStamp } from "@/lib/dates";
import { file, json, requireUser, route } from "@/lib/http";
import { AppError } from "@/lib/errors";

/** GET /api/reports/inventory?format=json|pdf|xlsx&from=YYYY-MM-DD&to=YYYY-MM-DD&cat=Fiction */
export const GET = route<{ type: string }>(async (req, { type }) => {
  if (!isReportType(type)) throw new AppError("Unknown report.", 404);
  const url = new URL(req.url);
  const format = url.searchParams.get("format") ?? "json";
  const filters = {
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    cat: url.searchParams.get("cat") ?? undefined,
  };
  const report = await query((db) => {
    requireUser(db, req, "admin");
    return buildReport(db, type, filters);
  });
  if (format === "json") return json({ report });
  const info = [filters.from && `From ${filters.from}`, filters.to && `To ${filters.to}`, filters.cat && filters.cat !== "All" && `Category: ${filters.cat}`]
    .filter(Boolean).join(" | ") || "All records";
  const name = `libratrack-${type}-${today()}`;
  if (format === "pdf") return file(buildPdf(report, info, nowStamp()), "application/pdf", `${name}.pdf`);
  if (format === "xlsx")
    return file(buildXlsx(report, info), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", `${name}.xlsx`);
  throw new AppError("Unknown format.");
});
