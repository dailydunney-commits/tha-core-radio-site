"use client";

import { useRadio } from "@/components/radio-provider";

export function RadioControls() {
  const { isPlaying, toggle, volume, setVolume } = useRadio();

  return (
    <div
      style={{
        width: "100%",
        border: "1px solid #ff1744",
        borderRadius: 18,
        padding: 12,
        background: "linear-gradient(180deg,#140005,#000)",
        boxShadow: "0 0 25px rgba(255,23,68,.35)",
        color: "#fff",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          gap: 12,
          alignItems: "center",
        }}
      >
        <button
          type="button"
          onClick={toggle}
          style={{
            border: isPlaying ? "1px solid #ff1744" : "1px solid #00ff88",
            borderRadius: 12,
            background: isPlaying
              ? "linear-gradient(180deg,#b00020,#43000c)"
              : "linear-gradient(180deg,#00c853,#003d14)",
            color: "#fff",
            padding: "12px 14px",
            fontWeight: 1000,
            cursor: "pointer",
          }}
        >
          {isPlaying ? "PAUSE LIVE" : "PLAY LIVE"}
        </button>

        <div>
          <p
            style={{
              margin: "0 0 6px",
              fontSize: 12,
              fontWeight: 900,
              color: "#fff",
            }}
          >
            VOL {Math.round(volume * 100)}%
          </p>

          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            style={{
              width: "100%",
              accentColor: "#ff1744",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default RadioControls;