"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const STREAM_URL = "";

export default function PersistentRadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

// SMARTZJ_MINI_AUTONEXT_PLAYER_V1
  async function playNextSmartZjCleanTrack(kickWatchdog = false) {
  const audio = audioRef.current;
  if (!audio) return;

  if ((audio as any).__smartZjAutoNextLock) return;
  (audio as any).__smartZjAutoNextLock = true;

  window.setTimeout(() => {
    if (audio) {
      (audio as any).__smartZjAutoNextLock = false;
    }
  }, 2500);

  try {
    if (kickWatchdog) {
      setMessage("Asking SmartZJ watchdog for the next clean broadcast...");
      // PUBLIC_PLAYERS_FOLLOW_ONLY_V1: public players do not advance SmartZJ.
    }

    setMessage("Syncing to SmartZJ broadcast...");

    const response = await fetch(`/api/listener/now-playing?persistentSync=${Date.now()}`, {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    const currentBroadcast = data?.currentBroadcast || {};

    const nextUrl = String(
      data?.streamUrl ||
        data?.audioUrl ||
        data?.listen_url ||
        currentBroadcast?.audioUrl ||
        ""
    ).trim();

    const startedAt = String(
      currentBroadcast?.startedAt ||
        data?.live?.broadcast_start ||
        ""
    );

    if (!nextUrl) {
      audio.pause();
      setIsPlaying(false);
      setMessage("Waiting for SmartZJ broadcast brain...");
      return;
    }

    const absoluteNextUrl = new URL(nextUrl, window.location.origin).href;

    if (!audio.src || audio.src !== absoluteNextUrl) {
      audio.src = nextUrl;
      audio.load();
    }

    if (audio.readyState < 1) {
      await new Promise<void>((resolve) => {
        let done = false;

        const finish = () => {
          if (done) return;
          done = true;
          audio.removeEventListener("loadedmetadata", finish);
          audio.removeEventListener("canplay", finish);
          resolve();
        };

        audio.addEventListener("loadedmetadata", finish);
        audio.addEventListener("canplay", finish);
        window.setTimeout(finish, 1800);
      });
    }

    const started = Date.parse(startedAt);
    if (Number.isFinite(started)) {
      const elapsed = Math.max(0, Math.floor((Date.now() - started) / 1000));
      const duration = Number(audio.duration || 0);
      let target = elapsed;

      if (Number.isFinite(duration) && duration > 5) {
        target = Math.min(elapsed, Math.max(0, duration - 2));
      }

      if (target > 0 && Math.abs(audio.currentTime - target) > 4) {
        audio.currentTime = target;
      }
    }

    audio.volume = volume;
    await audio.play();

    setIsPlaying(true);
    setMessage("Synced to current SmartZJ broadcast");
  } catch {
    audio.pause();
    setIsPlaying(false);
    setMessage("Could not sync to SmartZJ broadcast");
  }
}

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      void playNextSmartZjCleanTrack(true);
    };

    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);


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
        const res = await fetch("/api/listener/now-playing", {
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

  // SMARTZJ_MINI_AUTONEXT_WATCHDOG_DISABLED_STABILITY_V1
  // Disabled because pause/error/near-end watchdog can force early SmartZJ skips.
  // The audio element's normal ended handler remains responsible for moving to the next clean track.
    // FLOATING_PLAYER_CURRENT_BROADCAST_RESYNC_WATCH_V1
  useEffect(() => {
    if (!isPlaying) return;

    let cancelled = false;

    const timer = window.setInterval(() => {
      void (async () => {
        const audio = audioRef.current;
        if (!audio || audio.paused) return;

        const response = await fetch(`/api/listener/now-playing?floatingWatch=${Date.now()}`, {
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);
        const currentBroadcast = data?.currentBroadcast || {};

        const nextUrl = String(
          data?.streamUrl ||
            data?.audioUrl ||
            data?.listen_url ||
            currentBroadcast?.audioUrl ||
            ""
        ).trim();

        if (!nextUrl) return;

        const absoluteNextUrl = new URL(nextUrl, window.location.origin).href;

        if (audio.src === absoluteNextUrl) return;

        setMessage("Broadcast changed. Resyncing...");

        audio.src = nextUrl;
        audio.load();

        await new Promise<void>((resolve) => {
          let done = false;

          const finish = () => {
            if (done) return;
            done = true;
            audio.removeEventListener("loadedmetadata", finish);
            audio.removeEventListener("canplay", finish);
            resolve();
          };

          audio.addEventListener("loadedmetadata", finish);
          audio.addEventListener("canplay", finish);
          window.setTimeout(finish, 1800);
        });

        if (cancelled) return;

        const startedAt = String(
          currentBroadcast?.startedAt ||
            data?.live?.broadcast_start ||
            ""
        );

        const started = Date.parse(startedAt);

        if (Number.isFinite(started)) {
          const elapsed = Math.max(0, Math.floor((Date.now() - started) / 1000));
          const duration = Number(audio.duration || 0);
          let target = elapsed;

          if (Number.isFinite(duration) && duration > 5) {
            target = Math.min(elapsed, Math.max(0, duration - 2));
          }

          if (target > 0 && Math.abs(audio.currentTime - target) > 4) {
            audio.currentTime = target;
          }
        }

        audio.volume = volume;
        await audio.play();

        if (cancelled) return;

        setIsPlaying(true);
        setMessage("Synced to current broadcast");
      })().catch(() => {
        if (!cancelled) setMessage("Could not resync current broadcast");
      });
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isPlaying, volume]);
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

    await playNextSmartZjCleanTrack();
  } catch {
    setIsPlaying(false);
    setMessage("Tap play again or check stream");
  }
}

    // PUBLIC_GLOBAL_AUDIO_ENGINE_V1
  // One public audio engine across homepage, schedule, store, news, chat, and public pages.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("tha-core-radio-state", {
      detail: {
        isPlaying,
        message,
        nowPlaying,
        listeners,
      },
    }));
  }, [isPlaying, message, nowPlaying, listeners]);

  useEffect(() => {
    const handleToggle = () => {
      void togglePlay();
    };

    const handleStop = () => {
      const audio = audioRef.current;

      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      setIsPlaying(false);
      setMessage("Stopped by listener");
    };

    const handleVolume = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const nextVolume = Number(detail.volume);

      if (!Number.isFinite(nextVolume)) return;

      const safeVolume = Math.max(0, Math.min(1, nextVolume));
      setVolume(safeVolume);

      if (audioRef.current) {
        audioRef.current.volume = safeVolume;
      }
    };

    window.addEventListener("tha-core-radio-toggle", handleToggle);
    window.addEventListener("tha-core-radio-stop", handleStop);
    window.addEventListener("tha-core-radio-volume", handleVolume);

    return () => {
      window.removeEventListener("tha-core-radio-toggle", handleToggle);
      window.removeEventListener("tha-core-radio-stop", handleStop);
      window.removeEventListener("tha-core-radio-volume", handleVolume);
    };
  }, [isPlaying, volume]);
function changeVolume(value: number) {
    setVolume(value);

    if (audioRef.current) {
      audioRef.current.volume = value;
    }
  }

  return (
    <div style={styles.player}>
      <audio
      ref={audioRef}
      src={STREAM_URL}
      preload="none"
    />

      <div style={styles.left}>
        <div style={isPlaying ? styles.liveDotOn : styles.liveDotOff} />

        <div style={styles.textWrap}>
          <p style={styles.label}>THA CORE ONLINE RADIO</p>
          <p style={styles.nowPlaying}>{nowPlaying}</p>
          <p style={styles.status}>
            {message} - Listeners: {listeners}
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
