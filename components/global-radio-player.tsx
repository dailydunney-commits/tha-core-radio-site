"use client";

import { useEffect, useState } from "react";
import { useRadio } from "@/components/radio-provider";

export default function GlobalRadioPlayer() {
  const { isPlaying, toggle, volume, setVolume } = useRadio();

  const [song, setSong] = useState("Tha Core Live Mix");
  const [artist, setArtist] = useState("Live From Tha Core");

  useEffect(() => {
    async function loadNowPlaying() {
      try {
        const res = await fetch("/api/now-playing", {
          cache: "no-store",
        });

        const data = await res.json();

        setSong(data.song || "Tha Core Live Mix");
        setArtist(data.artist || "Live From Tha Core");
      } catch {
        setSong("Tha Core Live Mix");
        setArtist("Live From Tha Core");
      }
    }

    loadNowPlaying();

    const timer = setInterval(loadNowPlaying, 15000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] rounded-3xl border border-red-700 bg-zinc-950 p-5 shadow-[0_0_40px_rgba(255,0,0,.35)]">
      <p className="text-sm font-black tracking-[0.35em] text-red-400">
        THA CORE RADIO
      </p>

      <h2 className="mt-2 text-3xl font-black text-white">
        Floating Player
      </h2>

      <p className="mt-1 text-gray-400">
        One-touch live radio control.
      </p>

      <div className="mt-3 overflow-hidden rounded-xl border border-red-700 bg-black p-2">
        <div className="animate-[marquee_8s_linear_infinite] whitespace-nowrap text-sm font-black text-yellow-400">
          🎵 {artist} — {song} •
        </div>
      </div>

      <button
        onClick={toggle}
        className="mt-4 w-full rounded-2xl bg-red-700 px-5 py-4 font-black text-white hover:bg-red-800"
      >
        {isPlaying ? "Pause Live" : "Play Live"}
      </button>

      <div className="mt-4">
        <p className="mb-2 text-sm font-black text-gray-400">
          Volume
        </p>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}