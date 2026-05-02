import ListenerLiveStatus from "@/components/ListenerLiveStatus";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 pb-36 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        {/* HERO */}
        <section className="rounded-[2rem] border border-red-500/40 bg-zinc-950 p-6 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
          <p className="text-sm font-black uppercase tracking-[0.35em] text-red-400">
            Tha Core Online Radio
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-6xl">
            Live From Tha Core
          </h1>

          <p className="mt-4 max-w-3xl text-zinc-400">
            Stream live radio, shop Tha Core Store, send shoutouts, read news,
            join the community, and stay connected while the music keeps playing.
          </p>
        </section>

        {/* REAL LIVE STATUS */}
        <ListenerLiveStatus />

        {/* MAIN ACTION BUTTONS */}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <HomeCard title="Listen Live" desc="Tap the floating player and tune in now." />
          <HomeCard title="Store" desc="Shop clothing, printing, promos, and custom products." />
          <HomeCard title="Community Chat" desc="Send shoutouts and talk with listeners." />
          <HomeCard title="News & Blog" desc="Catch updates, stories, music news, and more." />
        </section>

        {/* FEATURE BLOCK */}
        <section className="rounded-[2rem] border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-3xl font-black">What’s Inside Tha Core</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <HomeCard title="Now Playing" desc="Live artist and song info from AzuraCast." />
            <HomeCard title="Smart AutoDJ" desc="Songs, jingles, drops, ads, time, and weather." />
            <HomeCard title="Video Call" desc="Future live video call and studio cam system." />
            <HomeCard title="Promote Your Song" desc="Paid promotion tools for artists." />
            <HomeCard title="Business Ads" desc="Run ads on Tha Core Radio." />
            <HomeCard title="Printing Services" desc="Banners, signs, shirts, cards, cups, and more." />
          </div>
        </section>
      </section>
    </main>
  );
}

function HomeCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-950 p-5 shadow-lg">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <p className="mt-2 text-sm text-zinc-400">{desc}</p>

      <button className="mt-4 rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-500">
        Open
      </button>
    </div>
  );
}