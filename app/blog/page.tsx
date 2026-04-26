"use client";

import { useState } from "react";

const stories = {
  core: {
    title: "From The Core",
    text: "Real stories from the struggle, the streets, the lessons, the growth, and the building of Tha Core.",
  },
  radio: {
    title: "Radio Stories",
    text: "Behind the mic, listener moments, show ideas, radio culture, and what’s happening inside Tha Core Radio.",
  },
  money: {
    title: "Money Moves",
    text: "Business ideas, printing, graphics, promotions, ads, sponsors, store updates, and building income.",
  },
  music: {
    title: "Dancehall & Reggae",
    text: "Dancehall, reggae, sound system culture, artist stories, music history, and street energy.",
  },
};

export default function BlogPage() {
  const [active, setActive] = useState(stories.core);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <a href="/" className="font-black text-red-400">← Back Home</a>

        <div className="mt-6 rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-8 text-black">
          <h1 className="text-5xl font-black md:text-7xl">Blogs & Stories</h1>
          <p className="mt-4 text-lg font-bold">
            Tha Core stories, scripts, radio talk, music culture, and business moves.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <button onClick={() => setActive(stories.core)} className="rounded-xl bg-red-700 px-5 py-4 font-black">From The Core</button>
          <button onClick={() => setActive(stories.radio)} className="rounded-xl bg-red-700 px-5 py-4 font-black">Radio Stories</button>
          <button onClick={() => setActive(stories.money)} className="rounded-xl bg-red-700 px-5 py-4 font-black">Money Moves</button>
          <button onClick={() => setActive(stories.music)} className="rounded-xl bg-red-700 px-5 py-4 font-black">Dancehall & Reggae</button>
        </div>

        <div className="mt-8 rounded-3xl border border-red-700 bg-zinc-950 p-8 shadow-[0_0_45px_rgba(34,197,94,.45)]">
          <p className="text-sm font-black tracking-widest text-red-400">BLOG / STORY</p>
          <h2 className="mt-3 text-5xl font-black text-yellow-400">{active.title}</h2>
          <p className="mt-5 text-xl text-gray-300">{active.text}</p>

          <div className="mt-8 rounded-2xl bg-black p-6">
            <h3 className="text-3xl font-black text-red-400">Story Preview</h3>
            <p className="mt-4 text-gray-300">
              Full story posts, radio scripts, printable episodes, business articles,
              and culture writeups will show here.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
