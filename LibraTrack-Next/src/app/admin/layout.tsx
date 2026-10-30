import type { Metadata } from "next";
import { query } from "@/lib/db";
import { SettingsPanel } from "@/components/settings-panel";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await query((db) => db.settings);
  return <SettingsPanel settings={settings} />;
}
