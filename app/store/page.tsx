"use client";

// app/store/page.tsx
import OwnerToolPage from "@/components/owner-tool-page";

export default function StorePage() {
  return (
    <OwnerToolPage
      badge="Tha Core Store"
      title="Store Control"
      subtitle="Control products, printing services, radio promos, and WhatsApp order flow."
      cards={[
        { title: "Products", text: "T-shirts, caps, tights, sportswear, cups, cushions, and custom items." },
        { title: "Printing", text: "Banners, signs, posters, business cards, shirts, logos, and design services." },
        { title: "Radio Promos", text: "Paid ads, song promotion, jingles, and sponsor slots." },
      ]}
    />
  );
}
