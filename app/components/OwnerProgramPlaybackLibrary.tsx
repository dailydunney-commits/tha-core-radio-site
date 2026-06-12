"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type PlaybackItem = {
  programId: string;
  programName: string;
  programSlot?: string | null;
  playbackAudioUrl: string;
  totalMinutes?: number;
  partCount?: number;
  archivedAt?: string;
  playable?: boolean;
  libraryFile?: string;
};

export default function OwnerProgramPlaybackLibrary() {
  const pathname = usePathname();
  const [items, setItems] = useState<PlaybackItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const isOwner = pathname?.startsWith("/owner");

  async function loadLibrary() {
    if (!isOwner) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/radio/program-playback-library?fresh=${Date.now()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      setItems(Array.isArray(json.items) ? json.items : []);
    } catch (error: any) {
      setMessage(error?.message || "Playback library load failed.");
    } finally {
      setLoading(false);
    }
  }

  async function playItem(item: PlaybackItem) {
    setMessage(`Starting ${item.programName}...`);

    try {
      const res = await fetch("/api/radio/program-playback-play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libraryFile: item.libraryFile, programId: item.programId }),
      });

      const json = await res.json();

      if (!json.ok) {
        setMessage(json.message || json.error || "Playback start failed.");
        return;
      }

      setMessage(`Now playing saved show: ${item.programName}`);
    } catch (error: any) {
      setMessage(error?.message || "Playback start failed.");
    }
  }

  useEffect(() => {
    loadLibrary();
  }, [isOwner]);

  if (!isOwner) return null;

  return (
    <section
      style={{
        margin: "18px auto",
        maxWidth: 1180,
        padding: 16,
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 18,
        background: "rgba(10,0,0,0.75)",
        color: "white",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22 }}>Owner Program Playback Library</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
            Saved AI shows/programs for one-button replay anytime.
          </p>
        </div>

        <button
          onClick={loadLibrary}
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "#210000",
            color: "white",
            cursor: "pointer",
          }}
        >
          {loading ? "Refreshing..." : "Refresh Library"}
        </button>
      </div>

      {message ? (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.08)" }}>
          {message}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        {items.length < 1 ? (
          <div style={{ opacity: 0.8 }}>No saved program playback files yet.</div>
        ) : (
          items.map((item) => (
            <div
              key={`${item.programId}-${item.libraryFile}`}
              style={{
                display: "grid",
                gap: 8,
                padding: 14,
                borderRadius: 14,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <strong>{item.programName}</strong>
                  <div style={{ opacity: 0.75, fontSize: 13 }}>
                    {item.programSlot || "Saved Program"} • {item.totalMinutes || 0} min • {item.partCount || 0} parts
                  </div>
                  <div style={{ opacity: 0.6, fontSize: 12 }}>{item.playbackAudioUrl}</div>
                </div>

                <button
                  onClick={() => playItem(item)}
                  disabled={!item.playable}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: item.playable ? "#8b0000" : "#333",
                    color: "white",
                    cursor: item.playable ? "pointer" : "not-allowed",
                    minWidth: 150,
                  }}
                >
                  {item.playable ? "Play Saved Show" : "Missing Audio"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
