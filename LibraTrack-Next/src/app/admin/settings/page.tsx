import type { Metadata } from "next";
import { query } from "@/lib/db";
import { SettingsPanel } from "@/components/settings-panel";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsPanel settings={query((db) => db.settings)} />;
}
