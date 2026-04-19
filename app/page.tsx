"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type TimeResponse = {
  timezone: string;
  dateLabel: string;
  timeLabel: string;
  speechText: string;
  iso: string;
};

type WeatherResponse = {
  city: string;
  tempC: number;
  feelsLikeC: number;
  humidity: number;
  description: string;
  speechText: string;
  error?: string;
};

type ChatMessage = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

export default function HomePage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState("");

  const [timeData, setTimeData] = useState<TimeResponse | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const [timeStatus, setTimeStatus] = useState("Loading Jamaica time...");
  const [weatherStatus, setWeatherStatus] = useState("Loading weather...");
  const [chatStatus, setChatStatus] = useState("Loading chat...");

  const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL;

  const chatFunctionUrl = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return "";
    return `${url}/functions/v1/chat-service`;
  }, []);

  const togglePlayer = async () => {
    if (!audioRef.current) return;

    if (!streamUrl) {
      setPlayerError("Stream URL is missing.");
      return;
    }

    try {
      setPlayerError("");

      if (audioRef.current.paused) {
        await audioRef.current.play();
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } catch {
      setPlayerError("The stream could not load.");
      setIsPlaying(false);
    }
  };

  const loadTime = async () => {
    try {
      const response = await fetch("/api/time", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as TimeResponse;

      if (!response.ok) {
        setTimeStatus("Could not load time.");
        return;
      }

      setTimeData(result);
      setTimeStatus("Time ready.");
    } catch {
      setTimeStatus("Could not load time.");
    }
  };

  const loadWeather = async () => {
    try {
      const response = await fetch("/api/weather", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as WeatherResponse;

      if (!response.ok) {
        setWeatherStatus(result.error || "Could not load weather.");
        return;
      }

      setWeatherData(result);
      setWeatherStatus("Weather ready.");
    } catch {
      setWeatherStatus("Could not load weather.");
    }
  };

  const loadChat = async () => {
    if (!chatFunctionUrl) {
      setChatStatus("Missing NEXT_PUBLIC_SUPABASE_URL.");
      return;
    }

    try {
      const response = await fetch(chatFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "list" }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setChatStatus(result?.error || `HTTP ${response.status}`);
        return;
      }

      const rows = Array.isArray(result?.messages) ? result.messages : [];
      setChatMessages(rows.slice(-3).reverse());
      setChatStatus(`Loaded ${rows.length} messages.`);
    } catch (error) {
      setChatStatus(
        `Load error: ${error instanceof Error ? error.message : "Failed to fetch"}`
      );
    }
  };

  const readText = (text: string) => {
    if (!("speechSynthesis" in window)) return false;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
    return true;
  };

  const readTime = async () => {
    try {
      const response = await fetch("/api/time", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as TimeResponse;

      if (!response.ok) {
        setTimeStatus("Could not read time.");
        return;
      }

      setTimeData(result);
      const ok = readText(result.speechText);
      setTimeStatus(ok ? "Time announcement played." : "Voice reading not supported.");
    } catch {
      setTimeStatus("Could not read time.");
    }
  };

  const readWeather = async () => {
    try {
      const response = await fetch("/api/weather", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as WeatherResponse;

      if (!response.ok) {
        setWeatherStatus(result.error || "Could not read weather.");
        return;
      }

      setWeatherData(result);
      const ok = readText(result.speechText);
      setWeatherStatus(
        ok ? "Weather announcement played." : "Voice reading not supported."
      );
    } catch {
      setWeatherStatus("Could not read weather.");
    }
  };

  useEffect(() => {
    loadTime();
    loadWeather();
    loadChat();

    const timeTimer = window.setInterval(loadTime, 10000);
    const weatherTimer = window.setInterval(loadWeather, 300000);
    const chatTimer = window.setInterval(loadChat, 8000);

    return () => {
      window.clearInterval(timeTimer);
      window.clearInterval(weatherTimer);
      window.clearInterval(chatTimer);
    };
  }, [chatFunctionUrl]);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-16">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-red-500">
          Live From Tha Core
        </p>

        <h1 className="text-4xl font-black tracking-tight sm:text-6xl md:text-7xl">
          Tha Core Radio
        </h1>

        <p className="mt-6 max-w-3xl text-lg text-zinc-300">
          Live radio, real vibes, community energy, listener chat, uploads,
          time reads, weather reads, and station tools — all in one place.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <button
            onClick={togglePlayer}
            className="rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500"
          >
            {isPlaying ? "Pause Live" : "Play Live"}
          </button>

          <a
            href="/chat"
            className="rounded-2xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
          >
            Join Community
          </a>

          <a
            href="/upload"
            className="rounded-2xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
          >
            Uploads
          </a>

          <a
            href="/time-reader"
            className="rounded-2xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
          >
            Time Reader
          </a>

          <a
            href="/weather-reader"
            className="rounded-2xl border border-white/15 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
          >
            Weather Reader
          </a>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6 lg:col-span-2">
            <h2 className="text-2xl font-bold">Live Player</h2>
            <p className="mt-3 text-zinc-400">
              Press play to test your station stream.
            </p>

            <audio
              ref={audioRef}
              src={streamUrl}
              preload="none"
              controls
              className="mt-4 w-full"
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onError={() => setPlayerError("The stream could not load.")}
            />

            <div className="mt-6 flex flex-wrap gap-4">
              <button
                onClick={togglePlayer}
                className="rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500"
              >
                {isPlaying ? "Pause Live" : "Play Live"}
              </button>

              <a
                href="/chat"
                className="rounded-2xl border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                Open Chat
              </a>

              {streamUrl ? (
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
                >
                  Open Stream Direct
                </a>
              ) : null}
            </div>

            {playerError ? (
              <p className="mt-4 text-sm text-red-400">{playerError}</p>
            ) : null}
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-red-400">
              Station Tools
            </p>

            <div className="mt-6 space-y-4">
              <a
                href="/admin/uploads"
                className="block rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                Admin Upload Review
              </a>

              <a
                href="/time-reader"
                className="block rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                Open Time Reader
              </a>

              <a
                href="/weather-reader"
                className="block rounded-2xl border border-white/10 px-4 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                Open Weather Reader
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-red-400">
              Jamaica Time
            </p>

            <h3 className="mt-4 text-4xl font-black">
              {timeData ? timeData.timeLabel : "--:--:--"}
            </h3>

            <p className="mt-3 text-zinc-300">
              {timeData ? timeData.dateLabel : "Loading time..."}
            </p>

            <p className="mt-2 text-sm text-zinc-500">{timeStatus}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={readTime}
                className="rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500"
              >
                Read Time
              </button>

              <a
                href="/time-reader"
                className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                Full Page
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-red-400">
              Jamaica Weather
            </p>

            <h3 className="mt-4 text-4xl font-black">
              {weatherData ? `${Math.round(weatherData.tempC)}°C` : "--"}
            </h3>

            <p className="mt-3 text-zinc-300">
              {weatherData
                ? `${weatherData.city}, ${weatherData.description}`
                : "Loading weather..."}
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              {weatherData
                ? `Feels like ${Math.round(weatherData.feelsLikeC)}°C • Humidity ${weatherData.humidity}%`
                : weatherStatus}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={readWeather}
                className="rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500"
              >
                Read Weather
              </button>

              <a
                href="/weather-reader"
                className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
              >
                Full Page
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm uppercase tracking-[0.3em] text-red-400">
              Community Chat
            </p>

            <h3 className="mt-4 text-2xl font-black">
              {chatMessages.length} recent messages
            </h3>

            <p className="mt-2 text-sm text-zinc-500">{chatStatus}</p>

            <div className="mt-6 space-y-3">
              {chatMessages.length === 0 ? (
                <p className="text-zinc-500">No chat messages yet.</p>
              ) : (
                chatMessages.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">{item.name}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(item.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <p className="mt-2 text-zinc-300">{item.message}</p>
                  </div>
                ))
              )}
            </div>

            <a
              href="/chat"
              className="mt-6 inline-block rounded-2xl border border-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/5"
            >
              Open Full Chat
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}