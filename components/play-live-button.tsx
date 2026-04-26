"use client";

import { useRadio } from "@/components/radio-provider";

export default function PlayLiveButton() {
  const { isPlaying, toggle } = useRadio();

  async function handleClick() {
    try {
      await toggle();
    } catch (error) {
      console.error("Radio play failed:", error);
      alert("Audio could not start. Please tap again or refresh the page.");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-2xl bg-red-700 px-5 py-4 text-center font-black text-white hover:bg-red-800"
    >
      {isPlaying ? "Pause Live" : "Play Live"}
    </button>
  );
}
