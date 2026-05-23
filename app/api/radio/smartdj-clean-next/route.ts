import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const SMARTDJ_STATE_FILE = join(DATA_DIR, "smartdj-state.json");
const SMARTDJ_QUEUE_FILE = join(DATA_DIR, "smartdj-safety-queue.json");
const PLAYER_FILE = join(DATA_DIR, "smartdj-clean-player.json");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!existsSync(filePath)) return fallback;
    const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function listFromState(state: AnyRecord): AnyRecord[] {
  if (Array.isArray(state.playlist)) return state.playlist.filter(Boolean);
  if (Array.isArray(state.lastPlaylist)) return state.lastPlaylist.filter(Boolean);
  if (Array.isArray(state.lastResult?.playlist)) return state.lastResult.playlist.filter(Boolean);
  return [];
}

function listFromQueue(queue: unknown): AnyRecord[] {
  if (!Array.isArray(queue)) return [];

  return queue
    .map((item: any) => item?.track ?? item)
    .filter(Boolean);
}

function pickCleanUrl(track: AnyRecord) {
  const choices = [
    track.safeAudioUrl,
    track.radioSafeAudioUrl,
    track.cleanAudioUrl,
    track.bleepedAudioUrl,
    track.processedAudioUrl,
    track.audioUrl,
  ];

  for (const value of choices) {
    const url = cleanText(value);

    if (url.startsWith("/audio/smartdj/clean/")) {
      return url;
    }
  }

  return "";
}

function isCleanReady(track: AnyRecord) {
  const cleanUrl = pickCleanUrl(track);

  return Boolean(
    cleanUrl &&
      cleanText(track.cleanStatus) === "PROCESSED_AUDIO_READY" &&
      cleanText(track.safetyStatus) === "READY" &&
      track.held === false &&
      track.needsBleep === false
  );
}

function getCleanTracks() {
  const state = readJsonFile<AnyRecord>(SMARTDJ_STATE_FILE, {});
  const stateTracks = listFromState(state).filter(isCleanReady);

  if (stateTracks.length > 0) {
    return stateTracks;
  }

  const queue = readJsonFile<unknown>(SMARTDJ_QUEUE_FILE, []);
  return listFromQueue(queue).filter(isCleanReady);
}

function makeBroadcastState(track: AnyRecord, cleanUrl: string, index: number, total: number) {
  const title = cleanText(track.title || `SmartDJ Clean Track ${index + 1}`);
  const artist = cleanText(track.artist || "SmartDJ");

  return {
    ok: true,
    status: "SMARTDJ_BROADCASTING",
    source: "SMARTDJ",
    title,
    artist,
    audioUrl: cleanUrl,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    message: `SmartDJ clean AutoNext item ${index + 1} of ${total}.`,
    sequence: {
      mode: "SMARTDJ_CLEAN_AUTONEXT",
      index,
      itemNumber: index + 1,
      total,
      isLast: index + 1 >= total,
    },
    track: {
      id: cleanText(track.id || track.trackId || title),
      trackId: cleanText(track.trackId || track.id || title),
      title,
      artist,
      source: "SMARTDJ",
      audioUrl: cleanUrl,
      cleanAudioUrl: cleanUrl,
      processedAudioUrl: cleanUrl,
      cleanStatus: "PROCESSED_AUDIO_READY",
      safetyStatus: "READY",
      status: "READY",
      bleepJobStatus: "PROCESSED_AUDIO_READY",
      needsBleep: false,
      held: false,
      rawAudioBlocked: true,
    },
  };
}

async function runCleanNext(request?: NextRequest) {
  let action = "NEXT";

  if (request) {
    try {
      const body = await request.json().catch(() => ({}));
      action = cleanText(body?.action || "NEXT").toUpperCase();
    } catch {
      action = "NEXT";
    }
  }

  const cleanTracks = getCleanTracks();
  const total = cleanTracks.length;

  if (!total) {
    return NextResponse.json(
      {
        ok: false,
        route: "/api/radio/smartdj-clean-next",
        action,
        status: "NO_CLEAN_SMARTDJ_TRACKS",
        message: "No clean SmartDJ tracks found. AutoNext refused to play raw audio.",
      },
      { status: 423 }
    );
  }

  let player = readJsonFile<AnyRecord>(PLAYER_FILE, {
    index: -1,
    total,
    mode: "SMARTDJ_CLEAN_AUTONEXT",
  });

  if (action === "RESET") {
    player.index = -1;
  }

  if (action === "STATUS") {
    return NextResponse.json({
      ok: true,
      route: "/api/radio/smartdj-clean-next",
      action,
      player,
      cleanTrackCount: total,
      tracks: cleanTracks.map((track) => ({
        title: cleanText(track.title),
        artist: cleanText(track.artist),
        audioUrl: pickCleanUrl(track),
        cleanStatus: track.cleanStatus,
        safetyStatus: track.safetyStatus,
        held: track.held,
        needsBleep: track.needsBleep,
      })),
    });
  }

  const currentIndex = Number.isFinite(Number(player.index)) ? Number(player.index) : -1;
  const nextIndex = (currentIndex + 1) % total;
  const track = cleanTracks[nextIndex];
  const cleanUrl = pickCleanUrl(track);

  if (!cleanUrl) {
    return NextResponse.json(
      {
        ok: false,
        route: "/api/radio/smartdj-clean-next",
        action,
        status: "CLEAN_URL_MISSING",
        message: "SmartDJ AutoNext blocked because the selected row has no clean processed URL.",
      },
      { status: 423 }
    );
  }

  const broadcastState = makeBroadcastState(track, cleanUrl, nextIndex, total);

  writeJsonFile(CURRENT_BROADCAST_FILE, broadcastState);

  const nextPlayerState = {
    ok: true,
    mode: "SMARTDJ_CLEAN_AUTONEXT",
    index: nextIndex,
    itemNumber: nextIndex + 1,
    total,
    currentTitle: broadcastState.title,
    currentArtist: broadcastState.artist,
    currentAudioUrl: cleanUrl,
    updatedAt: new Date().toISOString(),
  };

  writeJsonFile(PLAYER_FILE, nextPlayerState);

  return NextResponse.json({
    ok: true,
    route: "/api/radio/smartdj-clean-next",
    action: "SMARTDJ_CLEAN_AUTONEXT",
    cleanTrackCount: total,
    index: nextIndex,
    itemNumber: nextIndex + 1,
    isLast: nextIndex + 1 >= total,
    title: broadcastState.title,
    artist: broadcastState.artist,
    audioUrl: cleanUrl,
    message: "SmartDJ clean AutoNext handed off one clean processed track to current broadcast.",
    player: nextPlayerState,
    currentBroadcast: broadcastState,
  });
}

export async function GET(request: NextRequest) {
  return runCleanNext(request);
}

export async function POST(request: NextRequest) {
  return runCleanNext(request);
}
