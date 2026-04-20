"use client";

import { useMemo, useState } from "react";

export default function UploadPage() {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("song");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState("Ready for uploads.");
  const [uploading, setUploading] = useState(false);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const ready = useMemo(() => {
    return Boolean(supabaseUrl && supabaseKey);
  }, [supabaseUrl, supabaseKey]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!ready) {
      setStatus("Missing Supabase environment variables.");
      return;
    }

    if (!name.trim()) {
      setStatus("Please enter your name.");
      return;
    }

    if (!title.trim()) {
      setStatus("Please enter a title.");
      return;
    }

    if (!file) {
      setStatus("Please choose a file.");
      return;
    }

    try {
      setUploading(true);
      setStatus("Uploading file...");

      const { createClient } = await import("@supabase/supabase-js");

      const supabase = createClient(supabaseUrl!, supabaseKey!);

      const safeCategory = category.trim().toLowerCase();
      const safeFileName = file.name.replace(/\s+/g, "-");
      const uniquePath = `${safeCategory}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("listener_uploads")
        .upload(uniquePath, file, {
          upsert: false,
          contentType: file.type || undefined,
        });

      if (uploadError) {
        setStatus(`Upload error: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: publicData } = supabase.storage
        .from("listener_uploads")
        .getPublicUrl(uniquePath);

      const fileUrl = publicData?.publicUrl || "";
      const filePath = uniquePath;

      setStatus("Saving upload details...");

      const payload: any = {
        name: name.trim(),
        title: title.trim(),
        category: safeCategory,
        file_url: fileUrl,
        file_path: filePath,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await (supabase as any)
        .from("listener_uploads")
        .insert([payload]);

      if (insertError) {
        setStatus(`Database error: ${insertError.message}`);
        setUploading(false);
        return;
      }

      setName("");
      setTitle("");
      setCategory("song");
      setFile(null);
      setStatus("Upload sent successfully.");
      setUploading(false);

      const fileInput = document.getElementById(
        "listener-file"
      ) as HTMLInputElement | null;

      if (fileInput) {
        fileInput.value = "";
      }
    } catch (error) {
      setStatus(
        `Unexpected error: ${
          error instanceof Error ? error.message : "Something went wrong"
        }`
      );
      setUploading(false);
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
            href="/chat"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Go To Chat
          </a>

          <a
            href="/admin/uploads"
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Admin Review
          </a>
        </div>

        <h1 className="mt-8 text-4xl font-black">Tha Core Uploads</h1>
        <p className="mt-3 text-zinc-400">
          Send songs, photos, and contest entries to Tha Core.
        </p>

        <p className="mt-4 text-sm text-red-400">{status}</p>

        <form
          onSubmit={handleSubmit}
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
            placeholder="Title of song, photo, or entry"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none"
          >
            <option value="song">Song</option>
            <option value="photo">Photo</option>
            <option value="contest">Contest</option>
          </select>

          <input
            id="listener-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 outline-none file:mr-4 file:rounded-xl file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white"
          />

          <button
            type="submit"
            disabled={uploading}
            className="rounded-2xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Send Upload"}
          </button>
        </form>
      </div>
    </main>
  );
}