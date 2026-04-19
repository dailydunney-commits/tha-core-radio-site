"use client";

import { useEffect, useRef, useState } from "react";

type TimeResponse = {
  timezone: string;
  dateLabel: string;
  timeLabel: string;
  speechText: string;
  iso: string;
};

export default function TimeReaderPage() {
  const [timeData, setTimeData] = useState<TimeResponse | null>(null);
  const [status, setStatus] = useState("Loading Jamaica time...");
  const [loading, setLoading] = useState(true);
  const [autoRead, setAutoRead] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState("15");
  const autoReadTimer = useRef<number | null>(null);

  const loadTime = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/time", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as TimeResponse;

      if (!response.ok) {
        setStatus("Could not load time.");
        setLoading(false);
        return;
      }

      setTimeData(result);
      setStatus("Jamaica time loaded.");
      setLoading(false);
    } catch {
      setStatus("Could not load time.");
      setLoading(false);
    }
  };

  const readTime = async () => {
    try {
      const response = await fetch("/api/time", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as TimeResponse;

      if (!response.ok) {
        setStatus("Could not read time.");
        return;
      }

      setTimeData(result);

      if (!("speechSynthesis" in window)) {
        setStatus("This browser does not support voice reading.");
        return;
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(result.speechText);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
      setStatus("Time announcement played.");
    } catch {
      setStatus("Could not read time.");
    }
  };

  useEffect(() => {
    loadTime();

    const refreshTimer = window.setInterval(() => {
      loadTime();
    }, 10000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (autoReadTimer.current) {
      window.clearInterval(autoReadTimer.current);
      autoReadTimer.current = null;
    }

    if (autoRead) {
      const ms = Number(intervalMinutes) * 60 * 1000;

      autoReadTimer.current = window.setInterval(() => {
        readTime();
      }, ms);

      setStatus(`Auto read enabled every ${intervalMinutes} minutes.`);
    } else {
      setStatus("Auto read off.");
    }

    return () => {
      if (autoReadTimer.current) {
        window.clearInterval(autoReadTimer.current);
        autoReadTimer.current = null;
      }
    };
  }, [autoRead, intervalMinutes]);

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Back Home
          </a>

          <a
            href="/chat"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Go To Chat
          </a>

          <a
            href="/upload"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Go To Uploads
          </a>
        </div>

        <h1 className="mt-8 text-4xl font-black">Tha Core Time Reader</h1>

        <p className="mt-3 max-w-2xl text-zinc-400">
          Live Jamaica time with voice reading for website and app use.
        </p>

        <p className="mt-4 text-sm text-red-400">{status}</p>

        <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-red-400">
            Jamaica Time
          </p>

          <h2 className="mt-4 text-5xl font-black">
            {loading || !timeData ? "--:--:--" : timeData.timeLabel}
          </h2>

          <p className="mt-3 text-lg text-zinc-300">
            {loading || !timeData ? "Loading date..." : timeData.dateLabel}
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Timezone: {timeData?.timezone || "America/Jamaica"}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={readTime}
              className="rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500"
            >
              Read Time
            </button>

            <button
              type="button"
              onClick={loadTime}
              className="rounded-2xl border border-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
            >
              Refresh Time
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-8">
          <h3 className="text-2xl font-bold">Auto Read</h3>

          <p className="mt-3 text-zinc-400">
            Turn on automatic time announcements for your site or app screen.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={autoRead}
                onChange={(e) => setAutoRead(e.target.checked)}
                className="h-5 w-5"
              />
              <span className="text-white">Enable auto read</span>
            </label>

            <select
              value={intervalMinutes}
              onChange={(e) => setIntervalMinutes(e.target.value)}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
            >
              <option value="1">Every 1 minute</option>
              <option value="5">Every 5 minutes</option>
              <option value="15">Every 15 minutes</option>
              <option value="30">Every 30 minutes</option>
              <option value="60">Every 60 minutes</option>
            </select>
          </div>
        </div>
      </div>
    </main>
  );
}