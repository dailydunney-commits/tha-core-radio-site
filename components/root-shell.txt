"use client";

import { usePathname } from "next/navigation";
import { RadioProvider } from "@/components/radio-provider";
import GlobalRadioPlayer from "@/components/global-radio-player";

export default function RootShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isOwnerPage = pathname.startsWith("/owner");

  if (isOwnerPage) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#000",
          color: "#fff",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <RadioProvider>
      <div style={{ minHeight: "100vh", paddingBottom: 130 }}>
        {children}
      </div>

      <GlobalRadioPlayer />
    </RadioProvider>
  );
}