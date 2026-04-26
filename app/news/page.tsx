import Link from "next/link";

const newsSections = [
  { title: "World News", href: "/news/world" },
  { title: "Music & Culture", href: "/news/music" },
  { title: "Sports", href: "/news/sports" },
  { title: "Business", href: "/news/business" },
  { title: "Weather", href: "/news/weather" },
  { title: "Radio Updates", href: "/news/radio-updates" },
];

export default function NewsPage() {
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
          <Link href="/store" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Store
          </Link>
          <Link href="/uploads" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Uploads
          </Link>
          <Link href="/time-reader" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Time Reader
          </Link>
          <Link href="/weather-reader" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">
            Weather Reader
          </Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {newsSections.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="block rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_45px_rgba(34,197,94,.45)] hover:bg-red-950/50"
            >
              <h2 className="text-3xl font-black text-red-400">{item.title}</h2>
              <p className="mt-3 text-gray-300">
                Click to open {item.title}.
              </p>
              <p className="mt-5 font-black text-red-400">Open →</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}