"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

type RadioContextValue = {
  isPlaying: boolean;
  volume: number;
  streamUrl: string;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  setVolume: (value: number) => void;
  audioRef: RefObject<HTMLAudioElement | null>;
};

const RadioContext = createContext<RadioContextValue | null>(null);

const STREAM_URL =
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

const VOLUME_KEY = "tha-core-radio-volume";

export function RadioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.85);

  useEffect(() => {
    const savedVolume = window.localStorage.getItem(VOLUME_KEY);
    const parsed = savedVolume ? Number(savedVolume) : 0.85;

    if (!Number.isNaN(parsed) && parsed > 0.05) {
      setVolumeState(Math.max(0, Math.min(1, parsed)));
    } else {
      setVolumeState(0.85);
      window.localStorage.setItem(VOLUME_KEY, "0.85");
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
    audio.muted = false;
    window.localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      console.error("Tha Core radio stream error:", audio.error);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);

      // Do NOT pause here.
      // Do NOT call Azura here.
      // Page navigation must not stop visitor audio.
    };
  }, []);

  async function play() {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.muted = false;
      audio.volume = volume > 0.05 ? volume : 0.85;

      if (audio.src !== STREAM_URL) {
        audio.src = STREAM_URL;
        audio.load();
      }

      await audio.play();
      setIsPlaying(true);
    } catch (error) {
      setIsPlaying(false);
      console.error("Could not play Tha Core radio stream:", error);
    }
  }

  function pause() {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  }

  async function toggle() {
    if (isPlaying) {
      pause();
      return;
    }

    await play();
  }

  function setVolume(value: number) {
    const safeValue = Math.max(0, Math.min(1, value));

    setVolumeState(safeValue);

    if (audioRef.current) {
      audioRef.current.volume = safeValue;
      audioRef.current.muted = false;
    }

    window.localStorage.setItem(VOLUME_KEY, String(safeValue));
  }

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
    <RadioContext.Provider value={value}>
      <audio ref={audioRef} src={STREAM_URL} preload="none" playsInline />
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