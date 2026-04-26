"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type RadioContextValue = {
  isPlaying: boolean;
  volume: number;
  streamUrl: string;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  setVolume: (value: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
};

const RadioContext = createContext<RadioContextValue | null>(null);

const STREAM_URL =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

const VOLUME_KEY = "tha-core-radio-volume";

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.9);

  useEffect(() => {
    const audio = new Audio(STREAM_URL);

    audio.preload = "none";
    audio.crossOrigin = "anonymous";
    audio.volume = volume;

    audio.addEventListener("playing", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("ended", () => setIsPlaying(false));
    audio.addEventListener("error", () => setIsPlaying(false));

    audioRef.current = audio;

    const savedVolume = window.localStorage.getItem(VOLUME_KEY);
    if (savedVolume) {
      const parsed = Number(savedVolume);
      if (!Number.isNaN(parsed)) {
        const safeVolume = Math.min(1, Math.max(0, parsed));
        audio.volume = safeVolume;
        setVolumeState(safeVolume);
      }
    }

    return () => {
      audio.pause();
      audio.src = "";
      audio.load();
      audioRef.current = null;
    };
  }, []);

  function setVolume(value: number) {
    const safeVolume = Math.min(1, Math.max(0, value));
    setVolumeState(safeVolume);

    if (audioRef.current) {
      audioRef.current.volume = safeVolume;
    }

    window.localStorage.setItem(VOLUME_KEY, String(safeVolume));
  }

  async function play() {
    if (!audioRef.current) return;

    audioRef.current.src = STREAM_URL;
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
        audioRef,
      }}
    >
      {children}
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