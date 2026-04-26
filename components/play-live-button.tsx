"use client";

import { useRadio } from "@/components/radio-provider";

export default function PlayLiveButton() {
  const { isPlaying, toggle } = useRadio();

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-2xl bg-red-700 px-5 py-4 text-center font-black text-white hover:bg-red-800"
    >
      {isPlaying ? "Pause Live" : "Play Live"}
    </button>
  );
}
