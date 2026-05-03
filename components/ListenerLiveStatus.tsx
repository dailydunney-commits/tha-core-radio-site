"use client";

import { useEffect, useState } from "react";

type ListenerStatus = {
  listeners: string;
  nowPlaying: string;
};

export default function ListenerLiveStatus() {
  const [status, setStatus] = useState<ListenerStatus>({
    listeners: "0",
    nowPlaying: "Live From Tha Core",
  });

  useEffect(() => {
    let mounted = true;

    async function loadNowPlaying() {
      try {
        const res = await fetch("/api/now-playing", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!mounted) return;

        const listeners =
          data?.listeners?.current ??
          data?.listeners ??
          data?.station?.listeners ??
          "0";

        const nowPlaying =
          data?.now_playing?.song?.text ||
          data?.nowPlaying ||
          data?.song ||
          data?.title ||
          "Live From Tha Core";

        setStatus({
          listeners: String(listeners),
          nowPlaying: String(nowPlaying),
        });
      } catch {
        if (!mounted) return;

        setStatus({
          listeners: "0",
          nowPlaying: "Live From Tha Core",
        });
      }
    }

    loadNowPlaying();

    const timer = window.setInterval(loadNowPlaying, 10000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <span
            key={index}
            style={{
              width: 15,
              height: 15,
              borderRadius: "50%",
              background: "#b58b00",
              boxShadow: "0 0 8px rgba(255, 215, 0, 0.5)",
              display: "inline-block",
            }}
          />
        ))}
      </div>

      <div
        style={{
          border: "1px solid #d50000",
          borderRadius: 12,
          background: "#000",
          color: "#fff",
          padding: "14px 16px",
          fontWeight: 900,
          marginBottom: 14,
        }}
      >
        {status.nowPlaying}
      </div>

      <p
        style={{
          margin: "0 0 16px",
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        Live From Tha Core
      </p>

      <p
        style={{
          margin: 0,
          color: "#ff5c6c",
          fontSize: 26,
          fontWeight: 1000,
        }}
      >
        {status.listeners} listeners online
      </p>
    </div>
  );
}