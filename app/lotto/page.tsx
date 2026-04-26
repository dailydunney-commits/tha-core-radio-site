"use client";

import { useEffect, useState } from "react";

export default function LottoPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  async function loadResults() {
    setLoading(true);
    const res = await fetch("/api/lotto", { cache: "no-store" });
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    loadResults();
    const timer = setInterval(loadResults, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen bg-black px-6 py-10 text-white">
      <section className="mx-auto max-w-7xl">
        <a href="/" className="font-black text-red-400">← Back Home</a>

        <div className="mt-6 rounded-[2rem] border-2 border-red-600 bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-500 p-8 text-black">
          <h1 className="text-5xl font-black md:text-7xl">
            Cash Pot & Lotto Results
          </h1>

          <p className="mt-4 text-lg font-bold">
            Clean results shown directly on Tha Core. Auto-refreshes every 15 minutes.
          </p>

          <p className="mt-2 text-sm font-black">
            Source: {data?.source || "Loading..."}
          </p>

          <p className="mt-1 text-sm font-black">
            Last updated: {data?.updatedAt ? new Date(data.updatedAt).toLocaleString() : "Loading..."}
          </p>
        </div>

        <button
          onClick={loadResults}
          className="mt-6 rounded-xl bg-red-700 px-6 py-4 font-black"
        >
          Refresh Results
        </button>

        {loading ? (
          <div className="mt-8 rounded-3xl border border-red-700 bg-zinc-950 p-6 text-2xl font-black text-yellow-400">
            Loading results...
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {(data?.results || []).map((item: any) => (
              <button
                key={item.label}
                onClick={() => setSelected(item)}
                className="rounded-3xl border border-red-700 bg-zinc-950 p-6 text-left shadow-[0_0_45px_rgba(34,197,94,.45)] hover:bg-red-950"
              >
                <p className="text-sm font-black tracking-widest text-yellow-400">
                  SUPREME VENTURES
                </p>

                <h2 className="mt-3 text-4xl font-black text-red-400">
                  {item.label}
                </h2>

                <p className="mt-2 text-gray-400">
                  Draw: {item.draw}
                </p>

                <div className="mt-5 rounded-2xl bg-black p-5">
                  <p className="text-2xl font-black text-white">
                    {item.result || "Updating..."}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

                {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
            <div className="w-full max-w-2xl rounded-3xl border border-red-700 bg-zinc-950 p-8 shadow-[0_0_65px_rgba(34,197,94,.65)]">
              <button
                onClick={() => setSelected(null)}
                className="mb-6 rounded-xl bg-red-700 px-5 py-3 font-black"
              >
                Close
              </button>

              <p className="text-sm font-black tracking-widest text-yellow-400">
                SUPREME VENTURES RESULT
              </p>

              <h2 className="mt-3 text-5xl font-black text-red-400">
                {selected.label}
              </h2>

              <p className="mt-3 text-gray-400">
                Draw: {selected.draw}
              </p>

              <div className="mt-6 rounded-2xl bg-black p-6">
                <p className="text-3xl font-black text-white">
                  {selected.result}
                </p>
              </div>
            </div>
          </div>
        )}
        <p className="mt-6 text-sm text-gray-500">
          Results are for information only. Verify with Supreme Ventures before acting on any result.
        </p>
      </section>
    </main>
  );
}

