"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
};

export default function BusinessNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetch("/api/news?category=business")
      .then((res) => res.json())
      .then((data) => setItems(data.items || []));
  }, []);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap gap-3">
          <Link href="/news" className="rounded-2xl bg-red-600 px-5 py-3 font-black hover:bg-red-700">
            ← Back To News
          </Link>

          <Link href="/" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Listen Live
          </Link>

          <Link href="/store" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Store
          </Link>

          <Link href="/weather-reader" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Weather Reader
          </Link>
        </div>

        <div className="mt-8 rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-8 text-black">
          <p className="text-sm font-black tracking-[0.4em]">THA CORE NEWS</p>
          <h1 className="mt-3 text-5xl font-black md:text-7xl">Business</h1>
          <p className="mt-4 max-w-3xl text-lg font-bold">
            Live business updates, money moves, sponsor slots, ads, printing deals, and opportunities.
          </p>
        </div>

        <div className="mt-8 grid gap-5">
          {items.map((item, index) => (
            <a
              key={`${item.title}-${index}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_35px_rgba(34,197,94,.35)] hover:bg-red-950/40"
            >
              <p className="text-sm font-black tracking-[0.3em] text-red-400">
                LIVE UPDATE {index + 1}
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">{item.title}</h2>

              <p className="mt-3 text-gray-300">Source: {item.source}</p>
              <p className="mt-2 text-sm text-gray-400">{item.pubDate}</p>

              <p className="mt-4 font-black text-red-400">Read Full Story →</p>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}