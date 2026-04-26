import Link from "next/link";

export default function NewsPage() {
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
          <h1 className="mt-3 text-5xl font-black md:text-7xl">Music & Culture</h1>
          <p className="mt-4 max-w-3xl text-lg font-bold">Dancehall, reggae, hip hop, artist updates, entertainment, and culture news.</p>
        </div>

        <div className="mt-8 grid gap-5">
          <article className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_35px_rgba(34,197,94,.35)]">
            <p className="text-sm font-black tracking-[0.3em] text-red-400">UPDATE 1</p>
            <h2 className="mt-3 text-2xl font-black text-white">Music & Culture updates will show here.</h2>
            <p className="mt-3 text-gray-300">
              This page is ready for real updates from your future control panel.
            </p>
          </article>

          <article className="rounded-3xl border border-red-700 bg-zinc-950 p-6 shadow-[0_0_35px_rgba(34,197,94,.35)]">
            <p className="text-sm font-black tracking-[0.3em] text-red-400">UPDATE 2</p>
            <h2 className="mt-3 text-2xl font-black text-white">More Music & Culture content coming soon.</h2>
            <p className="mt-3 text-gray-300">
              Tha Core can update this manually now, then connect it to admin later.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}