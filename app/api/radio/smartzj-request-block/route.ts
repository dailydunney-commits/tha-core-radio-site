import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const REQUEST_BLOCK_FILE = join(DATA_DIR, "smartzj-request-block.json");
const SMARTDJ_STATE_FILE = join(DATA_DIR, "smartdj-state.json");
const SMARTZJ_LIVE_READY_POOL_FILE = join(DATA_DIR, "smartzj-live-ready-pool.json");

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(official|music|video|audio|mp3|clean|version|radio|edit|lyric|lyrics|visualizer|ft|feat|featuring)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function readJson<T>(filePath: string, fallback: T): T {
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: unknown) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function pickSafeUrl(track: AnyRecord) {
  return cleanText(
    track.safeAudioUrl ||
      track.radioSafeAudioUrl ||
      track.cleanAudioUrl ||
      track.bleepedAudioUrl ||
      track.processedAudioUrl ||
      ""
  );
}

function isCleanReadyTrack(track: AnyRecord) {
  const audioUrl = pickSafeUrl(track);
  const status = cleanText(track.status).toUpperCase();
  const safetyStatus = cleanText(track.safetyStatus).toUpperCase();
  const cleanStatus = cleanText(track.cleanStatus || track.bleepJobStatus).toUpperCase();

  return (
    audioUrl.startsWith("/audio/smartdj/clean/") &&
    track.held !== true &&
    track.needsBleep !== true &&
    (status === "READY" ||
      safetyStatus === "READY" ||
      cleanStatus === "PROCESSED_AUDIO_READY")
  );
}

function collectTracks(value: unknown, output: AnyRecord[]) {
  if (!value) return;

  if (Array.isArray(value)) {
    for (const item of value) collectTracks(item, output);
    return;
  }

  if (typeof value !== "object") return;

  const record = value as AnyRecord;
  const title = cleanText(record.title || record.name || record.trackTitle);
  const audioUrl = pickSafeUrl(record);

  if (title || audioUrl) {
    output.push(record);
  }

  for (const key of ["tracks", "playlist", "lastPlaylist", "queue", "items", "results"]) {
    collectTracks(record[key], output);
  }
}

function getCleanReadyTracks() {
  const tracks: AnyRecord[] = [];

  collectTracks(readJson<AnyRecord>(SMARTDJ_STATE_FILE, {}), tracks);
  collectTracks(readJson<AnyRecord>(SMARTZJ_LIVE_READY_POOL_FILE, {}), tracks);

  const seen = new Set<string>();

  return tracks.filter((track) => {
    if (!isCleanReadyTrack(track)) return false;

    const audioUrl = pickSafeUrl(track);
    const key = cleanText(track.trackId || track.id || track.title || audioUrl);

    if (!key || seen.has(`${key}|${audioUrl}`)) return false;
    seen.add(`${key}|${audioUrl}`);

    return true;
  });
}

function findCleanReadyMatch(title: string, artist: string) {
  const titleKey = normalize(title);
  const artistKey = normalize(artist);

  if (!titleKey && !artistKey) return null;

  const tracks = getCleanReadyTracks();

  return (
    tracks.find((track) => {
      const trackTitle = normalize(track.title || track.name || track.trackTitle);
      const trackArtist = normalize(track.artist || "");

      const titleMatch =
        titleKey &&
        (trackTitle.includes(titleKey) || titleKey.includes(trackTitle));

      const artistMatch =
        !artistKey ||
        (trackArtist && (trackArtist.includes(artistKey) || artistKey.includes(trackArtist)));

      return Boolean(titleMatch && artistMatch);
    }) || null
  );
}

function readRequestBlock() {
  return readJson<AnyRecord>(REQUEST_BLOCK_FILE, {
    ok: true,
    blockType: "SONG_REQUESTS",
    policy:
      "Listener requests must use clean/bleeped READY audio only. Requests wait when active schedule block prioritizes schedule over requests.",
    queue: [],
    updatedAt: new Date().toISOString(),
  });
}

function saveRequestBlock(block: AnyRecord) {
  const cleanBlock = {
    ok: true,
    blockType: "SONG_REQUESTS",
    policy:
      "Listener requests must use clean/bleeped READY audio only. Requests wait when active schedule block prioritizes schedule over requests.",
    queue: Array.isArray(block.queue) ? block.queue : [],
    updatedAt: new Date().toISOString(),
  };

  writeJson(REQUEST_BLOCK_FILE, cleanBlock);
  return cleanBlock;
}

export async function GET() {
  const block = readRequestBlock();

  return NextResponse.json(block, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  const title = cleanText(body.title || body.song || body.request || body.text);
  const artist = cleanText(body.artist);
  const requestedBy = cleanText(body.requestedBy || body.name || body.listener || "Listener");
  const note = cleanText(body.note || body.message || body.dedication);
  const action = cleanText(body.action).toLowerCase();

  const block = readRequestBlock();
  const queue = Array.isArray(block.queue) ? block.queue : [];

  if (action === "clear_completed") {
    return NextResponse.json(
      saveRequestBlock({
        ...block,
        queue: queue.filter((item: AnyRecord) => item.status !== "PLAYED" && item.status !== "CANCELLED"),
      })
    );
  }

  if (!title) {
    return NextResponse.json(
      { ok: false, error: "Missing request title/song." },
      { status: 400 }
    );
  }

  const match = findCleanReadyMatch(title, artist);
  const now = new Date().toISOString();
  const requestId = `request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const requestItem = {
    id: requestId,
    requestId,
    blockType: "SONG_REQUESTS",
    title,
    artist,
    requestedBy,
    note,
    status: match ? "REQUEST_READY" : "REQUEST_NEEDS_CLEAN",
    ready: Boolean(match),
    priority: "REQUEST_PRIORITY_NEXT",
    cleanGateRequired: true,
    rawAzuraBlocked: true,
    createdAt: now,
    updatedAt: now,
    track: match
      ? {
          id: cleanText(match.id || match.trackId || match.title),
          trackId: cleanText(match.trackId || match.id || match.title),
          title: cleanText(match.title || title),
          artist: cleanText(match.artist || artist || "AzuraCast"),
          genreLane: cleanText(match.genreLane || match.lane || match.folder || ""),
          audioUrl: pickSafeUrl(match),
          cleanAudioUrl: pickSafeUrl(match),
          processedAudioUrl: pickSafeUrl(match),
          safetyStatus: "READY",
          cleanStatus: "PROCESSED_AUDIO_READY",
          needsBleep: false,
          held: false,
          rawAudioBlocked: true,
        }
      : null,
    message: match
      ? "Request matched to an existing clean/bleeped READY SmartZJ track."
      : "Request saved but needs clean/bleep processing before it can play.",
  };

  const saved = saveRequestBlock({
    ...block,
    queue: [...queue, requestItem].slice(-200),
  });

  return NextResponse.json({
    ok: true,
    action: "REQUEST_BLOCK_ITEM_ADDED",
    item: requestItem,
    block: saved,
  });
}
