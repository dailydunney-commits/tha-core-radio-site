// app/blog/page.tsx
import OwnerToolPage from "@/components/owner-tool-page";

export default function BlogPage() {
  return (
    <OwnerToolPage
      badge="Tha Core Blog"
      title="Blog Control"
      subtitle="Manage stories, music culture, business tips, radio updates, and behind-the-scenes posts."
      cards={[
        { title: "Behind The Core", text: "Station stories, brand updates, and behind-the-scenes content." },
        { title: "Music Culture", text: "Dancehall, reggae, hip-hop, R&B, and community culture updates." },
        { title: "Business Tips", text: "Graphics, printing, promotions, and small business posts." },
      ]}
    />
  );
}