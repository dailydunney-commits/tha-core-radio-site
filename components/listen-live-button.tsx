"use client";

import { useRadio } from "@/components/radio-provider";

export default function ListenLiveButton() {
  const { play, isPlaying } = useRadio();

  return (
    <button
      type="button"
      onClick={play}
      className="rounded-2xl bg-red-700 p-5 text-center font-bold text-white shadow-lg hover:bg-red-600"
    >
      {isPlaying ? "Playing Live" : "Listen Live"}
    </button>
  );
}