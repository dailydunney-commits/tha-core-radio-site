"use client";

import { useRadio } from "@/components/radio-provider";

type RadioControlsProps = {
  compact?: boolean;
  showVolume?: boolean;
  title?: string;
};

function EqualizerBar({
  active,
  delay,
}: {
  active: boolean;
  delay: string;
}) {
  return (
    <span
      className={`inline-block w-1 rounded-full bg-red-500 ${
        active ? "animate-eq" : ""
      }`}
      style={{
        height: "10px",
        animationDelay: delay,
        animationDuration: "0.9s",
      }}
    />
  );
}

export default function RadioControls({
  compact = false,
  showVolume = true,
  title = "Tha Core Online Radio",
}: RadioControlsProps) {
  const { isPlaying, toggle, volume, setVolume, streamUrl } = useRadio();

  return (
    <>
      <style jsx global>{`
        @keyframes eqBounce {
          0%,
          100% {
            height: 10px;
            opacity: 0.5;
          }
          25% {
            height: 28px;
            opacity: 1;
          }
          50% {
            height: 16px;
            opacity: 0.8;
          }
          75% {
            height: 34px;
            opacity: 1;
          }
        }

        .animate-eq {
          animation-name: eqBounce;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}</style>

      <div
        className={`rounded-3xl border border-white/10 bg-black/20 ${
          compact ? "p-4" : "p-6"
        }`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-red-400">
              Now Streaming
            </p>
            <p className={`${compact ? "text-xl" : "text-3xl"} mt-2 font-black`}>
              {title}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-2 text-xs font-semibold ${
              isPlaying
                ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                : "border border-zinc-700 bg-zinc-800 text-zinc-400"
            }`}
          >
            {isPlaying ? "Live" : "Paused"}
          </span>
        </div>

        <div className="mb-4 flex items-end gap-1">
          <EqualizerBar active={isPlaying} delay="0s" />
          <EqualizerBar active={isPlaying} delay="0.1s" />
          <EqualizerBar active={isPlaying} delay="0.2s" />
          <EqualizerBar active={isPlaying} delay="0.3s" />
          <EqualizerBar active={isPlaying} delay="0.4s" />
          <EqualizerBar active={isPlaying} delay="0.5s" />
        </div>

        <button
          type="button"
          onClick={toggle}
          className="w-full rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
        >
          {isPlaying ? "Pause Radio" : "Play Radio"}
        </button>

        {showVolume ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
              <span>Volume Mixer</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full accent-red-500"
            />
          </div>
        ) : null}

        {!compact ? (
          <p className="mt-3 break-all text-xs text-zinc-500">{streamUrl}</p>
        ) : null}
      </div>
    </>
  );
}