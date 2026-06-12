"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type NowPlayingResponse = {
  audioUrl?: string;
  streamUrl?: string;
  listen_url?: string;
  cleanAudioUrl?: string;
  title?: string;
  artist?: string;
  message?: string;
  listeners?: {
    total?: number;
    current?: number;
  };
  station?: {
    listen_url?: string;
    mounts?: Array<{
      url?: string;
      is_default?: boolean;
    }>;
  };
  now_playing?: {
    song?: {
      text?: string;
      title?: string;
      artist?: string;
    };
    playlist?: string;
  };
};

function pickTitle(data: NowPlayingResponse | null) {
  return (
    data?.now_playing?.song?.text ||
    [data?.artist, data?.title].filter(Boolean).join(" - ") ||
    data?.title ||
    "Current Broadcast"
  );
}

function hasAudio(data: NowPlayingResponse | null) {
  return Boolean(
    data?.listen_url ||
      data?.streamUrl ||
      data?.audioUrl ||
      data?.cleanAudioUrl ||
      data?.station?.listen_url ||
      data?.station?.mounts?.find((mount) => mount?.is_default)?.url ||
      data?.station?.mounts?.[0]?.url
  );
}

export default function PersistentRadioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [title, setTitle] = useState("Current Broadcast");
  const [volume, setVolume] = useState(0.85);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusText, setStatusText] = useState("Ready to play current broadcast");
  const [listeners, setListeners] = useState(0);

  const pushGlobalState = useCallback(
    (next?: Partial<{ isPlaying: boolean; message: string; nowPlaying: string; listeners: number }>) => {
      window.dispatchEvent(
        new CustomEvent("tha-core-radio-state", {
          detail: {
            isPlaying: next?.isPlaying ?? isPlaying,
            message: next?.message ?? statusText,
            nowPlaying: next?.nowPlaying ?? title,
            listeners: next?.listeners ?? listeners,
          },
        })
      );
    },
    [isPlaying, statusText, title, listeners]
  );

  const refreshNowPlaying = useCallback(async () => {
    const res = await fetch(`/api/listener/now-playing?fresh=${Date.now()}`, {
      cache: "no-store",
    });

    const data = (await res.json()) as NowPlayingResponse;
    const nextTitle = pickTitle(data);
    const nextListeners = data?.listeners?.current ?? data?.listeners?.total ?? 0;
    const nextStatus = hasAudio(data)
      ? data.message || "Current broadcast audio ready"
      : data.message || "Waiting for owner/control panel current broadcast";

    setTitle(nextTitle);
    setListeners(nextListeners);
    setStatusText(nextStatus);

    window.dispatchEvent(
      new CustomEvent("tha-core-radio-state", {
        detail: {
          isPlaying: audioRef.current ? !audioRef.current.paused : false,
          message: nextStatus,
          nowPlaying: nextTitle,
          listeners: nextListeners,
        },
      })
    );

    return data;
  }, []);

  useEffect(() => {
    refreshNowPlaying().catch(() => {
      setStatusText("Waiting for current broadcast");
    });

    const timer = window.setInterval(() => {
      refreshNowPlaying().catch(() => {});
    }, 5000);

    return () => window.clearInterval(timer);
  }, [refreshNowPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  async function playCurrentBroadcast() {
    const audio = audioRef.current;

    if (!audio) {
      setStatusText("Audio player is not ready.");
      return;
    }

    try {
      const liveUrl = `/api/listener/live-current-audio?fresh=${Date.now()}`;

      // Important: do not await fetch before play().
      // Keep audio.play() inside the user click chain.
      audio.src = liveUrl;
      audio.volume = volume;
      audio.load();

      setStatusText("Starting current broadcast...");
      pushGlobalState({ message: "Starting current broadcast..." });

      await audio.play();

      setIsPlaying(true);
      setStatusText("Playing current broadcast");
      pushGlobalState({
        isPlaying: true,
        message: "Playing current broadcast",
      });

      void refreshNowPlaying();
    } catch (error) {
      console.error("PLAY_CURRENT_BROADCAST_FAILED", error);
      setIsPlaying(false);
      setStatusText("Play failed. Check browser console/audio permission.");
      pushGlobalState({
        isPlaying: false,
        message: "Play failed. Check browser console/audio permission.",
      });
    }
  }

  function pauseLocalAudio() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    setStatusText("Paused by listener");
    pushGlobalState({
      isPlaying: false,
      message: "Paused by listener",
    });
  }

  useEffect(() => {
    function handleToggle() {
      const audio = audioRef.current;

      if (audio && !audio.paused) {
        pauseLocalAudio();
        return;
      }

      void playCurrentBroadcast();
    }

    function handleStop() {
      pauseLocalAudio();
    }

    function handleVolume(event: Event) {
      const detail = (event as CustomEvent).detail || {};
      const nextVolume = Number(detail.volume);

      if (!Number.isFinite(nextVolume)) return;

      const safeVolume = Math.max(0, Math.min(1, nextVolume));
      setVolume(safeVolume);

      if (audioRef.current) {
        audioRef.current.volume = safeVolume;
      }
    }

    window.addEventListener("tha-core-radio-toggle", handleToggle);
    window.addEventListener("tha-core-radio-stop", handleStop);
    window.addEventListener("tha-core-radio-volume", handleVolume);

    return () => {
      window.removeEventListener("tha-core-radio-toggle", handleToggle);
      window.removeEventListener("tha-core-radio-stop", handleStop);
      window.removeEventListener("tha-core-radio-volume", handleVolume);
    };
  }, [volume]);

  useEffect(() => {
    pushGlobalState();
  }, [pushGlobalState]);

  return (
    <div
      style={{
        position: "fixed",
        left: 14,
        right: 14,
        bottom: 14,
        zIndex: 999999,
        minHeight: 92,
        border: "1px solid #ff1744",
        borderRadius: 22,
        background: "linear-gradient(180deg, rgba(20,0,5,.98), rgba(0,0,0,.98))",
        boxShadow: "0 0 35px rgba(255,23,68,.45)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 16,
        alignItems: "center",
        padding: "14px 18px",
        color: "#fff",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <audio
        ref={audioRef}
        preload="none"
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: isPlaying ? "#00ff88" : "#ff1744",
            boxShadow: isPlaying ? "0 0 18px #00ff88" : "0 0 18px #ff1744",
          }}
        />
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, color: "#ff1744", fontSize: 13, fontWeight: 1000, letterSpacing: 2 }}>
            THA CORE ONLINE RADIO
          </p>
          <p
            style={{
              margin: "4px 0",
              color: "#fff",
              fontSize: 18,
              fontWeight: 1000,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "60vw",
            }}
          >
            {title}
          </p>
          <p style={{ margin: 0, color: "#cfcfcf", fontSize: 12, fontWeight: 700 }}>
            {statusText} - Listeners: {listeners}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "160px 260px", gap: 12, alignItems: "center" }}>
        <button
          type="button"
          onClick={playCurrentBroadcast}
          style={{
            border: "1px solid #00ff88",
            borderRadius: 14,
            background: "linear-gradient(180deg,#00c853,#003d14)",
            color: "#fff",
            padding: "14px 16px",
            fontWeight: 1000,
            cursor: "pointer",
            boxShadow: "0 0 18px rgba(0,255,120,.45)",
          }}
        >
          {isPlaying ? "PLAYING" : "PLAY LIVE"}
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "34px 1fr 46px", gap: 8, alignItems: "center" }}>
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>VOL</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
            style={{ width: "100%", accentColor: "#ff1744" }}
          />
          <span style={{ color: "#fff", fontSize: 12, fontWeight: 900 }}>{Math.round(volume * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
