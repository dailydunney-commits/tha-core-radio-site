"use client";

import React, { createContext, useContext, useRef, useState } from "react";

const STREAM_URL =
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

type RadioContextValue = {
  isPlaying: boolean;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
};

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function play() {
    if (!audioRef.current) return;

    audioRef.current.src = STREAM_URL;
    audioRef.current.volume = 0.9;
    audioRef.current.load();

    await audioRef.current.play();
    setIsPlaying(true);
  }

  function pause() {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setIsPlaying(false);
  }

  async function toggle() {
    if (isPlaying) {
      pause();
      return;
    }

    await play();
  }

  return (
    <RadioContext.Provider value={{ isPlaying, play, pause, toggle }}>
      {children}

      <audio
        ref={audioRef}
        src={STREAM_URL}
        preload="none"
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const context = useContext(RadioContext);

  if (!context) {
    throw new Error("useRadio must be used inside RadioProvider");
  }

  return context;
}
