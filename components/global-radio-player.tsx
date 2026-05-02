"use client";

import { useRadio } from "@/components/radio-provider";

export default function GlobalRadioPlayer() {
  const { isPlaying, toggle, volume, setVolume } = useRadio();

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[94%] max-w-5xl -translate-x-1/2 rounded-[2rem] border border-red-500/50 bg-black/90 p-4 text-white shadow-[0_0_35px_rgba(239,68,68,0.45)] backdrop-blur">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.3em] text-red-400">
            Tha Core Online Radio
          </p>

          <div className="mt-1 flex items-center gap-3">
            <span
              className={`h-4 w-4 rounded-full ${
                isPlaying
                  ? "animate-pulse bg-red-500 shadow-[0_0_18px_red]"
                  : "bg-zinc-600"
              }`}
            />

            <h3 className="text-xl font-black">
              {isPlaying ? "ON AIR LIVE" : "READY TO GO LIVE"}
            </h3>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 md:max-w-lg">
          <button
            onClick={toggle}
            className={`rounded-2xl px-6 py-4 text-lg font-black shadow-lg transition ${
              isPlaying
                ? "bg-zinc-800 hover:bg-zinc-700"
                : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {isPlaying ? "STOP LISTENING" : "PLAY LIVE / GO ON AIR"}
          </button>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-zinc-400">VOL</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-red-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
}