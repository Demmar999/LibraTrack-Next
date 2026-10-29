import type { Metadata } from "next";
import { Suspense } from "react";
import { query } from "@/lib/db";
import { categories, listBooks } from "@/lib/service";
import { ResourcesManager } from "@/components/resources-manager";

export const metadata: Metadata = { title: "Resources" };
export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const { books, cats } = await query((db) => ({ books: listBooks(db), cats: categories(db) }));
  return <Suspense><ResourcesManager books={books} categories={cats} /></Suspense>;
}
