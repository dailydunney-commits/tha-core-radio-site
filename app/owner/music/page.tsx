"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type TrackStatus = "READY" | "NEEDS CLEAN";

type TrackItem = {
  fileName: string;
  titleGuess: string;
  relativePath: string;
  sourcePath: string;
  folder: string;
  subfolder: string;
  extension: string;
  sizeBytes: number;
  modifiedAt: string;
  smartzjStatus: TrackStatus;
  statusNote: string;
  cleanUrl: string | null;
};

type LibraryResponse = {
  ok: boolean;
  mode?: string;
  readOnly?: boolean;
  sourceRoot?: string;
  trackCount?: number;
  folderCount?: number;
  capped?: boolean;
  tracks?: TrackItem[];
  error?: string;
  message?: string;
};

function formatBytes(value: number): string {
  if (!Number.isFinite(value)) return "-";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function duplicateSafeKey(track: TrackItem): string {
  const cleanTitle = track.titleGuess
    .toLowerCase()
    .replace(/\b(clean|clean version|radio edit|official audio|official video|lyrics|lyric video|music video|mp3)\b/g, " ")
    .replace(/\b\d{3,}\b/g, " ")
    .replace(/[_()[\]-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return `${track.folder || "Unsorted"}::${track.subfolder || ""}::${cleanTitle || track.fileName.toLowerCase()}`;
}

function dedupeTracks(input: TrackItem[]): TrackItem[] {
  const seen = new Set<string>();

  return input.filter((track) => {
    const key = duplicateSafeKey(track);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export default function OwnerMusicLibraryPage() {
  const [data, setData] = useState<LibraryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("ALL");

  useEffect(() => {
    let mounted = true;

    async function loadLibrary() {
      setLoading(true);

      try {
        const res = await fetch("/api/radio/music-library?limit=5000", {
          cache: "no-store",
        });
        const json = (await res.json()) as LibraryResponse;

        if (mounted) {
          setData(json);
        }
      } catch (error) {
        if (mounted) {
          setData({
            ok: false,
            error: "MUSIC_LIBRARY_FETCH_FAILED",
            message: error instanceof Error ? error.message : "Unknown fetch error",
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadLibrary();

    return () => {
      mounted = false;
    };
  }, []);

  const tracks = data?.tracks || [];

  const folders = useMemo(() => {
    return uniqueSorted(tracks.map((track) => track.folder || "Unsorted"));
  }, [tracks]);

  const filteredTracks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return dedupeTracks(tracks).filter((track) => {
      const folderMatch = selectedFolder === "ALL" || (track.folder || "Unsorted") === selectedFolder;

      if (!folderMatch) return false;

      if (!query) return true;

      const haystack = [
        track.fileName,
        track.titleGuess,
        track.relativePath,
        track.folder,
        track.subfolder,
        track.smartzjStatus,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [tracks, search, selectedFolder]);

  const readyCount = tracks.filter((track) => track.smartzjStatus === "READY").length;
  const needsCleanCount = tracks.filter((track) => track.smartzjStatus === "NEEDS CLEAN").length;

  return (
    <main data-owner-music-page="true" className="min-h-screen bg-black px-4 py-6 text-white">
        <style>{`
          /* OWNER_MUSIC_HIDE_GLOBAL_PLAYER_V1 */
          body:has(main[data-owner-music-page="true"]) div[style*="position: fixed"][style*="bottom"],
          body:has(main[data-owner-music-page="true"]) div[class*="PersistentRadioPlayer"],
          body:has(main[data-owner-music-page="true"]) div[class*="persistent"] {
            display: none !important;
          }
        `}</style>
      <section className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-red-700/60 bg-zinc-950 p-5 shadow-2xl shadow-red-950/40 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.35em] text-yellow-400">
              Owner Control Panel
            </p>
            <h1 className="mt-2 text-3xl font-black text-white md:text-5xl">
              Music Library
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-300">
              Read-only Control Panel music map. This is the first step toward turning the owner control panel itself into Tha Core&apos;s mini Azura / Playout Engine.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/owner"
              className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-bold text-zinc-100 hover:bg-zinc-900"
            >
              Back to Owner
            </Link>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-zinc-300">
            Loading music library...
          </div>
        )}

        {!loading && data && !data.ok && (
          <div className="rounded-2xl border border-red-700 bg-red-950/40 p-5">
            <h2 className="text-xl font-black text-red-200">Music library could not load</h2>
            <p className="mt-2 text-sm text-red-100">{data.error}</p>
            {data.message && <p className="mt-1 text-sm text-red-100">{data.message}</p>}
          </div>
        )}

        {!loading && data?.ok && (
          <>
            <div className="mb-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Tracks</p>
                <p className="mt-2 text-3xl font-black">{data.trackCount || 0}</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Folders</p>
                <p className="mt-2 text-3xl font-black">{data.folderCount || folders.length}</p>
              </div>
              <div className="rounded-2xl border border-green-800 bg-green-950/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-green-400">READY</p>
                <p className="mt-2 text-3xl font-black text-green-300">{readyCount}</p>
              </div>
              <div className="rounded-2xl border border-yellow-800 bg-yellow-950/20 p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-yellow-400">Needs Clean</p>
                <p className="mt-2 text-3xl font-black text-yellow-300">{needsCleanCount}</p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">Source Root</p>
              <p className="mt-2 break-all font-mono text-sm text-zinc-300">{data.sourceRoot}</p>
              {data.capped && (
                <p className="mt-2 text-sm font-bold text-yellow-300">
                  Result capped for safety. Increase limit later after page is verified.
                </p>
              )}
            </div>

            <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
              <aside className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <h2 className="mb-3 text-xl font-black">Folders</h2>

                <button
                  type="button"
                  onClick={() => setSelectedFolder("ALL")}
                  className={`mb-2 w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${
                    selectedFolder === "ALL"
                      ? "bg-red-700 text-white"
                      : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  All folders
                </button>

                <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
                  {folders.map((folder) => {
                    const count = tracks.filter((track) => (track.folder || "Unsorted") === folder).length;

                    return (
                      <button
                        key={folder}
                        type="button"
                        onClick={() => setSelectedFolder(folder)}
                        className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                          selectedFolder === folder
                            ? "bg-yellow-500 text-black"
                            : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                        }`}
                      >
                        <span className="block font-black">{folder}</span>
                        <span className="text-xs opacity-80">{count} tracks</span>
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-black">
                      {selectedFolder === "ALL" ? "All Tracks" : selectedFolder}
                    </h2>
                    <p className="text-sm text-zinc-400">{filteredTracks.length} shown</p>
                  </div>

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search song, folder, artist, status..."
                    className="w-full rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none focus:border-yellow-400 md:max-w-md"
                  />
                </div>

                <div className="overflow-auto rounded-xl border border-zinc-800">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-zinc-900 text-left text-xs uppercase tracking-[0.2em] text-zinc-400">
                      <tr>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Folder / Subfolder</th>
                        <th className="px-3 py-3">Track</th>
                        <th className="px-3 py-3">Size</th>
                        <th className="px-3 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTracks.map((track) => (
                        <tr key={track.relativePath} className="border-t border-zinc-800 align-top">
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                track.smartzjStatus === "READY"
                                  ? "bg-green-500/15 text-green-300"
                                  : "bg-yellow-500/15 text-yellow-300"
                              }`}
                            >
                              {track.smartzjStatus}
                            </span>
                            <p className="mt-2 max-w-[220px] text-xs text-zinc-500">{track.statusNote}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-bold text-white">{track.folder || "Unsorted"}</p>
                            <p className="text-xs text-zinc-400">{track.subfolder || "-"}</p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="font-bold text-white">{track.titleGuess}</p>
                            <p className="mt-1 break-all font-mono text-xs text-zinc-500">{track.relativePath}</p>
                          </td>
                          <td className="px-3 py-3 text-zinc-300">{formatBytes(track.sizeBytes)}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              {track.cleanUrl ? (
                                <a
                                  href={track.cleanUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-lg border border-green-500/60 bg-green-500/10 px-3 py-1 text-xs font-black text-green-300 hover:bg-green-500/20"
                                  title="Play verified clean copy only"
                                >
                                  Play
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-black text-zinc-500"
                                  title="Raw source preview is blocked until safety preview is added"
                                >
                                  Play
                                </button>
                              )}

                              <button
                                type="button"
                                disabled
                                className="rounded-lg border border-red-700/60 bg-red-950/30 px-3 py-1 text-xs font-black text-red-300 opacity-60"
                                title="Delete/quarantine comes in Phase 2 after read-only map is verified"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredTracks.length === 0 && (
                    <div className="p-6 text-center text-zinc-400">
                      No tracks match this filter.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

