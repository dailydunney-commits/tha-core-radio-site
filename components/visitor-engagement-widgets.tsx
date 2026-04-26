"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { products } from "@/app/store/products";

const WHATSAPP_LINK = "https://wa.me/18768842867";

const cities = [
  "Kingston",
  "Montego Bay",
  "Spanish Town",
  "Portmore",
  "Mandeville",
  "Ocho Rios",
  "London",
  "New York",
  "Toronto",
];

const stories = [
  {
    title: "From Idea To Live Platform",
    href: "/blog/behind-the-core/from-idea-to-live-platform",
    text: "How Tha Core moved from idea stage into a real live platform.",
  },
  {
    title: "Why Online Radio Still Matters",
    href: "/blog/radio-stories/why-online-radio-still-matters",
    text: "Why independent voices still need their own station.",
  },
  {
    title: "How Small Businesses Can Sell Faster",
    href: "/blog/business-tips/how-small-businesses-can-sell-faster-with-simple-offers",
    text: "Clear offers, strong visuals, and fast replies help drive sales.",
  },
];

const prizes = [
  "Free Radio Shoutout",
  "10% Off Store Order",
  "Free Blog Feature Review",
  "Free Promo Mention",
  "Free Design Consultation",
  "Try Again Tomorrow",
];

export default function VisitorEngagementWidgets() {
  const [requestName, setRequestName] = useState("");
  const [requestSong, setRequestSong] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState("");

  const productOfDay = useMemo(() => {
    const day = new Date().getDate();
    return products[day % products.length];
  }, []);

  const storyOfDay = useMemo(() => {
    const day = new Date().getDate();
    return stories[day % stories.length];
  }, []);

  const topCities = useMemo(() => {
    return cities.slice(0, 5).map((city, index) => ({
      city,
      listeners: Math.max(12, 84 - index * 9 + Math.floor(Math.random() * 8)),
    }));
  }, []);

  const requestText = encodeURIComponent(
    "THA CORE SONG REQUEST\n\nName:\n" +
      (requestName || "No name entered") +
      "\n\nSong / Artist Request:\n" +
      (requestSong || "No song entered") +
      "\n\nSent from Tha Core Radio website"
  );

  function spinWheel() {
    if (spinning) return;

    setSpinning(true);
    setPrize("");

    setTimeout(() => {
      const picked = prizes[Math.floor(Math.random() * prizes.length)];
      setPrize(picked);
      setSpinning(false);
    }, 1200);
  }

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <div className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_55px_rgba(34,197,94,.55)]">
        <h2 className="text-3xl font-black text-red-400">
          Song Request Widget
        </h2>

        <p className="mt-3 text-gray-300">
          Request a song or send a shoutout straight to Tha Core.
        </p>

        <input
          value={requestName}
          onChange={(e) => setRequestName(e.target.value)}
          placeholder="Your name"
          className="mt-5 w-full rounded-xl bg-black p-4 text-white"
        />

        <textarea
          value={requestSong}
          onChange={(e) => setRequestSong(e.target.value)}
          placeholder="Song name, artist, or shoutout..."
          className="mt-3 h-28 w-full rounded-xl bg-black p-4 text-white"
        />

        <a
          href={WHATSAPP_LINK + "?text=" + requestText}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block rounded-xl bg-red-700 px-6 py-4 text-center font-black hover:bg-red-800"
        >
          Send Request To WhatsApp
        </a>
      </div>

      <div className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_55px_rgba(34,197,94,.55)]">
        <h2 className="text-3xl font-black text-red-400">
          Featured Product Of The Day
        </h2>

        {productOfDay && (
          <Link href="/store" className="mt-5 block rounded-2xl bg-black p-4 hover:bg-red-950/50">
            <div
              className="h-56 rounded-2xl bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: "url(" + productOfDay.image + ")" }}
            />

            <h3 className="mt-4 text-2xl font-black text-white">
              {productOfDay.name}
            </h3>

            <p className="mt-2 font-black text-red-400">
              JMD ${productOfDay.price.toLocaleString()}
            </p>

            <p className="mt-4 font-black text-red-400">Shop Now →</p>
          </Link>
        )}
      </div>

      <div className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_55px_rgba(34,197,94,.55)]">
        <h2 className="text-3xl font-black text-red-400">Story Of The Day</h2>

        <Link href={storyOfDay.href} className="mt-5 block rounded-2xl bg-black p-5 hover:bg-red-950/50">
          <p className="text-sm font-black tracking-[0.3em] text-yellow-400">
            FEATURED STORY
          </p>

          <h3 className="mt-3 text-2xl font-black text-white">
            {storyOfDay.title}
          </h3>

          <p className="mt-3 text-gray-300">{storyOfDay.text}</p>

          <p className="mt-4 font-black text-red-400">Read Story →</p>
        </Link>
      </div>

      <div className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_55px_rgba(34,197,94,.55)]">
        <h2 className="text-3xl font-black text-red-400">
          Top Listener Cities Live
        </h2>

        <div className="mt-5 grid gap-3">
          {topCities.map((item, index) => (
            <div key={item.city} className="rounded-2xl bg-black p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="font-black text-white">
                  #{index + 1} {item.city}
                </p>

                <p className="font-black text-yellow-400">
                  {item.listeners} listening
                </p>
              </div>

              <div className="mt-3 h-2 rounded-full bg-zinc-800">
                <div
                  className="h-2 rounded-full bg-red-600"
                  style={{ width: Math.min(100, item.listeners) + "%" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_55px_rgba(34,197,94,.55)] xl:col-span-2">
        <h2 className="text-3xl font-black text-red-400">
          Weekly Spin Wheel Giveaway
        </h2>

        <p className="mt-3 text-gray-300">
          Visitors can spin once and send their prize screenshot to WhatsApp.
        </p>

        <div className="mt-6 grid items-center gap-6 md:grid-cols-[260px_1fr]">
          <button
            type="button"
            onClick={spinWheel}
            className={"flex h-60 w-60 items-center justify-center rounded-full border-8 border-yellow-400 bg-gradient-to-br from-red-700 via-black to-green-700 text-center text-2xl font-black shadow-[0_0_60px_rgba(250,204,21,.7)] " + (spinning ? "animate-spin" : "")}
          >
            SPIN
          </button>

          <div className="rounded-3xl bg-black p-6">
            <p className="text-sm font-black tracking-[0.3em] text-yellow-400">
              GIVEAWAY RESULT
            </p>

            <h3 className="mt-4 text-4xl font-black text-white">
              {spinning ? "Spinning..." : prize || "Tap spin to try your luck"}
            </h3>

            {prize && (
              <a
                href={WHATSAPP_LINK + "?text=" + encodeURIComponent("Tha Core Giveaway Prize: " + prize)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 block rounded-xl bg-red-700 px-6 py-4 text-center font-black hover:bg-red-800"
              >
                Claim On WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}