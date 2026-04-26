import Link from "next/link";

const blogSections = [
  { title: "Radio Stories", href: "/blog/radio-stories", text: "Station stories, radio moves, and listener culture." },
  { title: "Business Tips", href: "/blog/business-tips", text: "Money moves, ads, selling, and local business ideas." },
  { title: "Music & Culture", href: "/blog/music-culture", text: "Dancehall, reggae, artists, and culture." },
  { title: "Printing & Design", href: "/blog/printing-design", text: "Flyers, logos, shirts, cups, caps, and branding." },
  { title: "Community", href: "/blog/community", text: "Listener shoutouts, community stories, and local updates." },
  { title: "Behind The Core", href: "/blog/behind-the-core", text: "The journey, upgrades, and what Tha Core is building next." },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <Link href="/" className="font-black text-red-400 hover:text-red-300">
          ← Back Home
        </Link>

        <div className="mt-6 rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-8 text-black">
          <p className="text-sm font-black tracking-[0.4em]">THA CORE BLOG</p>
          <h1 className="mt-3 text-5xl font-black md:text-7xl">Blog / Stories</h1>
          <p className="mt-4 max-w-3xl text-lg font-bold">
            Live stories, business tips, music culture, printing ideas, and behind-the-scenes updates.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="rounded-2xl bg-red-600 px-5 py-3 font-black">Listen Live</Link>
          <Link href="/news" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">News</Link>
          <Link href="/store" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">Store</Link>
          <Link href="/uploads" className="rounded-2xl border border-red-600 px-5 py-3 font-black hover:bg-red-600">Uploads</Link>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {blogSections.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="block rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_45px_rgba(34,197,94,.45)] hover:bg-red-950/50"
            >
              <h2 className="text-3xl font-black text-red-400">{item.title}</h2>
              <p className="mt-3 text-gray-300">{item.text}</p>
              <p className="mt-5 font-black text-red-400">Open →</p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}