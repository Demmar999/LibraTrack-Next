import { SettingsPanel } from "@/components/settings-panel";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await query((db) => db.settings);
  return <SettingsPanel settings={settings} />;
}
