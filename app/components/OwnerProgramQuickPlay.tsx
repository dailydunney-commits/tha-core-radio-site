"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

type ShowOption = {
  label: string;
  description: string;
  show: string;
  partNumber: number;
};

const SHOWS: ShowOption[] = [
  {
    label: "The Core Music Link-Up",
    description: "Prodigy / Diamond hosted show",
    show: "evening-music",
    partNumber: 1,
  },
  {
    label: "The Late Night Reasoning",
    description: "Prodigy / Diamond late-night show",
    show: "late-night",
    partNumber: 1,
  },
  {
    label: "The Core Morning Kickstart",
    description: "Morning show package",
    show: "morning-kickstart",
    partNumber: 1,
  },
];

export default function OwnerProgramQuickPlay() {
  const pathname = usePathname();
  const [busy, setBusy] = useState<string>("");
  const [status, setStatus] = useState<string>("Ready");

  const isOwner =
    pathname?.startsWith("/owner") || pathname?.startsWith("/control-panel");

  if (!isOwner) return null;

  async function playShow(item: ShowOption) {
    try {
      setBusy(item.show);
      setStatus(`Starting ${item.label}...`);

      const res = await fetch("/api/radio/play-program-now", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          show: item.show,
          partNumber: item.partNumber,
          source: "OWNER_PANEL_QUICK_PLAY",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || `HTTP_${res.status}`);
      }

      setStatus(
        `ON AIR: ${data?.programName || data?.title || item.label}`
      );

      window.dispatchEvent(
        new CustomEvent("tha-core-radio-state-refresh", {
          detail: { source: "OWNER_PANEL_QUICK_PLAY", show: item.show },
        })
      );
    } catch (error: any) {
      setStatus(`FAILED: ${error?.message || "Could not start show"}`);
    } finally {
      setBusy("");
    }
  }

  async function refreshStatus() {
    try {
      setBusy("refresh");
      const res = await fetch("/api/listener/now-playing", {
        cache: "no-store",
      });
      const data = await res.json();
      setStatus(
        `CURRENT: ${
          data?.title || data?.programName || data?.mode || "Unknown"
        }`
      );
    } catch (error: any) {
      setStatus(`REFRESH FAILED: ${error?.message || "Unknown error"}`);
    } finally {
      setBusy("");
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        right: 18,
        top: 118,
        zIndex: 99999,
        width: 330,
        maxWidth: "calc(100vw - 36px)",
        border: "1px solid rgba(255, 45, 45, 0.7)",
        borderRadius: 18,
        background:
          "linear-gradient(180deg, rgba(20,0,0,0.98), rgba(0,0,0,0.96))",
        boxShadow: "0 0 28px rgba(255,0,0,0.35)",
        color: "white",
        padding: 14,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          color: "#ff3b3b",
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 2,
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        Owner Show / Program Quick Play
      </div>

      <div
        style={{
          fontSize: 11,
          color: "#ffd6d6",
          lineHeight: 1.35,
          marginBottom: 10,
        }}
      >
        Starts the show from the control-panel lane. Listener follows current
        broadcast.
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {SHOWS.map((item) => (
          <button
            key={item.show}
            type="button"
            onClick={() => playShow(item)}
            disabled={Boolean(busy)}
            style={{
              border: "1px solid rgba(255, 0, 0, 0.75)",
              borderRadius: 12,
              background:
                busy === item.show
                  ? "linear-gradient(180deg,#ff6b00,#8b1200)"
                  : "linear-gradient(180deg,#e10000,#750000)",
              color: "white",
              padding: "10px 12px",
              textAlign: "left",
              cursor: busy ? "wait" : "pointer",
              fontWeight: 900,
              textTransform: "uppercase",
              boxShadow: "inset 0 0 14px rgba(255,255,255,0.08)",
            }}
          >
            <div style={{ fontSize: 13 }}>{item.label}</div>
            <div
              style={{
                fontSize: 10,
                color: "#ffe1e1",
                marginTop: 3,
                textTransform: "none",
                fontWeight: 700,
              }}
            >
              {item.description}
            </div>
          </button>
        ))}

        <button
          type="button"
          onClick={refreshStatus}
          disabled={Boolean(busy)}
          style={{
            border: "1px solid rgba(0, 220, 255, 0.75)",
            borderRadius: 12,
            background: "linear-gradient(180deg,#00c8ff,#006f90)",
            color: "black",
            padding: "9px 12px",
            cursor: busy ? "wait" : "pointer",
            fontWeight: 950,
            textTransform: "uppercase",
          }}
        >
          Refresh Current Broadcast
        </button>
      </div>

      <div
        style={{
          marginTop: 10,
          padding: "8px 10px",
          borderRadius: 10,
          background: "rgba(255,255,255,0.06)",
          color: status.startsWith("FAILED") ? "#ff9090" : "#d8ffd8",
          fontSize: 11,
          lineHeight: 1.35,
          fontWeight: 800,
        }}
      >
        {status}
      </div>
    </div>
  );
}
