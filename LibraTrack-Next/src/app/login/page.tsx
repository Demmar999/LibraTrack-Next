import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth-card";
import { LoginForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/session";
import { HOME } from "@/lib/nav";

export const metadata: Metadata = { title: "Log in" };
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; email?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect(HOME[user.role]);
  const sp = await searchParams;
  return (
    <AuthCard title="Welcome back" subtitle="Log in to continue to LibraTrack.">
      <LoginForm
        registered={sp.registered === "1"}
        defaultEmail={sp.email ?? ""}
      />
    </AuthCard>
  );
}
