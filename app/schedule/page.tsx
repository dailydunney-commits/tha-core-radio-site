"use client";

import { useEffect, useState } from "react";

type AnyRecord = Record<string, any>;

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export default function SmartZjSchedulePage() {
  const [schedule, setSchedule] = useState<AnyRecord | null>(null);
  const [nowPlaying, setNowPlaying] = useState<AnyRecord | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");

  async function load() {
    try {
      const [scheduleRes, nowRes] = await Promise.all([
        fetch(`/api/radio/smartzj-schedule?t=${Date.now()}`, { cache: "no-store" }),
        fetch(`/api/listener/now-playing?t=${Date.now()}`, { cache: "no-store" }),
      ]);

      setSchedule(await scheduleRes.json());
      setNowPlaying(await nowRes.json());
      setUpdatedAt(new Date().toLocaleString());
    } catch (error) {
      setSchedule({
        ok: false,
        message: error instanceof Error ? error.message : "Could not load schedule.",
      });
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const activeBlock = schedule?.activeBlock || {};
  const song = nowPlaying?.now_playing?.song || {};
  const currentBroadcast = nowPlaying?.currentBroadcast || {};

  return (
    <main style={{
      minHeight: "100vh",
      background: "#050505",
      color: "#fff",
      padding: "32px",
      fontFamily: "Arial, sans-serif",
    }}>
      <section style={{
        maxWidth: "1100px",
        margin: "0 auto",
        border: "1px solid rgba(255,255,255,0.16)",
        borderRadius: "22px",
        padding: "28px",
        background: "linear-gradient(145deg, #090909, #160000)",
        boxShadow: "0 0 35px rgba(255,0,0,0.22)",
      }}>
        <p style={{ color: "#ffcc66", letterSpacing: "0.12em", fontWeight: 800 }}>
          THA CORE RADIO
        </p>

        <h1 style={{ fontSize: "38px", margin: "8px 0 18px" }}>
          SmartZJ Schedule Brain
        </h1>

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "18px",
        }}>
          <a href="/owner" style={buttonLinkStyle}>
            Open Owner Control Panel
          </a>

          <a href="/owner?panel=smartzj-clean-bleep" style={buttonLinkStyle}>
            SmartZJ Clean / Bleep Tracks
          </a>

          <a href="/owner?panel=audio-safety" style={buttonLinkStyle}>
            Audio Safety Center
          </a>
        </div>

        <p style={{
          color: "#bbb",
          marginTop: "-4px",
          marginBottom: "18px",
          lineHeight: 1.5,
        }}>
          Public pages should only show normal now-playing information. SmartZJ clean/bleep tools stay inside the owner control area.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
        }}>
          <div style={cardStyle}>
            <h2 style={headingStyle}>Active Block</h2>
            <p style={bigStyle}>{clean(activeBlock.name) || "No active block"}</p>
            <p>ID: {clean(activeBlock.id) || "N/A"}</p>
            <p>Time: {clean(activeBlock.start)} - {clean(activeBlock.end)}</p>
            <p>Type: {clean(activeBlock.type) || "N/A"}</p>
          </div>

          <div style={cardStyle}>
            <h2 style={headingStyle}>Selected Lane</h2>
            <p style={bigStyle}>{clean(schedule?.selectedLane) || "Auto"}</p>
            <p>Count: {clean(schedule?.selectedLaneCount) || "0"}</p>
            <p>Reason: {clean(schedule?.selectionReason) || "N/A"}</p>
            <p>Raw Azura: {schedule?.rawAzuraBlocked ? "BLOCKED" : "UNKNOWN"}</p>
          </div>

          <div style={cardStyle}>
            <h2 style={headingStyle}>Current Broadcast</h2>
            <p style={bigStyle}>{clean(song.title || currentBroadcast.title) || "Nothing loaded"}</p>
            <p>Artist: {clean(song.artist || currentBroadcast.artist) || "AzuraCast"}</p>
            <p>Lane: {clean(currentBroadcast.genreLane) || "N/A"}</p>
            <p>Safety: {clean(nowPlaying?.safety) || "N/A"}</p>
          </div>
        </div>

        <div style={{ ...cardStyle, marginTop: "16px" }}>
          <h2 style={headingStyle}>Lane Counts</h2>
          <pre style={{
            whiteSpace: "pre-wrap",
            color: "#d6ffd6",
            fontSize: "15px",
          }}>
            {JSON.stringify(schedule?.laneCounts || {}, null, 2)}
          </pre>
        </div>

        <button
          onClick={load}
          style={{
            marginTop: "18px",
            padding: "12px 18px",
            borderRadius: "999px",
            border: "0",
            background: "#b00000",
            color: "#fff",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Refresh Schedule
        </button>

        <p style={{ color: "#aaa", marginTop: "14px" }}>
          Last updated: {updatedAt || "loading..."}
        </p>
      </section>
    </main>
  );
}

const cardStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  borderRadius: "18px",
  padding: "18px",
  background: "rgba(0,0,0,0.55)",
} as const;

const headingStyle = {
  margin: "0 0 10px",
  color: "#ffcc66",
  fontSize: "16px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
} as const;

const bigStyle = {
  fontSize: "22px",
  fontWeight: 900,
  margin: "0 0 10px",
} as const;

const buttonLinkStyle = {
  display: "inline-block",
  padding: "12px 16px",
  borderRadius: "999px",
  background: "#b00000",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid rgba(255,255,255,0.18)",
  boxShadow: "0 0 16px rgba(255,0,0,0.22)",
} as const;
