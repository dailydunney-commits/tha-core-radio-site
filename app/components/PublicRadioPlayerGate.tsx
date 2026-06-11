"use client";

import { usePathname } from "next/navigation";
import PersistentRadioPlayer from "./PersistentRadioPlayer";

export default function PublicRadioPlayerGate() {
  const pathname = usePathname() || "";

  const hidePublicPlayer =
    pathname.startsWith("/owner") ||
    pathname.startsWith("/control-panel");

  if (hidePublicPlayer) return null;

  return <PersistentRadioPlayer />;
}
