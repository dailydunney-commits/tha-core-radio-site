"use client";

// app/promos/page.tsx
import OwnerToolPage from "@/components/owner-tool-page";

export default function PromosPage() {
  return (
    <OwnerToolPage
      badge="Tha Core Promos"
      title="Promo Tools"
      subtitle="Manage radio ads, jingles, dubplates, drops, and paid promotion services."
      cards={[
        { title: "Radio Ads", text: "Paid ad packages and sponsor announcements." },
        { title: "Jingles", text: "Station jingles, business jingles, and promo hooks." },
        { title: "Dubplates / Drops", text: "Artist-style drops, DJ drops, and event promos." },
      ]}
    />
  );
}
