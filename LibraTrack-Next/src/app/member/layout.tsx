import { AppShell } from "@/components/app-shell";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("member");
  return <AppShell user={user} role="member">{children}</AppShell>;
}
