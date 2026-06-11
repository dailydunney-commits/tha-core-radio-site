"use client";

import { useEffect, useState } from "react";

function shouldShowOwnerHomeButton() {
  if (typeof window === "undefined") return false;

  const path = window.location.pathname.toLowerCase().replace(/\/+$/, "");
  const search = window.location.search.toLowerCase();
  const hash = window.location.hash.toLowerCase();
  const href = window.location.href.toLowerCase();

  const isOwner = path === "/owner" || path.startsWith("/owner/");
  if (!isOwner) return false;

  const isOwnerHome = path === "/owner" && !search && !hash;
  if (isOwnerHome) return false;

  return (
    path.includes("schedule") ||
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
    const check = () => setShow(shouldShowOwnerHomeButton());

    check();
    const timer = window.setInterval(check, 500);
    window.addEventListener("popstate", check);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("popstate", check);
    };
  }, []);

  if (!show) return null;

  return (
    <a
      href="/owner"
      style={{
        position: "fixed",
        top: "14px",
        left: "14px",
        zIndex: 999999,
        background: "#b00000",
        color: "#fff",
        border: "2px solid #ffcc00",
        borderRadius: "999px",
        padding: "10px 16px",
        fontWeight: 900,
        textDecoration: "none",
        boxShadow: "0 0 18px rgba(255,0,0,0.65)",
        fontSize: "14px",
        letterSpacing: "0.04em"
      }}
      title="Return to Owner Home"
    >
      ← Owner Home
    </a>
  );
}
