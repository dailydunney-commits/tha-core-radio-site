import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyTrack = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const SMARTDJ_STATE_FILE = join(DATA_DIR, "smartdj-state.json");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");
const PLAYER_STATE_FILE = join(DATA_DIR, "smartzj-mini-autonext.json");

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!existsSync(filePath)) return fallback;
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, value: unknown) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function pickSafeUrl(track: AnyTrack) {
  return cleanText(
    track.safeAudioUrl ||
      track.radioSafeAudioUrl ||
      track.cleanAudioUrl ||
      track.bleepedAudioUrl ||
      track.processedAudioUrl ||
      track.audioUrl ||
      track.streamUrl ||
      track.url ||
      ""
  );
}

function isRawAzuraUrl(url: string) {
  const text = url.toLowerCase();

  return (
    text.includes("/listen/") ||
    text.includes("radio.mp3") ||
    text.includes("/api/station/") ||
    text.includes("/files/download") ||
    text.includes("/api/smartdj/audio?src=")
  );
}

function isSafeCleanUrl(url: string) {
  const text = url.toLowerCase();

  if (!url) return false;
  if (isRawAzuraUrl(url)) return false;

  return (
    text.startsWith("/audio/") ||
    text.includes("clean") ||
    text.includes("bleep") ||
    text.includes("processed") ||
    text.includes("safe")
  );
}

function readSmartTracks() {
  const state = readJson<Record<string, any>>(SMARTDJ_STATE_FILE, {});
  const buckets = [
    state.playlist,
    state.lastPlaylist,
    state.tracks,
    state.lastResult?.playlist,
    state.result?.playlist,
  ];

  const merged: AnyTrack[] = [];

  for (const bucket of buckets) {
    if (Array.isArray(bucket)) merged.push(...bucket.filter(Boolean));
  }

  const seen = new Set<string>();

  return merged.filter((track) => {
    const audioUrl = pickSafeUrl(track);
    const id = cleanText(track.id || track.trackId || track.title || audioUrl);
    const key = `${id}|${audioUrl}`;

    if (!id || !audioUrl || seen.has(key)) return false;
    seen.add(key);

    const status = cleanText(track.status).toUpperCase();
    const safetyStatus = cleanText(track.safetyStatus).toUpperCase();
    const cleanStatus = cleanText(track.cleanStatus || track.bleepJobStatus).toUpperCase();

    const ready =
      status === "READY" ||
      safetyStatus === "READY" ||
      cleanStatus === "PROCESSED_AUDIO_READY";

    return (
      ready &&
      isSafeCleanUrl(audioUrl) &&
      track.held !== true &&
      track.needsBleep !== true
    );
  });
}

function getCurrentKey() {
  const current = readJson<Record<string, any>>(CURRENT_BROADCAST_FILE, {});
  const track = current.track || {};

  return cleanText(
    track.id ||
      track.trackId ||
      current.trackId ||
      current.id ||
      current.title ||
      current.audioUrl ||
      ""
  );
}

function getTrackKey(track: AnyTrack) {
  return cleanText(track.id || track.trackId || track.title || pickSafeUrl(track));
}

function titleFromTrack(track: AnyTrack) {
  return cleanText(track.title || track.name || track.id || track.trackId || "SmartZJ Clean Track");
}

function artistFromTrack(track: AnyTrack) {
  return cleanText(track.artist || "AzuraCast");
}

function runMiniAutoNext() {
  const cleanTracks = readSmartTracks();

  if (!cleanTracks.length) {
    return NextResponse.json(
      {
        ok: false,
        route: "/api/listener/smartzj-clean-next",
        action: "SMARTZJ_MINI_AUTONEXT",
        status: "NO_READY_CLEAN_TRACKS",
        message: "No READY clean/bleeped SmartZJ rows found. Raw Azura remains blocked.",
      },
      {
        status: 423,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }

  const playerState = readJson<Record<string, any>>(PLAYER_STATE_FILE, {});
  const currentKey = getCurrentKey();

  let currentIndex = cleanTracks.findIndex((track) => getTrackKey(track) === currentKey);

  if (currentIndex < 0 && typeof playerState.index === "number") {
    currentIndex = playerState.index;
  }

  const nextIndex = ((currentIndex + 1) % cleanTracks.length + cleanTracks.length) % cleanTracks.length;
  const track = cleanTracks[nextIndex];
  const audioUrl = pickSafeUrl(track);
  const now = new Date().toISOString();

  const title = titleFromTrack(track);
  const artist = artistFromTrack(track);

  const broadcast = {
    ok: true,
    status: "SMARTDJ_BROADCASTING",
    source: "SMARTDJ",
    title,
    artist,
    audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    startedAt: now,
    updatedAt: now,
    message: `SmartZJ Mini AutoNext item ${nextIndex + 1} of ${cleanTracks.length}. Raw Azura blocked.`,
    sequence: {
      mode: "SMARTZJ_MINI_AUTONEXT",
      index: nextIndex,
      itemNumber: nextIndex + 1,
      total: cleanTracks.length,
      isLast: nextIndex + 1 === cleanTracks.length,
    },
    track: {
      ...track,
      id: cleanText(track.id || track.trackId || title),
      trackId: cleanText(track.trackId || track.id || title),
      title,
      artist,
      source: "SMARTDJ",
      audioUrl,
      cleanAudioUrl: audioUrl,
      processedAudioUrl: audioUrl,
      streamUrl: audioUrl,
      cleanStatus: "PROCESSED_AUDIO_READY",
      safetyStatus: "READY",
      status: "READY",
      needsBleep: false,
      held: false,
      rawAudioBlocked: true,
    },
  };

  writeJson(CURRENT_BROADCAST_FILE, broadcast);
  writeJson(PLAYER_STATE_FILE, {
    ok: true,
    mode: "SMARTZJ_MINI_AUTONEXT",
    index: nextIndex,
    total: cleanTracks.length,
    currentTitle: title,
    currentArtist: artist,
    currentAudioUrl: audioUrl,
    updatedAt: now,
  });

  return NextResponse.json(
    {
      ok: true,
      route: "/api/listener/smartzj-clean-next",
      action: "SMARTZJ_MINI_AUTONEXT",
      cleanTrackCount: cleanTracks.length,
      index: nextIndex,
      itemNumber: nextIndex + 1,
      isLast: nextIndex + 1 === cleanTracks.length,
      title,
      artist,
      audioUrl,
      streamUrl: audioUrl,
      listen_url: audioUrl,
      message: "SmartZJ Mini AutoNext handed off the next READY clean/bleeped track.",
      currentBroadcast: broadcast,
    },
    {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    }
  );
}

export async function GET() {
  return runMiniAutoNext();
}

export async function POST() {
  return runMiniAutoNext();
}
