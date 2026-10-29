import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { ProfileForms } from "@/components/profile-forms";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  return <ProfileForms user={await requireRole("member")} />;
}
