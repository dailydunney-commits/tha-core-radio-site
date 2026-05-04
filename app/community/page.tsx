"use client";

// app/community/page.tsx
import OwnerToolPage from "@/components/owner-tool-page";

export default function CommunityPage() {
  return (
    <OwnerToolPage
      badge="Tha Core Community"
      title="Community Hub"
      subtitle="Build listener engagement, polls, shoutouts, contests, and community features."
      cards={[
        { title: "Listeners", text: "Audience activity and engagement area." },
        { title: "Polls", text: "Vote next song, live show questions, and music polls." },
        { title: "Shout Outs", text: "Birthday shoutouts, dedications, and listener messages." },
      ]}
    />
  );
}
