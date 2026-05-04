"use client";

// app/requests/page.tsx
import OwnerToolPage from "@/components/owner-tool-page";

export default function RequestsPage() {
  return (
    <OwnerToolPage
      badge="Tha Core Requests"
      title="Song Requests"
      subtitle="Manage listener song requests, shoutouts, dedications, and live requests."
      cards={[
        { title: "Song Requests", text: "Incoming song request control area." },
        { title: "Dedications", text: "Birthday, party, and listener dedication messages." },
        { title: "Live Queue", text: "Future request queue for SmartDJ and LiveDJ." },
      ]}
    />
  );
}
