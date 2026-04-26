"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NewsItem = {
  title: string;
  source: string;
  pubDate: string;
  description: string;
  category: string;
};

const sections = [
  { title: "World News", href: "/news/world", category: "world" },
  { title: "Music & Culture", href: "/news/music", category: "music" },
  { title: "Sports", href: "/news/sports", category: "sports" },
  { title: "Business", href: "/news/business", category: "business" },
  { title: "Weather", href: "/news/weather", category: "weather" },
  { title: "Radio Updates", href: "/news/radio-updates", category: "radio-updates" },
];

export default function NewsPage() {
  const [feed, setFeed] = useState<NewsItem[]>([]);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAllNews() {
    setLoading(true);

    const allItems: NewsItem[] = [];

    for (const section of sections) {
      try {
        const res = await fetch(`/api/news?category=${section.category}`, {
          cache: "no-store",
        });

        const data = await res.json();

        const items = (data.items || []).slice(0, 3).map((item: any) => ({
          ...item,
          category: section.title,
        }));

        allItems.push(...items);
      } catch {}
    }

    setFeed(allItems);
    setLoading(false);
  }

  useEffect(() => {
    loadAllNews();
    const timer = setInterval(loadAllNews, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <Link href="/" className="font-black text-red-400 hover:text-red-300">
          ← Back Home
        </Link>

        <div className="mt-6 rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-8 text-black">
          <p className="text-sm font-black tracking-[0.4em]">THA CORE LIVE NEWSROOM</p>

          <h1 className="mt-3 text-5xl font-black md:text-7xl">
            News & Updates
          </h1>

          <p className="mt-4 max-w-4xl text-lg font-bold">
            Live news feed, music, sports, business, weather, and radio updates — all inside Tha Core.
          </p>

          <p className="mt-3 text-sm font-black">
            Auto-refreshes every 15 minutes.
          </p>
        </div>

        <div className="mt-6 rounded-3xl border border-red-700 bg-zinc-950 p-5 shadow-[0_0_45px_rgba(34,197,94,.45)]">
          <p className="text-sm font-black tracking-[0.35em] text-red-400">
            LIVE HEADLINE STREAM
          </p>

          <div className="mt-3 overflow-hidden rounded-2xl border border-red-700 bg-black p-3">
            <div className="animate-[newsMarquee_35s_linear_infinite] whitespace-nowrap text-lg font-black text-yellow-400">
              {feed.length > 0
                ? feed.map((item) => `${item.category}: ${item.title}`).join("  •  ")
                : "Loading live headlines from Tha Core newsroom..."}
            </div>
          </div>
        </div>

        <style>{`
          @keyframes newsMarquee {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
          }
        `}</style>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {sections.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_45px_rgba(34,197,94,.45)] hover:bg-red-950/40"
            >
              <h2 className="text-3xl font-black text-red-400">{item.title}</h2>
              <p className="mt-3 text-gray-300">
                Open the live {item.title.toLowerCase()} page.
              </p>
              <p className="mt-5 font-black text-red-400">Open Section →</p>
            </Link>
          ))}
        </div>

        <div className="mt-8 rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_55px_rgba(34,197,94,.55)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-3xl font-black text-red-400">
              Latest Live Headlines
            </h2>

            <button
              onClick={loadAllNews}
              className="rounded-xl bg-red-700 px-5 py-3 font-black hover:bg-red-800"
            >
              Refresh Feed
            </button>
          </div>

          {loading ? (
            <p className="mt-6 text-xl font-black text-yellow-400">
              Loading live news feed...
            </p>
          ) : (
            <div className="mt-6 grid gap-5">
              {feed.map((item, index) => (
                <button
                  key={`${item.title}-${index}`}
                  onClick={() => setSelected(item)}
                  className="rounded-2xl border border-red-700 bg-black p-5 text-left hover:bg-red-950/40"
                >
                  <p className="text-sm font-black tracking-[0.3em] text-red-400">
                    {item.category}
                  </p>

                  <h3 className="mt-3 text-2xl font-black text-white">
                    {item.title}
                  </h3>

                  <p className="mt-3 line-clamp-2 text-gray-300">
                    {item.description}
                  </p>

                  <p className="mt-3 text-sm text-gray-500">
                    {item.source} • {item.pubDate}
                  </p>

                  <p className="mt-4 font-black text-red-400">
                    Read Here →
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

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
                {selected.category} • {selected.source} • {selected.pubDate}
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