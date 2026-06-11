"use client";

import { useEffect, useState } from "react";

function shouldShowScheduleButtons() {
  if (typeof window === "undefined") return false;

  const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const href = window.location.href.toLowerCase();

  if (path === "/schedule") return true;
  if (path.includes("schedule")) return true;

  const isOwner = path === "/owner" || path.startsWith("/owner/");
  if (!isOwner) return false;

  const isOwnerHome = path === "/owner" && !search && !hash;
  if (isOwnerHome) return false;

  return (
    search.includes("schedule") ||
    search.includes("editor") ||
    hash.includes("schedule") ||
    hash.includes("editor") ||
    href.includes("schedule-editor") ||
    href.includes("panel=schedule")
  );
}

export default function OwnerEditorHomeButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => setShow(shouldShowScheduleButtons());

    check();
    const timer = window.setInterval(check, 500);
    window.addEventListener("popstate", check);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("popstate", check);
    };
  }, []);

  if (!show) return null;

  const buttonBase = {
    color: "#fff",
    border: "2px solid #ffcc00",
    borderRadius: "999px",
    padding: "10px 16px",
    fontWeight: 900,
    textDecoration: "none",
    boxShadow: "0 0 18px rgba(255,0,0,0.65)",
    fontSize: "14px",
    letterSpacing: "0.04em",
    display: "inline-block"
  } as const;

  return (
    <div
      style={{
        position: "fixed",
        top: "14px",
        left: "14px",
        zIndex: 999999,
        display: "flex",
        gap: "10px",
        alignItems: "center"
      }}
    >
      <a
        href="/owner"
        style={{
          ...buttonBase,
          background: "#b00000"
        }}
        title="Return to Owner Home"
      >
        ← Owner Home
      </a>

      <a
        href="https://live.thacoreonlinerad.com"
        style={{
          ...buttonBase,
          background: "#111"
        }}
        title="Open Live Radio"
      >
        ▶ Live Radio
      </a>
    </div>
  );
}