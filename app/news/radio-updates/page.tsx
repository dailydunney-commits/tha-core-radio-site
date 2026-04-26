"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NewsItem = {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  description: string;
};

export default function NewsCategoryPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadNews() {
    setLoading(true);

    try {
      const res = await fetch("/api/news?category=radio-updates", {
        cache: "no-store",
      });

      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setItems([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadNews();
    const timer = setInterval(loadNews, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  const tickerText =
    items.length > 0
      ? items.map((item) => item.title).join("  â€¢  ")
      : "Loading live Radio Updates headlines...";

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <style>{
          @keyframes categoryNewsTicker {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        }</style>

        <div className="flex flex-wrap gap-3">
          <Link href="/news" className="rounded-2xl bg-red-600 px-5 py-3 font-black hover:bg-red-700">
            â† Back To News
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
          <p className="text-sm font-black tracking-[0.4em]">RADIO â€¢ BROADCASTING</p>
          <h1 className="mt-3 text-5xl font-black md:text-7xl">Radio Updates</h1>
          <p className="mt-4 max-w-3xl text-lg font-bold">Live radio, music, broadcasting, and media updates.</p>
          <p className="mt-3 text-sm font-black">Auto-refreshes every 15 minutes.</p>
        </div>

        <div className="mt-6 rounded-3xl border border-red-700 bg-zinc-950 p-5 shadow-[0_0_45px_rgba(34,197,94,.45)]">
          <p className="text-sm font-black tracking-[0.35em] text-red-400">
            LIVE Radio Updates TICKER
          </p>

          <div className="mt-3 overflow-hidden rounded-2xl border border-red-700 bg-black p-3">
            <div
              className="animate-[marquee_35s_linear_infinite] whitespace-nowrap text-lg font-black text-yellow-400"
            >
              {tickerText}
            </div>
          </div>
        </div>

        <button
          onClick={loadNews}
          className="mt-6 rounded-xl bg-red-700 px-6 py-4 font-black hover:bg-red-800"
        >
          Refresh Radio Updates
        </button>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-red-700 bg-zinc-950 p-6 text-2xl font-black text-yellow-400">
            Loading live stories...
          </div>
        ) : (
          <div className="mt-8 grid gap-5">
            {items.map((item, index) => (
              <button
                key={item.title + index}
                onClick={() => setSelected(item)}
                className="block rounded-3xl border border-red-700 bg-zinc-950 p-6 text-left shadow-[0_0_35px_rgba(34,197,94,.35)] hover:bg-red-950/40"
              >
                <p className="text-sm font-black tracking-[0.3em] text-red-400">
                  LIVE UPDATE {index + 1}
                </p>

                <h2 className="mt-3 text-2xl font-black text-white">
                  {item.title}
                </h2>

                <p className="mt-3 line-clamp-3 text-gray-300">
                  {item.description}
                </p>

                <p className="mt-3 text-sm text-gray-400">
                  Source: {item.source}
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  {item.pubDate}
                </p>

                <p className="mt-4 font-black text-red-400">
                  Read Here â†’
                </p>
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
            <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-red-700 bg-zinc-950 p-8 shadow-[0_0_65px_rgba(34,197,94,.65)]">
              <button
                onClick={() => setSelected(null)}
                className="mb-6 rounded-xl bg-red-700 px-5 py-3 font-black"
              >
                Close
              </button>

              <p className="text-sm font-black tracking-[0.35em] text-red-400">
                THA CORE LIVE NEWS
              </p>

              <h2 className="mt-4 text-4xl font-black text-white">
                {selected.title}
              </h2>

              <p className="mt-4 text-sm font-bold text-gray-400">
                {selected.source} â€¢ {selected.pubDate}
              </p>

              <div className="mt-6 rounded-2xl bg-black p-6">
                <p className="text-lg leading-8 text-gray-200">
                  {selected.description}
                </p>
              </div>

              <p className="mt-6 text-sm text-gray-500">
                Story summary shown inside Tha Core so visitors stay on the site.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}