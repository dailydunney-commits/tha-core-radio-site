"use client";

import { useEffect, useState } from "react";

type ChatMessage = {
  id: number;
  name: string;
  message: string;
  time: string;
};

export default function ChatPage() {
  const [name, setName] = useState("Listener");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("tha-core-chat");
    if (saved) setMessages(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("tha-core-chat", JSON.stringify(messages));
  }, [messages]);

  function sendMessage() {
    if (!message.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now(),
      name: name.trim() || "Listener",
      message: message.trim(),
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMessage]);
    setMessage("");
  }

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-5xl font-black text-yellow-400">
          Community Chat
        </h1>

        <p className="mt-3 text-white/70">
          Talk with Tha Core listeners live.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="h-[480px] overflow-y-auto rounded-2xl bg-black/50 p-4">
              {messages.length === 0 ? (
                <p className="text-white/40">
                  No messages yet. Start the conversation.
                </p>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className="rounded-2xl border border-white/10 bg-black p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-yellow-400">
                          {msg.name}
                        </p>
                        <p className="text-xs text-white/40">{msg.time}</p>
                      </div>

                      <p className="mt-2 text-white/90">{msg.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
              />

              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendMessage();
                }}
                placeholder="Type your message..."
                className="rounded-xl border border-white/10 bg-black px-4 py-3 text-white outline-none"
              />

              <button
                onClick={sendMessage}
                className="rounded-xl bg-yellow-400 px-6 py-3 font-black text-black hover:bg-yellow-300"
              >
                Send
              </button>
            </div>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-2xl font-black text-yellow-400">
              Chat Rules
            </h2>

            <div className="mt-4 space-y-3 text-sm text-white/70">
              <p>✅ Keep it respectful.</p>
              <p>✅ Big up the community.</p>
              <p>✅ Share music, vibes, and ideas.</p>
              <p>❌ No hate talk.</p>
              <p>❌ No spam.</p>
            </div>

            <div className="mt-6 rounded-2xl bg-black/50 p-4">
              <p className="text-sm text-white/50">Status</p>
              <p className="mt-1 font-bold text-green-400">
                Chat is active
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}