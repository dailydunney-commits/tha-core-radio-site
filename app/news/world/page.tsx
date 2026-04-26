"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
};

export default function WorldNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    fetch("/api/news?category=world")
      .then((res) => res.json())
      .then((data) => setItems(data.items || []));
  }, []);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <Link href="/news" className="rounded-2xl bg-red-600 px-5 py-3 font-black">
          ← Back To News
        </Link>

        <div className="mt-8 rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-8 text-black">
          <p className="text-sm font-black tracking-[0.4em]">THA CORE NEWS</p>
          <h1 className="mt-3 text-5xl font-black md:text-7xl">World News</h1>
          <p className="mt-4 max-w-3xl text-lg font-bold">
            Live world headlines and breaking stories.
          </p>
        </div>

        <div className="mt-8 grid gap-5">
          {items.map((item, index) => (
            <a
              key={`${item.title}-${index}`}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-3xl border border-red-700 bg-zinc-950 p-6 hover:bg-red-950/40"
            >
              <p className="text-sm font-black tracking-[0.3em] text-red-400">
                LIVE UPDATE {index + 1}
              </p>
              <h2 className="mt-3 text-2xl font-black">{item.title}</h2>
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