"use client";

import { useEffect, useState } from "react";

export default function GlobalBleepGateButton() {
  const [gateOn, setGateOn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState("GLOBAL BLEEP GATE ON - all broadcast paths must pass safety check.");

  useEffect(() => {
    function handleGateResult(event: Event) {
      const detail = (event as CustomEvent<{ message?: string }>).detail;

      if (detail?.message) {
        setLastResult(detail.message);
      }
    }

    window.addEventListener("tha-core-global-gate-result", handleGateResult as EventListener);

    return () => {
      window.removeEventListener("tha-core-global-gate-result", handleGateResult as EventListener);
    };
  }, []);

  async function runGlobalAudioGateCheck() {
    setBusy(true);
    setLastResult("Running Global Audio Gate check...");

    try {
      const response = await fetch("/api/radio/global-audio-gate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          source: "CONTROL_PANEL",
          mode: "manual_global_bleep_check",
          track: {
            id: "manual-global-bleep-check",
            title: "Manual Global Bleep Check",
            artist: "Tha Core",
            processedAudioUrl: "/audio/smartdj/test-bleeped-clean.mp3",
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (data?.allowBroadcast && data?.safe) {
        setLastResult(`APPROVED ✅ ${data?.decision || "ALLOW_PROCESSED_CLEAN_AUDIO"}`);
      } else {
        setLastResult(`HELD ⛔ ${data?.decision || "AUDIO_BLOCKED"}`);
      }
    } catch {
      setLastResult("Global Audio Gate check failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      style={{
        margin: "14px 0",
        padding: "14px",
        borderRadius: "18px",
        border: "1px solid rgba(0, 255, 115, 0.65)",
        background: "linear-gradient(90deg, rgba(0, 10, 10, 0.94), rgba(8, 0, 0, 0.92))",
        boxShadow: "0 0 18px rgba(0, 255, 115, 0.18)",
        color: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "999px",
                background: gateOn ? "#00ff73" : "#ff3030",
                boxShadow: gateOn
                  ? "0 0 18px rgba(0, 255, 115, 0.95)"
                  : "0 0 18px rgba(255, 48, 48, 0.95)",
                display: "inline-block",
              }}
            />
            <h3
              style={{
                margin: 0,
                color: "#ffeb33",
                letterSpacing: "0.16em",
                fontSize: 18,
              }}
            >
              GLOBAL BLEEP GATE
            </h3>
            <strong
              style={{
                background: "#050505",
                borderRadius: "999px",
                padding: "4px 10px",
                fontSize: 12,
              }}
            >
              {gateOn ? "ON" : "OFF"}
            </strong>
          </div>

          <p style={{ margin: "8px 0 0", color: "#00d9ff", fontWeight: 900, fontSize: 13 }}>
            AutoDJ • SmartDJ • LiveDJ • Requests • Uploads • Promos • Jingles • Ads
          </p>

          <p style={{ margin: "7px 0 0", color: gateOn ? "#fff" : "#ff8080", fontWeight: 900, fontSize: 13 }}>
            {lastResult}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setGateOn((current) => !current);
              setLastResult((current) =>
                gateOn
                  ? "GLOBAL BLEEP GATE OFF - warning: safety display switched off."
                  : "GLOBAL BLEEP GATE ON - all broadcast paths must pass safety check."
              );
            }}
            style={buttonStyle}
          >
            {gateOn ? "BLEEP ON" : "BLEEP OFF"}
          </button>

          <button
            type="button"
            onClick={runGlobalAudioGateCheck}
            disabled={busy}
            style={buttonStyle}
          >
            {busy ? "CHECKING..." : "GLOBAL BLEEP CHECK"}
          </button>
        </div>
      </div>
    </section>
  );
}

const buttonStyle = {
  border: 0,
  borderRadius: 12,
  padding: "12px 18px",
  background: "linear-gradient(180deg, #ffcc00, #b98500)",
  color: "#120700",
  fontWeight: 950,
  cursor: "pointer",
  textTransform: "uppercase" as const,
};

