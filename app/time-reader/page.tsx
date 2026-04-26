"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function TimeReaderPage() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeText = useMemo(() => {
    return now.toLocaleTimeString("en-US", {
      timeZone: "America/Jamaica",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }, [now]);

  const dateText = useMemo(() => {
    return now.toLocaleDateString("en-US", {
      timeZone: "America/Jamaica",
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }, [now]);

  function readTime() {
    window.speechSynthesis.cancel();

    const voice = new SpeechSynthesisUtterance(
      `Live from Tha Core Radio. Jamaica time is now ${timeText}. Today is ${dateText}.`
    );

    voice.rate = 0.9;
    voice.pitch = 1;
    voice.volume = 1;

    window.speechSynthesis.speak(voice);
  }

  function stopReading() {
    window.speechSynthesis.cancel();
  }

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <Link href="/" className="font-black text-red-400 hover:text-red-300">
          ← Back Home
        </Link>

        <h1 className="mt-6 text-5xl font-black">Time Reader</h1>

        <p className="mt-4 text-gray-300">
          Automatic Jamaica time announcements for Tha Core Radio.
        </p>

        <div className="mt-8 rounded-3xl border border-red-700/60 bg-zinc-900 p-6">
          <p className="text-sm tracking-[0.4em] text-red-400">
            JAMAICA TIME
          </p>

          <p className="mt-4 text-5xl font-black md:text-7xl">{timeText}</p>
          <p className="mt-3 text-xl font-bold text-gray-300">{dateText}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={readTime}
              className="rounded-2xl bg-red-600 px-6 py-3 font-black"
            >
              Read Time Out Loud
            </button>

            <button
              onClick={stopReading}
              className="rounded-2xl border border-red-600 px-6 py-3 font-black"
            >
              Stop Reading
            </button>

            <Link
              href="/weather-reader"
              className="rounded-2xl border border-red-600 px-6 py-3 font-black"
            >
              Weather Reader
            </Link>

            <Link
              href="/news"
              className="rounded-2xl border border-red-600 px-6 py-3 font-black"
            >
              News
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
