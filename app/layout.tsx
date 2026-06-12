import { headers } from "next/headers";

import OwnerProgramQuickPlay from "./components/OwnerProgramQuickPlay";
import PublicRadioPlayerGate from "./components/PublicRadioPlayerGate";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import RootShell from "@/components/root-shell";
import OwnerEditorHomeButton from './components/OwnerEditorHomeButton';

export const metadata: Metadata = {
  title: "Tha Core Online Radio",
  description:
    "Tha Core Online Radio - live music, chat, store, news, and community.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#b00000",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const requestHost = (requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "").toLowerCase();
  const hidePublicPlayerOnAdminHost = requestHost.startsWith("admin."); // ADMIN_HOST_HIDE_PUBLIC_PLAYER_V1

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        style={{
          margin: 0,
          background: "#000",
          color: "#fff",
          minHeight: "100vh",
        }}
      >
        <OwnerEditorHomeButton />
        <RootShell>{children}</RootShell>
        {!hidePublicPlayerOnAdminHost && <PublicRadioPlayerGate />}
              <OwnerProgramQuickPlay />
      </body>
    </html>
  );
}



