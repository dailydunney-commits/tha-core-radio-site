"use client";

import { useRef, useState } from "react";

const STREAM_URL =
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

export default function PlayLiveButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function toggleRadio() {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(STREAM_URL);
        audioRef.current.preload = "none";
        audioRef.current.volume = 0.9;
      }

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      audioRef.current.src = STREAM_URL;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Radio play error:", error);
      window.open(STREAM_URL, "_blank");
    }
  }

  return (
    <button
      type="button"
      onClick={toggleRadio}
      className="rounded-2xl bg-red-700 px-5 py-4 text-center font-black text-white hover:bg-red-800"
    >
      {isPlaying ? "Pause Live" : "Play Live"}
    </button>
  );
}
