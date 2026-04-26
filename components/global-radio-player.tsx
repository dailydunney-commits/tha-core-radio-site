"use client";

import { useRadio } from "@/components/radio-provider";

export default function GlobalRadioPlayer() {
  const { isPlaying, toggle, volume, setVolume } = useRadio();

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[340px] rounded-3xl border border-red-700 bg-black/95 p-5 text-white shadow-[0_0_45px_rgba(239,68,68,.85)]">
      <p className="text-xs font-black tracking-[0.35em] text-red-400">
        THA CORE RADIO
      </p>

      <h3 className="mt-3 text-2xl font-black">
        Floating Player
      </h3>

      <p className="mt-1 text-sm text-gray-400">
        One-touch live radio control.
        <div className="mt-3 overflow-hidden rounded-xl border border-red-700 bg-black p-2">
          <div className="animate-[marquee_8s_linear_infinite] whitespace-nowrap text-sm font-black text-yellow-400">
            🎵 {artist} — {song} •
          </div>
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
      </p>

      <div className="mt-5 rounded-2xl bg-zinc-950 p-4">
        <p className="text-sm font-black text-red-400">
          {isPlaying ? "LIVE NOW" : "READY"}
        </p>

        <div className="mt-3 flex gap-1">
          {[1,2,3,4,5,6,7,8,9,10].map((bar) => (
            <span
              key={bar}
              className="h-6 w-1 animate-pulse rounded bg-red-500 shadow-[0_0_12px_red]"
            />
          ))}
        </div>

        <button
          onClick={toggle}
          className="mt-5 w-full rounded-xl bg-red-700 px-6 py-4 font-black hover:bg-red-800"
        >
          {isPlaying ? "Pause Radio" : "Play Radio"}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="mt-4 w-full accent-red-600"
        />
      </div>
    </div>
  );
}
