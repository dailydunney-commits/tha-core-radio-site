import Link from "next/link";

export default function RadioPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <section className="mx-auto max-w-5xl">
        <Link href="/" className="text-red-400 hover:text-red-300">
          ← Back Home
        </Link>

        <div className="mt-6 rounded-3xl border border-red-800 bg-gradient-to-b from-red-950 to-black p-6 shadow-2xl">
          <p className="text-sm uppercase tracking-widest text-red-300">
            Now Streaming
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-6xl">
            Tha Core Radio
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-gray-300">
            Use the floating radio player at the bottom-right to play or pause
            the live station while browsing.
          </p>

          <div className="mt-8 rounded-2xl border border-red-700 bg-black p-5">
            <p className="text-red-400 font-bold">Live Player</p>
            <p className="mt-2 text-gray-300">
              The player stays on screen so listeners can shop, chat, upload and
              keep the radio playing.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Link
              href="/store"
              className="rounded-2xl bg-white p-5 text-center font-bold text-black hover:bg-gray-200"
            >
              Visit Store
            </Link>

            <Link
              href="/chat"
              className="rounded-2xl border border-red-700 p-5 text-center font-bold hover:bg-red-950"
            >
              Chat
            </Link>

            <Link
              href="/upload"
              className="rounded-2xl border border-red-700 p-5 text-center font-bold hover:bg-red-950"
            >
              Upload
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}