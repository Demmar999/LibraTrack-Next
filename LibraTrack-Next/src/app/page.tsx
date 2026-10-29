import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { HOME } from "@/lib/nav";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? HOME[user.role] : "/login");
}
