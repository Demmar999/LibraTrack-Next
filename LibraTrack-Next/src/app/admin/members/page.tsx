import type { Metadata } from "next";
import { query } from "@/lib/db";
import { members } from "@/lib/service";
import { MembersManager } from "@/components/members-manager";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage() {
  return <MembersManager members={await query(members)} />;
}
