"use client";

// app/chat/page.tsx
import OwnerToolPage from "@/components/owner-tool-page";

export default function ChatPage() {
  return (
    <OwnerToolPage
      badge="Tha Core Chat"
      title="Community Chat"
      subtitle="Listener chat, request messages, moderation, and live community talk."
      cards={[
        { title: "Live Chat", text: "Main listener chat area for the website and app." },
        { title: "Moderation", text: "Future controls for deleting, pinning, and managing messages." },
        { title: "Requests", text: "Listener song requests and shoutout messages." },
      ]}
    />
  );
}
