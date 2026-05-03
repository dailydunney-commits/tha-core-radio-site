import type { Metadata, Viewport } from "next";
import "./globals.css";
import { RadioProvider } from "@/components/radio-provider";
import GlobalRadioPlayer from "@/components/global-radio-player";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <RadioProvider>
          <div style={{ minHeight: "100vh", paddingBottom: 130 }}>
            {children}
          </div>

          <GlobalRadioPlayer />
        </RadioProvider>
      </body>
    </html>
  );
}