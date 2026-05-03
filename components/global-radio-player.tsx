"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRadio } from "@/components/radio-provider";

type NowPlayingState = {
  nowPlaying: string;
};

export default function GlobalRadioPlayer() {
  const { isPlaying, toggle, volume, setVolume, streamUrl } = useRadio();

  const [playerData, setPlayerData] = useState<NowPlayingState>({
    nowPlaying: "Tha Core Live Mix",
  });

  useEffect(() => {
    let active = true;

    async function loadNowPlaying() {
      try {
        const res = await fetch("/api/now-playing", { cache: "no-store" });
        const data = await res.json();

        if (!active) return;

        const nowPlaying =
          data?.now_playing?.song?.text ||
          data?.song?.text ||
          data?.nowPlaying ||
          data?.title ||
          "Tha Core Live Mix";

        setPlayerData({
          nowPlaying: String(nowPlaying),
        });
      } catch {
        if (!active) return;
        setPlayerData({
          nowPlaying: "Tha Core Live Mix",
        });
      }
    }

    loadNowPlaying();
    const timer = window.setInterval(loadNowPlaying, 10000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>THA CORE RADIO</div>

      <div style={styles.trackBox}>
        <span style={styles.musicIcon}>♫</span>
        <span style={styles.trackText}>{playerData.nowPlaying}</span>
      </div>

      <button type="button" onClick={toggle} style={styles.playButton}>
        {isPlaying ? "Pause Live" : "Play Live"}
      </button>

      <div style={styles.volumeRow}>
        <span style={styles.volumeLabel}>Volume</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(event) => setVolume(Number(event.target.value))}
          style={styles.slider}
        />
      </div>

      <div style={styles.streamText}>{streamUrl}</div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    position: "fixed",
    right: 14,
    bottom: 14,
    width: 260,
    zIndex: 9999,
    border: "1px solid #d50000",
    borderRadius: 20,
    background: "rgba(8,8,10,.96)",
    boxShadow: "0 0 18px rgba(255,0,45,.16)",
    padding: 14,
    color: "#fff",
    backdropFilter: "blur(8px)",
  },

  header: {
    color: "#ff6375",
    fontSize: 13,
    fontWeight: 1000,
    letterSpacing: 4,
    marginBottom: 12,
  },

  trackBox: {
    border: "1px solid #d50000",
    borderRadius: 14,
    background: "#050505",
    minHeight: 38,
    padding: "8px 10px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },

  musicIcon: {
    color: "#ffd400",
    fontSize: 16,
    fontWeight: 1000,
    flexShrink: 0,
  },

  trackText: {
    color: "#ffd400",
    fontSize: 14,
    fontWeight: 1000,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "block",
    width: "100%",
  },

  playButton: {
    width: "100%",
    border: "none",
    borderRadius: 14,
    background: "#d50000",
    color: "#fff",
    padding: "13px 14px",
    marginTop: 12,
    fontSize: 16,
    fontWeight: 1000,
    cursor: "pointer",
  },

  volumeRow: {
    marginTop: 12,
    display: "grid",
    gap: 6,
  },

  volumeLabel: {
    color: "#bdbdbd",
    fontSize: 13,
    fontWeight: 800,
  },

  slider: {
    width: "100%",
    accentColor: "#1e88ff",
    cursor: "pointer",
  },

  streamText: {
    marginTop: 8,
    color: "#8b8b8b",
    fontSize: 10,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
};