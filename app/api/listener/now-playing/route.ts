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

// AI_HOST_LISTENER_AUDIO_SAFE_URL_V1
function isAiHostListenerAudioUrl(url: string) {
  const cleanUrl = String(url || "").toLowerCase().trim();
  return (
    cleanUrl.startsWith("/api/listener/ai-host-audio?file=") &&
    cleanUrl.includes(".mp3") &&
    !cleanUrl.includes("..") &&
    !cleanUrl.includes("\\")
  );
}

function isSafeUrl(url: string) {
  const u = String(url || "").toLowerCase();
  if (!u) return false;
  if (isAiHostListenerAudioUrl(u)) return true;
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

// AI_HOST_APPROVED_CURRENT_BROADCAST_AUDIO_V1
function isApprovedCurrentBroadcastAudioUrl(url: string) {
  const cleanUrl = String(url || "").trim();
  return (
    isAiHostListenerAudioUrl(cleanUrl) ||
    cleanUrl.startsWith("/drops/") ||
    publicAudioFileExists(cleanUrl)
  );
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

function getElapsedSecondsFromStartedAt(startedAt: any) {
  const startedAtMs = Date.parse(String(startedAt || ""));

  if (!Number.isFinite(startedAtMs)) return 0;

  return Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
}

function getDurationSecondsFromTrack(current: any, track: any) {
  const raw =
    track?.durationSeconds ??
    current?.durationSeconds ??
    current?.track?.durationSeconds ??
    current?.sequence?.durationSeconds ??
    0;

  const value = Number(raw);

  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function getRemainingSeconds(current: any, track: any) {
  const duration = getDurationSecondsFromTrack(current, track);
  const elapsed = getElapsedSecondsFromStartedAt(current?.startedAt);

  return duration > 0 ? Math.max(0, duration - elapsed) : 0;
}
async function trySmartZjRecovery(reason: string) {
  try {
    const res = await fetch("http://127.0.0.1:3101/api/listener/smartzj-clean-next?lane=schedule", {
      method: "POST",
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    const audioUrl = String(data?.audioUrl || data?.streamUrl || data?.listen_url || "").trim();

    if (!audioUrl || !isSafeUrl(audioUrl) || !isApprovedCurrentBroadcastAudioUrl(audioUrl)) return null;

    const title = String(data?.title || data?.currentBroadcast?.title || "Approved SmartZJ Track").trim();
    const artist = String(data?.artist || data?.currentBroadcast?.artist || "Tha Core Online Radio").trim();

    return NextResponse.json({
      ok: true,
      mode: "CURRENT_BROADCAST",
      safety: "CLEAN_OR_BLEEPED_CURRENT_BROADCAST",
      is_online: true,
      audioUrl,
      streamUrl: audioUrl,
      listen_url: audioUrl,
      station: {
        name: "Tha Core Online Radio",
        listen_url: audioUrl,
        mounts: [{ name: "Recovered SmartZJ Current Broadcast", url: audioUrl, is_default: true }]
      },
      listeners: { total: 0, unique: 0, current: 0 },
      live: { is_live: true, streamer_name: "", broadcast_start: data?.currentBroadcast?.startedAt || null, art: null },
      now_playing: {
        song: { text: `${artist} - ${title}`, artist, title, album: "", art: null },
        playlist: "Recovered Clean SmartZJ Broadcast",
        is_request: false,
        elapsed: getElapsedSecondsFromStartedAt(data?.currentBroadcast?.startedAt || data?.startedAt),
        remaining: getRemainingSeconds(data?.currentBroadcast || data, data?.currentBroadcast?.track || data?.track || {})
      },
      playing_next: null,
      song_history: [],
      cache: null,
      recoveryReason: reason,
      message: "Recovered listener output through SmartZJ clean-next instead of falling to standby. Raw Azura remains blocked.",
      currentBroadcast: data?.currentBroadcast || data,
    }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } });
  } catch {
    return null;
  }

  return null;
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

   // AI_HOST_LONG_SHOW_CURRENT_BROADCAST_PRIORITY_V1
   const currentSource = String(current?.source || track?.source || "").trim();
   const currentType = String(current?.type || track?.type || "").trim();
   const sequenceMode = String(current?.sequence?.mode || "").trim();

   const isAiHostLongShowCurrent =
     currentSource === "AI_HOST_LONG_SHOW" ||
     currentType === "AI_HOST_LONG_SHOW" ||
     sequenceMode === "AI_HOST_LONG_SHOW_LIVE_RUNNER" ||
     current?.longShowProgram === true ||
     track?.longShowProgram === true;

   if (
     isAiHostLongShowCurrent &&
     isSafeUrl(currentAudioUrl) &&
     isApprovedCurrentBroadcastAudioUrl(currentAudioUrl)
   ) {
     const title = String(
       track?.title ||
         current?.title ||
         current?.sequence?.segmentTitle ||
         "Tha Core Long Show"
     ).trim();

     const artist = String(
       track?.artist ||
         current?.artist ||
         "Prodigy & Diamond from Tha Core"
     ).trim();

     return NextResponse.json({
       ok: true,
       mode: "CURRENT_BROADCAST",
       safety: "CLEAN_OR_BLEEPED_CURRENT_BROADCAST",
       source: "AI_HOST_LONG_SHOW",
       type: "AI_HOST_LONG_SHOW",
       programId: current?.programId || track?.programId || current?.sequence?.programId || null,
       programName: current?.programName || track?.programName || null,
       programSlot: current?.programSlot || track?.programSlot || null,
       is_online: true,
       audioUrl: currentAudioUrl,
       streamUrl: currentAudioUrl,
       listen_url: currentAudioUrl,
       cleanAudioUrl: currentAudioUrl,
       title,
       artist,
       station: {
         name: "Tha Core Online Radio",
         listen_url: currentAudioUrl,
         mounts: [{ name: "AI Host Long Show Current Broadcast", url: currentAudioUrl, is_default: true }]
       },
       listeners: { total: 0, unique: 0, current: 0 },
       live: {
         is_live: true,
         streamer_name: "Prodigy & Diamond",
         broadcast_start: current?.startedAt || null,
         art: null
       },
       now_playing: {
         song: { text: `${artist} - ${title}`, artist, title, album: "", art: null },
         playlist: current?.programName || "Tha Core Long Show",
         is_request: false,
         elapsed: getElapsedSecondsFromStartedAt(current?.startedAt),
         remaining: getRemainingSeconds(current, track)
       },
       playing_next: null,
       song_history: [],
       cache: null,
       message: "Playing AI host long-show current broadcast. Raw Azura remains blocked.",
       currentBroadcast: current
     }, {
       headers: { "Cache-Control": "no-store, no-cache, must-revalidate" }
     });
   }



      if (
        currentStatus === "SMARTDJ_BROADCASTING" &&
      isSafeUrl(currentAudioUrl) &&
   !isApprovedCurrentBroadcastAudioUrl(currentAudioUrl)
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
      isApprovedCurrentBroadcastAudioUrl(currentAudioUrl)
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
            elapsed: getElapsedSecondsFromStartedAt(current?.startedAt),
         remaining: getRemainingSeconds(current, track)
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
 const recovered = await trySmartZjRecovery("TEST_FALLBACK_BLOCKED");
 if (recovered) return recovered;

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

