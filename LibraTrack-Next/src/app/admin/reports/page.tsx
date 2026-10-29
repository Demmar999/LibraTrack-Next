import type { Metadata } from "next";
import { query } from "@/lib/db";
import { categories } from "@/lib/service";
import { ReportsPanel } from "@/components/reports-panel";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  return <ReportsPanel categories={await query(categories)} />;
}
