"use client";

import React, { createContext, useContext, useRef, useState } from "react";

const STREAM_URL =
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

type RadioContextValue = {
  isPlaying: boolean;
  volume: number;
  streamUrl: string;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  setVolume: (value: number) => void;
};

const RadioContext = createContext<RadioContextValue | null>(null);

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.9);

  function setVolume(value: number) {
    const safeVolume = Math.min(1, Math.max(0, value));
    setVolumeState(safeVolume);

    if (audioRef.current) {
      audioRef.current.volume = safeVolume;
    }
  }

  async function play() {
    if (!audioRef.current) return;

    audioRef.current.src = STREAM_URL;
    audioRef.current.volume = volume;
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
    <RadioContext.Provider
      value={{
        isPlaying,
        volume,
        streamUrl: STREAM_URL,
        play,
        pause,
        toggle,
        setVolume,
      }}
    >
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