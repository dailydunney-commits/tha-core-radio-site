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
  "http://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

const VOLUME_KEY = "tha-core-radio-volume";

async function sendAzuraAction(action: string) {
  try {
    await fetch("/api/azuracast/control", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });
  } catch {
    // Do not block player if control API fails
  }
}

export function RadioProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.85);

  useEffect(() => {
    const saved = window.localStorage.getItem(VOLUME_KEY);
    if (saved) {
      const parsed = Number(saved);
      if (!Number.isNaN(parsed)) {
        setVolumeState(parsed);
      }
    }
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
    window.localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  async function play() {
    if (!audioRef.current) return;

    await sendAzuraAction("go_on_air");

    audioRef.current.src = STREAM_URL;
    audioRef.current.load();

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error("Radio play failed:", error);
      setIsPlaying(false);
    }
  }

  function pause() {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setIsPlaying(false);

    // This only stops listener playback.
    // It does NOT stop AzuraCast broadcast.
  }

  async function toggle() {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  }

  function setVolume(value: number) {
    const clean = Math.min(1, Math.max(0, value));
    setVolumeState(clean);
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

      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
    </RadioContext.Provider>
  );
}

export function useRadio() {
  const ctx = useContext(RadioContext);

  if (!ctx) {
    throw new Error("useRadio must be used inside RadioProvider");
  }

  return ctx;
}