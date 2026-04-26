"use client";

import Link from "next/link";
import PlayLiveButton from "@/components/play-live-button";
import VisitorEngagementWidgets from "@/components/visitor-engagement-widgets";
import { useEffect, useMemo, useState } from "react";
import { products } from "./store/products";

const WHATSAPP_LINK = "https://wa.me/18768842867";

function cleanText(value: string) {
  return String(value || "")
    .replace(/Ã[^ ]*/g, "")
    .replace(/Â/g, "")
    .replace(/â€¢/g, "-")
    .replace(/â€™/g, "'")
    .replace(/â€“/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export default function HomePage() {
  const [listeners, setListeners] = useState(0);
  const [ticker, setTicker] = useState(0);
  const [poll, setPoll] = useState("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [nowSong, setNowSong] = useState("Tha Core Live Mix");
  const [nowArtist, setNowArtist] = useState("Live From Tha Core");

  const featuredProducts = useMemo(() => products.slice(0, 8), []);

  const tickerItems = [
    "NOW PLAYING: " + cleanText(nowArtist) + " - " + cleanText(nowSong),
    "UPCOMING SHOW: Dancehall Drive starts soon",
    "STORE SALE: Custom prints and radio promos available",
    "BIRTHDAY SHOUTOUT: Send your birthday shoutout live",
    "SPONSOR AD: Sponsor slots available now",
  ];

  useEffect(() => {
    async function loadNowPlaying() {
      try {
        const res = await fetch("/api/now-playing", { cache: "no-store" });
        const data = await res.json();

        setNowSong(cleanText(data.song || "Tha Core Live Mix"));
        setNowArtist(cleanText(data.artist || "Live From Tha Core"));

        if (typeof data.listeners === "number") {
          setListeners(data.listeners);
        }
      } catch {
        setNowSong("Tha Core Live Mix");
        setNowArtist("Live From Tha Core");
      }
    }

    loadNowPlaying();

    const nowPlayingTimer = setInterval(loadNowPlaying, 15000);
    const tick = setInterval(() => {
      setTicker((v) => (v + 1) % 5);
    }, 3500);

    return () => {
      clearInterval(nowPlayingTimer);
      clearInterval(tick);
    };
  }, []);

  const requestText = encodeURIComponent(
    "THA CORE RADIO VISITOR REQUEST\n\nName:\n" +
      (requestName || "No name entered") +
      "\n\nRequest / Shoutout:\n" +
      (requestMessage || "No message entered") +
      "\n\nTime Submitted:\n" +
      new Date().toLocaleString() +
      "\n\nSent from Tha Core Radio website"
  );

  return (
    <main className="min-h-screen bg-black px-4 py-6 pb-44 text-white sm:px-6">
      <section className="mx-auto max-w-7xl">
        <style>
          {"@keyframes trackMarquee { 0% { transform: translateX(30%); } 100% { transform: translateX(-100%); } }"}
        </style>

        <div className="mb-5 rounded-2xl border border-red-700 bg-zinc-950 px-5 py-3 text-lg font-black italic text-yellow-400 shadow-[0_0_55px_rgba(34,197,94,.8)]">
          {tickerItems[ticker]}
        </div>

        <div className="mb-5 rounded-3xl border border-red-700 bg-gradient-to-br from-red-950 to-black p-5 shadow-[0_0_55px_rgba(34,197,94,.75)]">
          <p className="text-xl font-black italic text-yellow-400">
            Vote next song - Flash sale ends in 10 mins - Drop your shoutout live now
          </p>
        </div>

        <div className="rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-6 shadow-[0_0_75px_rgba(34,197,94,.85)]">
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            <div>
              <p className="text-sm font-black tracking-[0.35em] text-black">
                LIVE FROM THA CORE
              </p>

              <h1 className="mt-4 text-5xl font-black text-black md:text-7xl">
                Tha Core Radio
              </h1>

              <p className="mt-4 max-w-3xl text-lg font-bold text-black">
                Live radio, store, chat, uploads, shoutouts, world news, radio promos, and business moves.
              </p>

              <div className="mt-6 rounded-3xl border-2 border-red-500 bg-black/90 p-5 shadow-[0_0_75px_rgba(34,197,94,1)]">
                <div className="inline-flex rounded-full border border-yellow-400 bg-red-700 px-4 py-2 shadow-[0_0_25px_rgba(250,204,21,.8)]">
                  <p className="text-base font-black tracking-[0.15em] text-yellow-300">
                    ON AIR NOW - NOW PLAYING
                  </p>
                </div>

                <div className="mt-3 flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <span
                      key={i}
                      className="h-4 w-4 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_28px_rgba(250,204,21,1)]"
                    />
                  ))}
                </div>

                <div className="mt-4 max-w-full overflow-hidden rounded-xl border border-red-700 bg-black p-3">
                  <div
                    className="whitespace-nowrap text-base font-black text-white md:text-lg"
                    style={{ animation: "trackMarquee 12s linear infinite" }}
                  >
                    {cleanText(nowArtist)} - {cleanText(nowSong)}
                  </div>
                </div>

                <p className="mt-3 text-gray-300">{cleanText(nowArtist)}</p>

                <p className="mt-4 text-2xl font-black text-red-400">
                  {listeners} listeners online
                </p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                <PlayLiveButton />

                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl bg-red-700 px-5 py-4 text-center font-black"
                >
                  Join WhatsApp
                </a>

                <Link href="/store" className="rounded-2xl bg-black px-5 py-4 text-center font-black text-white">
                  Store
                </Link>

                <Link href="/uploads" className="rounded-2xl bg-red-700 px-5 py-4 text-center font-black">
                  Upload Entry
                </Link>

                <Link href="/news" className="rounded-2xl bg-red-700 px-5 py-4 text-center font-black">
                  World News
                </Link>

                <Link href="/blog" className="rounded-2xl bg-black px-5 py-4 text-center font-black text-yellow-400">
                  Blog / Stories
                </Link>

                <Link href="/lotto" className="rounded-2xl bg-red-700 px-5 py-4 text-center font-black">
                  Cash Pot / Lotto
                </Link>
              </div>
            </div>

            <div className="flex items-start justify-center lg:justify-end">
              <img
                src="/logo-site.png?v=777"
                alt="Tha Core Logo"
                className="h-64 w-64 rounded-full border-[6px] border-green-400 bg-transparent object-contain p-0 shadow-[0_0_120px_rgba(34,197,94,1)]"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <Card title="Listeners Online" text={`${listeners} tuned in now`} />
          <Card title="Joined Today" text="34 new listeners today" />
          <Card title="Top Cities" text="Kingston - Montego Bay - London" />
          <Card title="Live Energy" text="Music - Chat - Store - Giveaways" />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_.8fr]">
          <Panel title="Request Song / Shoutout">
            <input
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl bg-black p-4"
            />

            <textarea
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              placeholder="Song request, birthday shoutout, or message..."
              className="mt-3 h-32 w-full rounded-xl bg-black p-4"
            />

            <a
              href={`${WHATSAPP_LINK}?text=${requestText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 block rounded-xl bg-red-700 px-6 py-4 text-center font-black"
            >
              Send To WhatsApp
            </a>
          </Panel>

          <Panel title="Money Moves">
            <div className="grid gap-3">
              <Link href="/store" className="rounded-xl bg-red-700 p-4 font-black">
                Advertise With Us
              </Link>

              <Link href="/store" className="rounded-xl bg-black p-4 font-black">
                Sponsor A Show
              </Link>

              <Link href="/store" className="rounded-xl bg-black p-4 font-black">
                Radio Promo Package
              </Link>

              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-white p-4 text-center font-black text-black"
              >
                Donate / Support
              </a>
            </div>
          </Panel>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Panel title="Poll Of The Day">
            <p className="font-bold">Dancehall or Reggae tonight?</p>

            <button onClick={() => setPoll("Dancehall")} className="mt-4 w-full rounded-xl bg-red-700 px-5 py-3 font-black">
              Dancehall
            </button>

            <button onClick={() => setPoll("Reggae")} className="mt-3 w-full rounded-xl bg-white px-5 py-3 font-black text-black">
              Reggae
            </button>

            <p className="mt-3 text-gray-300">Your vote: {poll || "Not voted yet"}</p>
          </Panel>

          <Panel title="Daily Reward / Check-In">
            <p className="text-gray-300">You have visited 3 days in a row.</p>

            <button onClick={() => setCheckedIn(true)} className="mt-5 rounded-xl bg-red-700 px-5 py-3 font-black">
              {checkedIn ? "Badge Unlocked" : "Daily Check-In"}
            </button>
          </Panel>

          <Panel title="DJ Cam / Visualizer">
            <div className="flex h-44 items-center justify-center rounded-2xl bg-black text-center text-gray-400">
              Live studio cam / visualizer screen goes here
            </div>
          </Panel>
        </div>

        <div className="mt-8 rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_55px_rgba(34,197,94,.75)]">
          <h2 className="text-3xl font-black text-red-400">News Preview</h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <NewsCard href="/news/world" icon="WORLD" title="World News" text="Breaking headlines and global updates." />
            <NewsCard href="/news/music" icon="MUSIC" title="Music & Culture" text="Reggae, dancehall, entertainment and artists." />
            <NewsCard href="/news/business" icon="MONEY" title="Money Moves" text="Business, ads, promos, and opportunities." />
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_55px_rgba(34,197,94,.75)]">
          <h2 className="text-3xl font-black text-red-400">Featured Blog Stories</h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <BlogCard
              href="/blog/behind-the-core/from-idea-to-live-platform"
              category="BEHIND THE CORE"
              title="From Idea To Live Platform"
              text="How Tha Core moved from idea stage into a real live radio, store, news, and blog platform."
            />

            <BlogCard
              href="/blog/business-tips/how-small-businesses-can-sell-faster-with-simple-offers"
              category="BUSINESS TIPS"
              title="How Small Businesses Can Sell Faster"
              text="Clear offers, strong visuals, WhatsApp ordering, and fast replies help drive sales."
            />

            <BlogCard
              href="/blog/music-culture/dancehall-reggae-and-the-voice-of-the-people"
              category="MUSIC & CULTURE"
              title="Dancehall, Reggae & The Voice Of The People"
              text="Why music remains identity, movement, culture, and connection."
            />
          </div>
        </div>

        <VisitorEngagementWidgets />

        <div className="mt-8 rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_55px_rgba(34,197,94,.75)]">
          <h2 className="text-3xl font-black text-red-400">Featured Store Items</h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product: any) => (
              <Link key={product.id} href="/store" className="rounded-3xl bg-black p-4 hover:bg-red-950">
                <div
                  className="h-72 rounded-2xl bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 bg-contain bg-center bg-no-repeat"
                  style={{ backgroundImage: `url(${product.image})` }}
                />

                <h3 className="mt-4 text-xl font-black">{product.name}</h3>

                <p className="font-black text-red-400">
                  JMD ${product.price.toLocaleString()}
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_55px_rgba(34,197,94,.75)]">
          <p className="text-sm tracking-[0.35em] text-red-300">THA CORE RADIO</p>

          <h2 className="mt-3 text-4xl font-black text-red-400">
            Weekly Radio Program Schedule
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Sunday", "Gospel Morning - Family Vibes - Sunday Talk"],
              ["Monday", "Money Moves - Business Promo - Fresh Start Mix"],
              ["Tuesday", "Dancehall Drive - Listener Requests"],
              ["Wednesday", "Midweek Motivation - Community Talk"],
              ["Thursday", "Throwback Night - Old School Mix"],
              ["Friday", "Weekend Warm Up - Party Mix"],
              ["Saturday", "Live From Tha Core - DJ Special"],
            ].map(([day, show]) => (
              <div key={day} className="rounded-2xl bg-black p-5">
                <h3 className="text-2xl font-black text-red-400">{day}</h3>
                <p className="mt-3 text-gray-300">{show}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Link href="/weather-reader" className="rounded-2xl border border-red-700 bg-zinc-900 p-6 hover:bg-red-950/40">
            <h2 className="text-2xl font-black text-red-400">Weather Reader</h2>
            <p className="mt-3 text-gray-300">Automated weather updates for listeners.</p>
          </Link>

          <Link href="/time-reader" className="rounded-2xl border border-red-700 bg-zinc-900 p-6 hover:bg-red-950/40">
            <h2 className="text-2xl font-black text-red-400">Time Reader</h2>
            <p className="mt-3 text-gray-300">Automatic station time announcements.</p>
          </Link>
        </div>

        <footer className="mt-10 rounded-3xl border border-red-700 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-6 text-center text-black">
          <div className="grid items-center gap-6 md:grid-cols-[150px_1fr]">
            <div className="flex justify-center md:justify-start">
              <img
                src="/logo-site.png?v=777"
                alt="Tha Core Logo"
                className="h-32 w-32 rounded-full border-4 border-green-400 bg-transparent object-contain p-0 shadow-[0_0_70px_rgba(34,197,94,1)]"
              />
            </div>

            <div>
              <p className="text-3xl font-black">Tha Core Radio</p>

              <p className="mt-2 font-bold">
                WhatsApp: 876-884-2867 - Email: dailydunney@gmail.com
              </p>

              <p className="mt-2 font-bold">
                Live radio - Store - Promos - Community
              </p>

              <p className="mt-2 text-sm font-bold">
                © 2026 Tha Core. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </section>
    </main>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_30px_rgba(34,197,94,.45)]">
      <h2 className="text-2xl font-black text-red-400">{title}</h2>
      <p className="mt-3 text-gray-200">{text}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_30px_rgba(34,197,94,.45)]">
      <h2 className="mb-5 text-3xl font-black text-red-400">{title}</h2>
      {children}
    </div>
  );
}

function NewsCard({
  href,
  icon,
  title,
  text,
}: {
  href: string;
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <Link href={href} className="block rounded-2xl bg-black p-5 hover:bg-red-950/50">
      <div className="text-4xl font-black text-yellow-400">{icon}</div>
      <h3 className="mt-4 text-2xl font-black text-red-400">{title}</h3>
      <p className="mt-2 text-gray-300">{text}</p>
      <p className="mt-4 font-black text-red-400">Open</p>
    </Link>
  );
}

function BlogCard({
  href,
  category,
  title,
  text,
}: {
  href: string;
  category: string;
  title: string;
  text: string;
}) {
  return (
    <Link href={href} className="block rounded-2xl bg-black p-5 hover:bg-red-950/50">
      <p className="text-sm font-black tracking-[0.3em] text-red-400">
        {category}
      </p>
      <h3 className="mt-3 text-2xl font-black text-white">{title}</h3>
      <p className="mt-3 text-gray-300">{text}</p>
      <p className="mt-4 font-black text-red-400">Read Story</p>
    </Link>
  );
}