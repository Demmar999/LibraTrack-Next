import { query } from "@/lib/db";
import { SettingsPanel } from "@/components/settings-panel";

export default async function SettingsPage() {
  const settings = await query((db) => db.settings);

  return <SettingsPanel settings={settings} />;
}
