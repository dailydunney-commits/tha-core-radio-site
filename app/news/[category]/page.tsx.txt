import Link from "next/link";
import { notFound } from "next/navigation";

const newsData: Record<
  string,
  { title: string; tag: string; intro: string; stories: string[] }
> = {
  world: {
    title: "World News",
    tag: "GLOBAL HEADLINES",
    intro: "World updates, breaking headlines, and major stories for Tha Core listeners.",
    stories: [
      "Top world headlines will appear here.",
      "Major international updates will be added here.",
      "Community-impacting global stories will show here.",
    ],
  },
  music: {
    title: "Music & Culture",
    tag: "MUSIC • CULTURE • ENTERTAINMENT",
    intro: "Dancehall, reggae, hip hop, entertainment, artist news, and culture updates.",
    stories: [
      "Dancehall and reggae updates will appear here.",
      "Artist features and new music alerts will show here.",
      "Tha Core culture stories will be posted here.",
    ],
  },
  sports: {
    title: "Sports",
    tag: "MATCHES • SCORES • HIGHLIGHTS",
    intro: "Sports scores, match highlights, boxing, football, track, cricket, and more.",
    stories: [
      "Sports scores and match updates will appear here.",
      "Local and international highlights will show here.",
      "Big game alerts and sports talk will be posted here.",
    ],
  },
  business: {
    title: "Business",
    tag: "MONEY MOVES",
    intro: "Business updates, ads, promotions, printing deals, sponsors, and opportunities.",
    stories: [
      "Business opportunities will appear here.",
      "Tha Core ads and sponsor updates will show here.",
      "Printing deals and money moves will be posted here.",
    ],
  },
  weather: {
    title: "Weather",
    tag: "JAMAICA WEATHER",
    intro: "Weather alerts, rain updates, storm tracking, and daily conditions.",
    stories: [
      "Daily weather updates will appear here.",
      "Rain and storm alerts will show here.",
      "Use Weather Reader for live weather announcements.",
    ],
  },
  "radio-updates": {
    title: "Radio Updates",
    tag: "THA CORE RADIO",
    intro: "Station news, show updates, DJ drops, schedule changes, and new features.",
    stories: [
      "Station announcements will appear here.",
      "New shows and DJ updates will show here.",
      "Listener features and platform upgrades will be posted here.",
    ],
  },
};

export default function NewsCategoryPage({
  params,
}: {
  params: { category: string };
}) {
  const page = newsData[params.category];

  if (!page) notFound();

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap gap-3">
          <Link href="/news" className="rounded-2xl bg-red-600 px-5 py-3 font-black">
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
          <p className="text-sm font-black tracking-[0.4em]">{page.tag}</p>
          <h1 className="mt-3 text-5xl font-black md:text-7xl">{page.title}</h1>
          <p className="mt-4 max-w-3xl text-lg font-bold">{page.intro}</p>
        </div>

        <div className="mt-8 grid gap-5">
          {page.stories.map((story, index) => (
            <article
              key={index}
              className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_35px_rgba(34,197,94,.35)]"
            >
              <p className="text-sm font-black tracking-[0.3em] text-red-400">
                UPDATE {index + 1}
              </p>

              <h2 className="mt-3 text-2xl font-black text-white">
                {story}
              </h2>

              <p className="mt-3 text-gray-300">
                This section is ready for real news from your future control panel.
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}