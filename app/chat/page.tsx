"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  name: string;
  message: string;
  created_at: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("Connecting chat...");
  const [initialLoading, setInitialLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const pollingRef = useRef<number | null>(null);
  const inFlightRef = useRef(false);

  const functionUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/chat-service`
    : "";

  const loadMessages = async (silent = false) => {
    if (!functionUrl) {
      setStatus("Missing NEXT_PUBLIC_SUPABASE_URL.");
      if (!silent) setInitialLoading(false);
      return;
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      if (!silent) {
        setStatus("Loading messages...");
      }

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "list" }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus(result?.error || `HTTP ${response.status}`);
        if (!silent) setInitialLoading(false);
        inFlightRef.current = false;
        return;
      }

      const rows = Array.isArray(result?.messages) ? result.messages : [];
      setMessages(rows);
      setStatus(`Loaded ${rows.length} messages.`);
      if (!silent) setInitialLoading(false);
    } catch (error) {
      setStatus(
        `Load error: ${error instanceof Error ? error.message : "Failed to fetch"}`
      );
      if (!silent) setInitialLoading(false);
    } finally {
      inFlightRef.current = false;
    }
  };

  useEffect(() => {
    loadMessages(false);

    pollingRef.current = window.setInterval(() => {
      loadMessages(true);
    }, 8000);

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current);
      }
    };
  }, [functionUrl]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !message.trim()) {
      setStatus("Please enter your name and a message.");
      return;
    }

    if (!functionUrl) {
      setStatus("Missing NEXT_PUBLIC_SUPABASE_URL.");
      return;
    }

    try {
      setSending(true);
      setStatus("Sending message...");

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "send",
          name: name.trim(),
          message: message.trim(),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus(result?.error || `HTTP ${response.status}`);
        setSending(false);
        return;
      }

      setMessage("");
      setStatus("Message sent.");
      setSending(false);
      await loadMessages(true);
    } catch (error) {
      setStatus(
        `Send error: ${error instanceof Error ? error.message : "Failed to fetch"}`
      );
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Back Home
          </a>

          <a
            href="/upload"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Go To Uploads
          </a>

          <a
            href="/time-reader"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Time Reader
          </a>

          <a
            href="/weather-reader"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Weather Reader
          </a>
        </div>

        <h1 className="mt-8 text-4xl font-black">Tha Core Chat</h1>
        <p className="mt-3 text-zinc-400">
          Live listener chat powered by Tha Core chat service.
        </p>

        <p className="mt-4 text-sm text-red-400">{status}</p>
        <p className="mt-2 text-sm text-green-400">
          {messages.length} listeners online
        </p>

        <div className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-zinc-900 p-6">
          {initialLoading ? (
            <p className="text-zinc-500">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-zinc-500">No messages yet.</p>
          ) : (
            messages.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 text-zinc-300">{item.message}</p>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={sendMessage}
          className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-zinc-900 p-6"
        >
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          />

          <textarea
            placeholder="Your message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
            rows={4}
          />

          <button
            type="submit"
            disabled={sending}
            className="rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </main>
  );
}
  