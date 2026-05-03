"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const STREAM_URL =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  "http://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

export default function PersistentRadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [nowPlaying, setNowPlaying] = useState("Tha Core Live Mix");
  const [listeners, setListeners] = useState("0");
  const [message, setMessage] = useState("Ready to play live");

  useEffect(() => {
    const saved = window.localStorage.getItem("tha-core-radio-volume");

    if (saved) {
      const parsed = Number(saved);

      if (!Number.isNaN(parsed)) {
        setVolume(parsed);
      }
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    window.localStorage.setItem("tha-core-radio-volume", String(volume));
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function handlePlay() {
      setIsPlaying(true);
      setMessage("Playing live");
    }

    function handlePause() {
      setIsPlaying(false);
      setMessage("Paused by listener");
    }

    function handleError() {
      setIsPlaying(false);
      setMessage("Stream unavailable - check Azura");
    }

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("error", handleError);

      // Do NOT pause here.
      // Do NOT stop Azura here.
      // This keeps page navigation from killing the listener player.
    };
  }, []);

  useEffect(() => {
    async function loadNowPlaying() {
      try {
        const res = await fetch("/api/now-playing", {
          cache: "no-store",
        });

        const data = await res.json();

        const song =
          data?.now_playing?.song?.text ||
          data?.nowPlaying ||
          data?.song ||
          "Tha Core Live Mix";

        const currentListeners =
          data?.listeners?.current ?? data?.listeners ?? "0";

        setNowPlaying(String(song));
        setListeners(String(currentListeners));
      } catch {
        setNowPlaying("Tha Core Live Mix");
      }
    }

    loadNowPlaying();

    const timer = window.setInterval(loadNowPlaying, 10000);

    return () => window.clearInterval(timer);
  }, []);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
        setMessage("Paused by listener");
        return;
      }

      audio.volume = volume;
      await audio.play();

      setIsPlaying(true);
      setMessage("Playing live");
    } catch {
      setIsPlaying(false);
      setMessage("Tap play again or check stream");
    }
  }

  function changeVolume(value: number) {
    setVolume(value);

    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  }

  return (
    <div style={styles.player}>
      <audio ref={audioRef} src={STREAM_URL} preload="none" />

      <div style={styles.left}>
        <div style={isPlaying ? styles.liveDotOn : styles.liveDotOff} />

        <div style={styles.textWrap}>
          <p style={styles.label}>THA CORE ONLINE RADIO</p>
          <p style={styles.nowPlaying}>{nowPlaying}</p>
          <p style={styles.status}>
            {message} · Listeners: {listeners}
          </p>
        </div>
      </div>

      <div style={styles.controls}>
        <button
          type="button"
          onClick={togglePlay}
          style={isPlaying ? styles.pauseButton : styles.playButton}
        >
          {isPlaying ? "PAUSE LIVE" : "PLAY LIVE"}
        </button>

        <div style={styles.volumeBox}>
          <span style={styles.volumeText}>VOL</span>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            style={styles.slider}
          />

          <span style={styles.volumeText}>{Math.round(volume * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  player: {
    position: "fixed",
    left: 14,
    right: 14,
    bottom: 14,
    zIndex: 999999,
    minHeight: 92,
    border: "1px solid #ff1744",
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(20,0,5,.98), rgba(0,0,0,.98))",
    boxShadow: "0 0 35px rgba(255,23,68,.45)",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 16,
    alignItems: "center",
    padding: "14px 18px",
    color: "#fff",
    fontFamily: "Arial, Helvetica, sans-serif",
  },

  left: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    minWidth: 0,
  },

  textWrap: {
    minWidth: 0,
  },

  label: {
    margin: 0,
    color: "#ff1744",
    fontSize: 13,
    fontWeight: 1000,
    letterSpacing: 2,
  },

  nowPlaying: {
    margin: "4px 0",
    color: "#fff",
    fontSize: 18,
    fontWeight: 1000,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "60vw",
  },

  status: {
    margin: 0,
    color: "#cfcfcf",
    fontSize: 12,
    fontWeight: 700,
  },

  controls: {
    display: "grid",
    gridTemplateColumns: "160px 260px",
    gap: 12,
    alignItems: "center",
  },

  playButton: {
    border: "1px solid #00ff88",
    borderRadius: 14,
    background: "linear-gradient(180deg,#00c853,#003d14)",
    color: "#fff",
    padding: "14px 16px",
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: "0 0 18px rgba(0,255,120,.45)",
  },

  pauseButton: {
    border: "1px solid #ff1744",
    borderRadius: 14,
    background: "linear-gradient(180deg,#b00020,#43000c)",
    color: "#fff",
    padding: "14px 16px",
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: "0 0 18px rgba(255,23,68,.45)",
  },

  volumeBox: {
    display: "grid",
    gridTemplateColumns: "34px 1fr 46px",
    gap: 8,
    alignItems: "center",
  },

  volumeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: 900,
  },

  slider: {
    width: "100%",
    accentColor: "#ff1744",
  },

  liveDotOn: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#39ff14",
    boxShadow: "0 0 22px #39ff14",
  },

  liveDotOff: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#ff1744",
    boxShadow: "0 0 18px #ff1744",
  },
};