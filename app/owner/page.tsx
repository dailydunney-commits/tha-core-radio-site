import RealOnAirControl from "@/components/RealOnAirControl";
import SmartAutoDJRevenuePanel from "@/components/SmartAutoDJRevenuePanel";

export default function OwnerPage() {
  return (
    <main className="min-h-screen bg-black px-4 py-6 pb-36 text-white">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2rem] border border-red-500/40 bg-zinc-950 p-6 shadow-[0_0_35px_rgba(239,68,68,0.25)]">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-red-400">
            Tha Core Owner Control Panel
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Full Station Command Center
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Real ON AIR control, AutoDJ, live DJ, revenue tools, messages, store,
            blog, news, weather, time reader, and full station management.
          </p>
        </div>

        <RealOnAirControl />

        <SmartAutoDJRevenuePanel />

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ControlCard title="Upload Music" desc="Upload songs, promos, drops, and jingles." />
          <ControlCard title="Playlists" desc="Create and manage radio playlists." />
          <ControlCard title="Jingles & Drops" desc="Trigger station IDs, ads, and voice drops." />
          <ControlCard title="Video Call / Cam" desc="Manage live video call or studio cam section." />
          <ControlCard title="News" desc="Control news feeds and station updates." />
          <ControlCard title="Blog" desc="Create radio stories and blog posts." />
          <ControlCard title="Time Reader" desc="Automated time announcements." />
          <ControlCard title="Weather Reader" desc="Automated Jamaica weather announcements." />
          <ControlCard title="Messages" desc="View shoutouts and listener messages." />
          <ControlCard title="Store" desc="Manage products, pricing, orders, and promos." />
          <ControlCard title="Smart AutoDJ" desc="AI-assisted radio automation controls." />
          <ControlCard title="Revenue" desc="Track ads, promos, orders, and station income." />
        </section>
      </section>
    </main>
  );
}

function ControlCard({ title, desc }: { title: string; desc: string }) {
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