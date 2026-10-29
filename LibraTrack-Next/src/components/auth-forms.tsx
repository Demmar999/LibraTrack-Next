"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client-api";
import { Button, Field, Modal, inputClass } from "./ui";
import { Icon } from "./icons";

function useSubmit(url: string) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ redirect: string }>(url, "POST", body);
      router.push(r.redirect);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }
  return { error, busy, submit };
}

const Err = ({ text }: { text: string }) =>
  text ? (
    <p
      role="alert"
      className="rounded-xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger-dark"
    >
      {text}
    </p>
  ) : null;

export function LoginForm({
  registered = false,
  defaultEmail = "",
}: {
  registered?: boolean;
  defaultEmail?: string;
}) {
  const { error, busy, submit } = useSubmit("/api/auth/login");
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  return (
    <div className="grid gap-4">
      {registered && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-brand/10 px-3 py-2 text-sm font-medium text-brand-dark"
        >
          <Icon name="success" size={16} /> Account created. Please log in.
        </p>
      )}
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit({ email, password });
        }}
      >
        <Field label="Email">
          {(id) => (
            <input
              id={id}
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@school.edu"
            />
          )}
        </Field>
        <Field label="Password">
          {(id) => (
            <div className="relative">
              <input
                id={id}
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass + " pr-11"}
                placeholder="Your password"
                autoFocus={registered}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-panel"
              >
                <Icon name={show ? "hide" : "show"} size={16} />
              </button>
            </div>
          )}
        </Field>
        <Err text={error} />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Logging in..." : "Log in"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        New here?{" "}
        <Link
          href="/register"
          className="font-semibold text-brand-dark hover:underline"
        >
          Create a member account
        </Link>
      </p>
    </div>
  );
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{
    name: string;
    email: string;
  } | null>(null);

  async function create(body: Record<string, string>) {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ user: { name: string; email: string } }>(
        "/api/auth/register",
        "POST",
        body,
      );
      setCreated(r.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const goToLogin = () =>
    router.push(
      `/login?registered=1&email=${encodeURIComponent(created?.email ?? "")}`,
    );

  return (
    <div className="grid gap-4">
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (String(f.get("password")) !== String(f.get("confirm"))) {
            setError("Passwords do not match.");
            return;
          }
          void create(
            Object.fromEntries(
              ["name", "email", "password", "confirm"].map((k) => [
                k,
                String(f.get(k) ?? ""),
              ]),
            ),
          );
        }}
      >
        <Field label="Full name">
          {(id) => (
            <input
              id={id}
              name="name"
              required
              autoComplete="name"
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Email">
          {(id) => (
            <input
              id={id}
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Password" hint="At least 6 characters.">
          {(id) => (
            <input
              id={id}
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className={inputClass}
            />
          )}
        </Field>
        <Field label="Confirm password">
          {(id) => (
            <input
              id={id}
              name="confirm"
              type="password"
              required
              autoComplete="new-password"
              className={inputClass}
            />
          )}
        </Field>
        <Err text={error} />
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating account..." : "Create account"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-dark hover:underline"
        >
          Log in
        </Link>
      </p>

      {created && (
        <Modal
          title="Account created"
          onClose={goToLogin}
          footer={<Button onClick={goToLogin}>Continue to login</Button>}
        >
          <div className="grid place-items-center gap-3 py-4 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-brand/10 text-brand-dark">
              <Icon name="success" size={34} />
            </span>
            <p className="text-lg font-bold text-navy">
              Account created successfully!
            </p>
            <p className="text-sm text-muted">
              Welcome, <b className="text-navy">{created.name}</b>. Your member
              account is ready. Log in with{" "}
              <b className="text-navy">{created.email}</b> to continue.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
