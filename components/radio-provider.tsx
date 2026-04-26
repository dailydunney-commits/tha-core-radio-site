"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
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
  "https://18.222.11.16/listen/tha-core-online/radio.mp3";

const VOLUME_KEY = "tha-core-radio-volume";

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.8);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audio.crossOrigin = "anonymous";
    audioRef.current = audio;

    try {
      const savedVolume = window.localStorage.getItem(VOLUME_KEY);
      const parsed = savedVolume ? Number(savedVolume) : 0.8;
      const safeVolume = Number.isNaN(parsed) ? 0.8 : parsed;

      audio.volume = safeVolume;
      setVolumeState(safeVolume);
    } catch {
      audio.volume = 0.8;
    }

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setIsPlaying(false);

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, []);

  const play = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.src = STREAM_URL;
      audio.volume = volume;
      audio.load();
      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Radio play failed:", error);
      setIsPlaying(false);
    }
  };

  const pause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await play();
    } else {
      pause();
    }
  };

  const setVolume = (value: number) => {
    const clamped = Math.max(0, Math.min(1, value));
    setVolumeState(clamped);

    const audio = audioRef.current;
    if (audio) {
      audio.volume = clamped;
    }

    try {
      window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {}
  };

  const value = useMemo<RadioContextValue>(
    () => ({
      isPlaying,
      volume,
      streamUrl: STREAM_URL,
      play,
      pause,
      toggle,
      setVolume,
      audioRef,
    }),
    [isPlaying, volume]
  );

  return (
    <RadioContext.Provider value={value}>{children}</RadioContext.Provider>
  );
}

export function useRadio() {
  const context = useContext(RadioContext);

  if (!context) {
    throw new Error("useRadio must be used inside RadioProvider");
  }

  return context;
}