"use client";

import Link from "next/link";
import { useState } from "react";

const newsSections = {
  "World News": [
    "Breaking world stories will show here.",
    "Global headlines, culture, community, and major updates.",
  ],
  "Music & Culture": [
    "Music news, artist updates, dancehall, reggae, hip hop, and culture.",
    "Tha Core music features and community highlights will show here.",
  ],
  Sports: [
    "Sports scores, match updates, and local/international highlights.",
    "More sports stories coming soon.",
  ],
  Business: [
    "Business updates, money moves, printing deals, ads, and opportunities.",
    "Tha Core business announcements will show here.",
  ],
  Weather: [
    "Weather alerts and Jamaica updates.",
    "Use the Weather Reader button for live weather reading.",
  ],
  "Radio Updates": [
    "Station updates, live show announcements, DJ drops, and new features.",
    "Tha Core Radio updates will show here.",
  ],
};

type NewsSection = keyof typeof newsSections;

export default function NewsPage() {
  const [activeSection, setActiveSection] = useState<NewsSection>("World News");

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <Link href="/" className="font-black text-red-400 hover:text-red-300">
          ← Back Home
        </Link>

        <div className="mt-6 rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-8 text-black">
          <h1 className="text-5xl font-black md:text-7xl">News & Updates</h1>
          <p className="mt-4 text-lg font-bold">
            Live news, music, sports, business, weather, and radio updates.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="rounded-2xl bg-red-600 px-5 py-3 font-black">
            Listen Live
          </Link>

          <Link
            href="/store"
            className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600"
          >
            Store
          </Link>

          <Link
            href="/uploads"
            className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600"
          >
            Uploads
          </Link>

          <Link
            href="/time-reader"
            className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600"
          >
            Time Reader
          </Link>

          <Link
            href="/weather-reader"
            className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600"
          >
            Weather Reader
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {(Object.keys(newsSections) as NewsSection[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setActiveSection(item)}
              className={`text-left rounded-3xl border p-6 shadow-[0_0_45px_rgba(34,197,94,.45)] transition ${
                activeSection === item
                  ? "border-red-500 bg-red-950/60"
                  : "border-red-700 bg-zinc-950 hover:bg-red-950/40"
              }`}
            >
              <h2 className="text-3xl font-black text-red-400">{item}</h2>
              <p className="mt-3 text-gray-300">
                Click to view {item} updates below.
              </p>
              <p className="mt-5 font-black text-red-400">Open →</p>
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-red-700 bg-zinc-950 p-8">
          <p className="text-sm tracking-[0.4em] text-red-400">NOW VIEWING</p>

          <h2 className="mt-3 text-4xl font-black text-white">
            {activeSection}
          </h2>

          <div className="mt-6 grid gap-4">
            {newsSections[activeSection].map((story, index) => (
              <div
                key={index}
                className="rounded-2xl border border-white/10 bg-black p-5"
              >
                <p className="text-gray-300">{story}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}