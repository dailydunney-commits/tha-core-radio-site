"use client";

import { useRadio } from "@/components/radio-provider";

export default function PlayLiveButton() {
  const { isPlaying, toggle } = useRadio();

  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        border: isPlaying ? "1px solid #ff1744" : "1px solid #00ff88",
        borderRadius: 999,
        background: isPlaying
          ? "linear-gradient(180deg,#b00020,#43000c)"
          : "linear-gradient(180deg,#00c853,#003d14)",
        color: "#fff",
        padding: "12px 18px",
        fontWeight: 1000,
        cursor: "pointer",
        boxShadow: isPlaying
          ? "0 0 18px rgba(255,23,68,.45)"
          : "0 0 18px rgba(0,255,120,.45)",
      }}
    >
      {isPlaying ? "Pause Live" : "Play Live"}
    </button>
  );
}