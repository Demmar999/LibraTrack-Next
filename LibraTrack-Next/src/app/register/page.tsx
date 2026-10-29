import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { RegisterForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/session";
import { HOME } from "@/lib/nav";

export const metadata: Metadata = { title: "Create account" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect(HOME[user.role]);
  return <AuthCard title="Create your account" subtitle="Members can search, borrow, reserve and renew books."><RegisterForm /></AuthCard>;
}
