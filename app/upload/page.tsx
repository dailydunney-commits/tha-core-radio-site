"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type UploadCategory = "song" | "photo" | "contest";

export default function UploadPage() {
  const supabase = useMemo(() => createClient(), []);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<UploadCategory>("song");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Ready.");
  const [loading, setLoading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState("");

  const getAcceptValue = () => {
    if (category === "song") return "audio/*";
    if (category === "photo") return "image/*";
    return "image/*,audio/*";
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);

    if (selectedFile) {
      setStatus(`File selected: ${selectedFile.name}`);
    } else {
      setStatus("No file selected.");
    }
  };

  const sendUpload = async (e: FormEvent) => {
    e.preventDefault();

    try {
      if (!name.trim() || !title.trim() || !file) {
        setStatus("Please enter your name, title, and choose a file.");
        return;
      }

      setLoading(true);
      setUploadedUrl("");
      setStatus("Starting upload...");

      const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
      const safeId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 10)}`;
      const filePath = `${category}/${safeId}.${extension}`;

      setStatus("Uploading file to storage...");

      const { error: uploadError } = await supabase.storage
        .from("listener_uploads")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        setStatus(`Upload error: ${uploadError.message}`);
        return;
      }

      setStatus("File uploaded. Getting public URL...");

      const { data: publicUrlData } = supabase.storage
        .from("listener_uploads")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;
      setUploadedUrl(publicUrl);

      setStatus("Saving upload info to database...");

      const { error: insertError } = await supabase
        .from("listener_uploads")
        .insert({
          name: name.trim(),
          title: title.trim(),
          category,
          note: note.trim(),
          file_path: filePath,
          file_url: publicUrl,
        });

      if (insertError) {
        setStatus(`Database error: ${insertError.message}`);
        return;
      }

      setStatus("Upload sent successfully.");
      setTitle("");
      setNote("");
      setFile(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown upload error.";
      setStatus(`Unexpected error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <a
            href="/"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Back Home
          </a>

          <a
            href="/chat"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Go To Chat
          </a>
        </div>

        <h1 className="mt-8 text-4xl font-black">Listener Uploads</h1>

        <p className="mt-3 max-w-2xl text-zinc-400">
          Let listeners send songs, photos, and contest entries to Tha Core.
        </p>

        <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="text-sm text-red-300">{status}</p>
          {file ? (
            <p className="mt-2 text-sm text-zinc-400">
              Current file: {file.name}
            </p>
          ) : null}
        </div>

        <form
          onSubmit={sendUpload}
          className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-zinc-900 p-6"
        >
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          />

          <input
            type="text"
            placeholder="Song title, photo title, or entry title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as UploadCategory)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          >
            <option value="song">Song Upload</option>
            <option value="photo">Photo Upload</option>
            <option value="contest">Contest Entry</option>
          </select>

          <textarea
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
            rows={4}
          />

          <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4">
            <p className="text-sm text-zinc-400">
              Accepted{" "}
              {category === "song"
                ? "audio files"
                : category === "photo"
                  ? "image files"
                  : "image or audio files"}
            </p>

            <input
              type="file"
              accept={getAcceptValue()}
              onChange={handleFileChange}
              className="mt-3 block w-full text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {loading ? "Uploading..." : "Send Upload"}
          </button>

          {uploadedUrl ? (
            <p className="break-all text-sm text-green-400">
              Uploaded file URL: {uploadedUrl}
            </p>
          ) : null}
        </form>
      </div>
    </main>
  );
}