"use client";

// app/upload/page.tsx
import OwnerToolPage from "@/components/owner-tool-page";

export default function UploadPage() {
  return (
    <OwnerToolPage
      badge="Tha Core Upload"
      title="Upload Center"
      subtitle="Upload center for music, jingles, drops, ads, commercials, flyers, and store items."
      cards={[
        { title: "Music Upload", text: "Future direct upload area for songs and playlists." },
        { title: "Jingles / Drops", text: "Upload station IDs, DJ drops, commercial breaks, and sponsor ads." },
        { title: "Store Images", text: "Upload product images, promo flyers, and printing samples." },
      ]}
    />
  );
}
