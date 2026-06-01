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

function publicAudioFileExists(url: string) {
  const cleanUrl = String(url || "").split("?")[0].trim();

  if (!cleanUrl.startsWith("/audio/")) {
    return false;
  }

  const parts = cleanUrl.replace(/^\/+/, "").split(/[\\/]+/).filter(Boolean);
  const filePath = join(process.cwd(), "public", ...parts);

  return existsSync(filePath);
}

function pickHealLane(current: any, track: any) {
  return String(
    current?.sequence?.requestedLane ||
      current?.genreLane ||
      track?.genreLane ||
      track?.genre ||
      "Ole-School-Dancehall"
  ).trim();
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

  // CURRENT_BROADCAST_PRIORITY_V1
  // Public listener should use the approved current-broadcast handoff first
  // when it points to a clean/bleeped safe local audio file.
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const currentBroadcastPath = path.join(process.cwd(), ".data", "current-broadcast.json");

    if (fs.existsSync(currentBroadcastPath)) {
      let current = JSON.parse(fs.readFileSync(currentBroadcastPath, "utf8"));
      let track = current?.track ?? {};
      let currentAudioUrl = String(
        current?.audioUrl ||
          track?.safeAudioUrl ||
          track?.radioSafeAudioUrl ||
          track?.cleanAudioUrl ||
          track?.bleepedAudioUrl ||
          track?.processedAudioUrl ||
          track?.audioUrl ||
          ""
      ).trim();

      let currentStatus = String(current?.status || "").trim();

      if (
        currentStatus === "SMARTDJ_BROADCASTING" &&
        isSafeUrl(currentAudioUrl) &&
        !publicAudioFileExists(currentAudioUrl)
      ) {
        try {
          const healLane = pickHealLane(current, track);

          await fetch(`http://127.0.0.1:3101/api/listener/smartzj-clean-next?lane=${encodeURIComponent(healLane)}`, {
            method: "POST",
            cache: "no-store",
          });

          current = JSON.parse(fs.readFileSync(currentBroadcastPath, "utf8"));
          track = current?.track ?? {};
          currentAudioUrl = String(
            current?.audioUrl ||
              track?.safeAudioUrl ||
              track?.radioSafeAudioUrl ||
              track?.cleanAudioUrl ||
              track?.bleepedAudioUrl ||
              track?.processedAudioUrl ||
              track?.audioUrl ||
              ""
          ).trim();
          currentStatus = String(current?.status || "").trim();
        } catch {
          // If self-heal fails, do not serve the dead file.
        }
      }

      if (
        currentStatus === "SMARTDJ_BROADCASTING" &&
        isSafeUrl(currentAudioUrl) &&
        publicAudioFileExists(currentAudioUrl)
      ) {
        const title = String(
          track?.title ||
            current?.title ||
            "Approved SmartDJ Clean Track"
        ).trim();

        const artist = String(
          track?.artist ||
            current?.artist ||
            "Tha Core Online Radio"
        ).trim();

        return NextResponse.json({
          ok: true,
          mode: "CURRENT_BROADCAST",
          safety: "CLEAN_OR_BLEEPED_CURRENT_BROADCAST",
          is_online: true,
          audioUrl: currentAudioUrl,
          streamUrl: currentAudioUrl,
          listen_url: currentAudioUrl,
          station: {
            name: "Tha Core Online Radio",
            listen_url: currentAudioUrl,
            mounts: [{ name: "Current Clean Broadcast", url: currentAudioUrl, is_default: true }]
          },
          listeners: { total: 0, unique: 0, current: 0 },
          live: { is_live: true, streamer_name: "", broadcast_start: current?.startedAt || null, art: null },
          now_playing: {
            song: {
              text: `${artist} - ${title}`,
              artist,
              title,
              album: "",
              art: null
            },
            playlist: "Current Clean SmartDJ Broadcast",
            is_request: false,
            elapsed: 0,
            remaining: 0
          },
          playing_next: null,
          song_history: [],
          cache: null,
          message: "Playing approved current broadcast clean/bleeped SmartDJ audio. Raw Azura remains blocked.",
          currentBroadcast: current
        }, {
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" }
        });
      }
    }
  } catch {
    // If current-broadcast read fails, continue to safe rotation fallback below.
  }
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
if (audioUrl.includes("/audio/smartdj/test-bleeped-clean.mp3")) {
 return standby("Live listener test fallback blocked. Waiting for approved SmartZJ current broadcast.");
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

