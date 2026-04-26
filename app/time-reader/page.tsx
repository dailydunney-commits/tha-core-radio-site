export default function TimeReaderPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <h1 className="text-5xl font-black">Time Reader</h1>

        <p className="mt-4 text-gray-300">
          Automatic Jamaica time announcements for Tha Core Radio will show here.
        </p>

        <div className="mt-8 rounded-3xl border border-red-700/60 bg-zinc-900 p-6">
          <p className="text-sm tracking-[0.4em] text-red-400">
            JAMAICA TIME
          </p>

          <p className="mt-4 text-4xl font-black">
            Ready
          </p>
        </div>
      </section>
    </main>
  );
}
