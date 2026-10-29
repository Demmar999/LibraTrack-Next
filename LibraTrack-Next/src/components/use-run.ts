"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./toast";

/** Runs an API action, shows a toast, refreshes the page data. Returns [run, busy]. */
export function useRun() {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function run(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setBusy(true);
    try {
      await action();
      toast(success);
      router.refresh();
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : "Something went wrong.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  }
  /** Call after a successful change made outside run(): shows a toast and refreshes the page data. */
  function done(success: string) {
    toast(success);
    router.refresh();
  }
  return { run, busy, done };
}
