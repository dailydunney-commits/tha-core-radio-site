import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUEUE_FILE = join(process.cwd(), ".data", "safe-rotation-queue.json");

function readQueue() {
  try {
    if (!existsSync(QUEUE_FILE)) return { cursor: 0, tracks: [] };
    return JSON.parse(readFileSync(QUEUE_FILE, "utf8"));
  } catch {
    return { cursor: 0, tracks: [] };
  }
}

function saveQueue(queue: any) {
  try {
    writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");
  } catch {}
}

function isSafeUrl(url: string) {
  const u = String(url || "").toLowerCase();
  if (!u) return false;
  if (u.includes("/listen/")) return false;
  if (u.includes("radio.mp3")) return false;
  if (u.includes("/api/smartdj/audio?src=")) return false;

  return (
    u.startsWith("/audio/") ||
    u.startsWith("/drops/") ||
    u.includes("clean") ||
    u.includes("bleep") ||
    u.includes("processed") ||
    u.includes("safe")
  );
}

function standby(message: string) {
  return NextResponse.json({
    ok: true,
    mode: "SAFE_STANDBY",
    safety: "PUBLIC_RAW_FALLBACK_BLOCKED",
    is_online: false,
    audioUrl: "",
    streamUrl: "",
    listen_url: "",
    station: { name: "Tha Core Online Radio", listen_url: "", mounts: [] },
    listeners: { total: 0, unique: 0, current: 0 },
    live: { is_live: false, streamer_name: "", broadcast_start: null, art: null },
    now_playing: {
      song: {
        text: "Safe Broadcast Standby",
        artist: "Tha Core Online Radio",
        title: "Safe Broadcast Standby",
        album: "",
        art: null
      },
      playlist: "Safety Brain",
      is_request: false,
      elapsed: 0,
      remaining: 0
    },
    playing_next: null,
    song_history: [],
    cache: null,
    message
  }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}

export async function GET(request: NextRequest) {
  const shouldAdvance = new URL(request.url).searchParams.get("advance") === "1";
  const queue = readQueue();

  const tracks = Array.isArray(queue.tracks)
    ? queue.tracks.filter((track: any) => isSafeUrl(track.audioUrl || track.streamUrl || track.url))
    : [];

  if (!tracks.length) {
    return standby("No approved tracks in safe rotation queue.");
  }

  let cursor = Number.isFinite(Number(queue.cursor)) ? Number(queue.cursor) : 0;
  cursor = Math.max(0, cursor) % tracks.length;

  if (shouldAdvance) {
    cursor = (cursor + 1) % tracks.length;
    queue.cursor = cursor;
    saveQueue(queue);
  }

  const track = tracks[cursor];
  const audioUrl = String(track.audioUrl || track.streamUrl || track.url || "").trim();

  if (!isSafeUrl(audioUrl)) {
    return standby("Selected audio blocked by public safety gate.");
  }

  const title = String(track.title || "Safe Rotation Track").trim();
  const artist = String(track.artist || "Tha Core Online Radio").trim();

  return NextResponse.json({
    ok: true,
    mode: "CURRENT_BROADCAST",
    safety: "CLEAN_OR_BLEEPED_SAFE_ROTATION",
    is_online: true,
    audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    station: {
      name: "Tha Core Online Radio",
      listen_url: audioUrl,
      mounts: [{ name: "Safe Rotation Output", url: audioUrl, is_default: true }]
    },
    listeners: { total: 0, unique: 0, current: 0 },
    live: { is_live: true, streamer_name: "", broadcast_start: null, art: null },
    now_playing: {
      song: { text: `${artist} - ${title}`, artist, title, album: "", art: null },
      playlist: "Safe Rotation Queue",
      is_request: false,
      elapsed: 0,
      remaining: 0
    },
    playing_next: null,
    song_history: [],
    cache: null,
    message: shouldAdvance
      ? "Advanced to next approved safe track."
      : "Playing approved safe rotation track. Raw Azura remains blocked."
  }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
}
