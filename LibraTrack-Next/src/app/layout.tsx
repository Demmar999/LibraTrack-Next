import type { Metadata, Viewport } from "next";
// @ts-expect-error Next.js resolves global CSS imports at build time.
import "./globals.css";
import { ToastProvider } from "@/components/toast";

export const metadata: Metadata = {
  title: { default: "LibraTrack", template: "%s | LibraTrack" },
  description: "Library Resource Management and Analytics System",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
