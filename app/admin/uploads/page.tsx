"use client";

import { useMemo, useState } from "react";

type UploadItem = {
  id: string;
  name: string;
  title: string;
  category: "song" | "photo" | "contest";
  note: string | null;
  file_path: string;
  file_url: string;
  created_at: string;
};

function isImageFile(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url);
}

function isAudioFile(url: string) {
  return /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(url);
}

export default function AdminUploadsPage() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [status, setStatus] = useState("Enter admin key, then press Refresh.");
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [adminKey, setAdminKey] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const functionUrl = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return "";
    return `${url}/functions/v1/admin-uploads`;
  }, []);

  const loadUploads = async () => {
    if (!adminKey.trim()) {
      setStatus("Enter your admin key first.");
      return;
    }

    if (!functionUrl) {
      setStatus("Missing NEXT_PUBLIC_SUPABASE_URL.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Loading uploads...");

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({ action: "list" }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus(result?.error || `HTTP ${response.status}`);
        setUploads([]);
        setLoading(false);
        return;
      }

      const rows = Array.isArray(result?.uploads) ? result.uploads : [];
      setUploads(rows);
      setStatus(`Loaded ${rows.length} uploads.`);
      setLoading(false);
    } catch (error) {
      setStatus(
        `Load error: ${error instanceof Error ? error.message : "Failed to fetch"}`
      );
      setUploads([]);
      setLoading(false);
    }
  };

  const deleteUpload = async (item: UploadItem) => {
    if (!adminKey.trim()) {
      setStatus("Enter your admin key first.");
      return;
    }

    if (!functionUrl) {
      setStatus("Missing NEXT_PUBLIC_SUPABASE_URL.");
      return;
    }

    const confirmed = window.confirm(`Delete "${item.title}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      setStatus("Deleting upload...");

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({
          action: "delete",
          id: item.id,
          file_path: item.file_path,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus(result?.error || `HTTP ${response.status}`);
        setDeletingId("");
        return;
      }

      setUploads((prev) => prev.filter((row) => row.id !== item.id));
      setStatus(
        result?.storageWarning
          ? `Upload deleted. Storage warning: ${result.storageWarning}`
          : "Upload deleted."
      );
      setDeletingId("");
    } catch (error) {
      setStatus(
        `Delete error: ${error instanceof Error ? error.message : "Failed to fetch"}`
      );
      setDeletingId("");
    }
  };

  const filteredUploads = uploads.filter((item) => {
    const matchesCategory =
      categoryFilter === "all" ? true : item.category === categoryFilter;

    const text = `${item.name} ${item.title} ${item.note || ""}`.toLowerCase();
    const matchesSearch = text.includes(search.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">
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
            href="/chat"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Go To Chat
          </a>

          <button
            type="button"
            onClick={loadUploads}
            className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Refresh
          </button>
        </div>

        <h1 className="mt-8 text-4xl font-black">Admin Upload Review</h1>

        <p className="mt-3 max-w-3xl text-zinc-400">
          Review songs, photos, and contest entries sent in by listeners.
        </p>

        <p className="mt-4 text-sm text-red-400">{status}</p>

        <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <label className="mb-3 block text-sm font-semibold text-white">
            Admin delete key
          </label>
          <input
            type="password"
            placeholder="Enter admin delete key"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none md:max-w-md"
          />
        </div>

        <div className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-zinc-900 p-6 md:grid-cols-3">
          <input
            type="text"
            placeholder="Search by name or title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          >
            <option value="all">All categories</option>
            <option value="song">Songs only</option>
            <option value="photo">Photos only</option>
            <option value="contest">Contest only</option>
          </select>

          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-zinc-300">
            Showing {filteredUploads.length} of {uploads.length} uploads
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-zinc-400">Loading uploads...</p>
            </div>
          ) : filteredUploads.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-zinc-400">No uploads found.</p>
            </div>
          ) : (
            filteredUploads.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-white/10 bg-zinc-900 p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-red-400">
                      {item.category}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">{item.title}</h2>
                    <p className="mt-2 text-zinc-300">From: {item.name}</p>
                    <p className="mt-2 text-sm text-zinc-500">
                      {new Date(item.created_at).toLocaleString()}
                    </p>

                    {item.note ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-sm text-zinc-300">{item.note}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                    >
                      Open File
                    </a>

                    <a
                      href={item.file_url}
                      download
                      className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
                    >
                      Download
                    </a>

                    <button
                      type="button"
                      onClick={() => deleteUpload(item)}
                      disabled={deletingId === item.id}
                      className="rounded-2xl border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-60"
                    >
                      {deletingId === item.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="mt-6 rounded-3xl border border-white/10 bg-black/20 p-4">
                  {item.category === "photo" || isImageFile(item.file_url) ? (
                    <img
                      src={item.file_url}
                      alt={item.title}
                      className="max-h-[420px] w-full rounded-2xl object-contain"
                    />
                  ) : item.category === "song" || isAudioFile(item.file_url) ? (
                    <audio controls className="w-full">
                      <source src={item.file_url} />
                    </audio>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 p-6">
                      <p className="text-zinc-400">
                        Preview not available for this file type.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="break-all text-sm text-zinc-400">
                    File URL: {item.file_url}
                  </p>
                  <p className="mt-2 break-all text-sm text-zinc-500">
                    File Path: {item.file_path}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}