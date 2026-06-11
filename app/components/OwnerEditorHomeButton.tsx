"use client";

import { useEffect, useState } from "react";

export default function OwnerEditorHomeButton() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return;
      setShow(window.location.pathname.toLowerCase().startsWith("/owner"));
    };

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
