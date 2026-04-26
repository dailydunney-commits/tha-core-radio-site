import type { Metadata, Viewport } from "next";
import "./globals.css";
import GlobalRadioPlayer from "@/components/global-radio-player";
import { RadioProvider } from "@/components/radio-provider";

export const metadata: Metadata = {
  title: "Tha Core Radio",
  description: "Tha Core Online Radio Platform",
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
    <html lang="en">
      <body className="bg-black text-white">
        <RadioProvider>
          <div className="pb-32">{children}</div>
          <GlobalRadioPlayer />
        </RadioProvider>
      </body>
    </html>
  );
}