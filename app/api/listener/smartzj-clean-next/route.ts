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
const FRESH_FIRST_STATE_FILE = join(DATA_DIR, "smartzj-fresh-first-queue.json");
const BACKGROUND_CLEAN_STATE_FILE = join(DATA_DIR, "smartdj-background-clean-state.json");
const SMARTZJ_LIVE_READY_POOL_FILE = join(DATA_DIR, "smartzj-live-ready-pool.json");
const SMARTZJ_EMERGENCY_HOLD_FILE = join(DATA_DIR, "smartzj-emergency-hold.json");

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


// SMARTZJ_BACKGROUND_CLEAN_RESULTS_POOL_V2
// Keeps every successful background-clean result in a persistent live READY pool.
function readBackgroundCleanReadyTracks() {
  const loopState = readJson<Record<string, any>>(BACKGROUND_CLEAN_STATE_FILE, {});
  const poolState = readJson<Record<string, any>>(SMARTZJ_LIVE_READY_POOL_FILE, { tracks: [] });

  const existingPool = Array.isArray(poolState.tracks) ? poolState.tracks : [];
  const results = Array.isArray(loopState.results) ? loopState.results : [];

  function keyOf(track: Record<string, any>) {
    return cleanText(
      track.trackId ||
        track.id ||
        track.title ||
        track.cleanAudioUrl ||
        track.processedAudioUrl ||
        track.audioUrl ||
        ""
    );
  }

  function normalizeReady(input: Record<string, any>) {
    const cleanAudioUrl = cleanText(input.cleanAudioUrl || input.processedAudioUrl || input.audioUrl);
    const trackId = cleanText(input.trackId || input.id || input.title || cleanAudioUrl);
    const title = cleanText(input.title || input.trackTitle || trackId);

    if (!trackId || !cleanAudioUrl.startsWith("/audio/smartdj/clean/")) return null;

    const status = cleanText(input.status || input.cleanStatus || input.bleepJobStatus).toUpperCase();
    if (status && status !== "PROCESSED_AUDIO_READY" && status !== "READY") return null;

    return {
      id: trackId,
      trackId,
      title,
      artist: cleanText(input.artist || "AzuraCast"),
      source: "SMARTZJ_LIVE_READY_POOL",
      audioUrl: cleanAudioUrl,
      streamUrl: cleanAudioUrl,
      cleanAudioUrl,
      processedAudioUrl: cleanAudioUrl,
      status: "READY",
      safetyStatus: "READY",
      cleanStatus: "PROCESSED_AUDIO_READY",
      bleepJobStatus: "PROCESSED_AUDIO_READY",
      needsBleep: false,
      held: false,
      rawAudioBlocked: true,
      returnedToSmartDj: input.returnedToSmartDj ?? true,
      updatedAt: input.updatedAt || input.completedAt || loopState.updatedAt || new Date().toISOString(),
      safetyNote: "Persistent SmartZJ live READY pool. Only processed clean audio is allowed.",
    };
  }

  const byKey = new Map<string, Record<string, any>>();

  for (const track of existingPool) {
    const ready = normalizeReady(track);
    if (!ready) continue;
    byKey.set(keyOf(ready), ready);
  }

  for (const result of results) {
    const ready = normalizeReady(result);
    if (!ready) continue;
    byKey.set(keyOf(ready), ready);
  }

  const tracks = Array.from(byKey.values()).slice(-5000);

  writeJson(SMARTZJ_LIVE_READY_POOL_FILE, {
    ok: true,
    count: tracks.length,
    policy: "Persistent live SmartZJ READY pool. Raw Azura blocked.",
    updatedAt: new Date().toISOString(),
    tracks,
  });

  return tracks;
}


// SMARTZJ_EMERGENCY_HOLD_GATE_V1
function getEmergencyHoldKeys() {
  const hold = readJson<Record<string, any>>(SMARTZJ_EMERGENCY_HOLD_FILE, { blocked: [] });
  const blocked = Array.isArray(hold.blocked) ? hold.blocked : [];

  return new Set(
    blocked
      .map((item) =>
        cleanText(
          item.key ||
            item.trackId ||
            item.id ||
            item.title ||
            item.audioUrl ||
            item.cleanAudioUrl ||
            item.processedAudioUrl
        )
      )
      .filter(Boolean)
  );
}

function isEmergencyHeldTrack(track: AnyTrack, holdKeys: Set<string>) {
  const keys = [
    track.key,
    track.trackId,
    track.id,
    track.title,
    track.audioUrl,
    track.cleanAudioUrl,
    track.processedAudioUrl,
    track.streamUrl,
  ]
    .map(cleanText)
    .filter(Boolean);

  return keys.some((key) => holdKeys.has(key));
}

function readSmartTracks() {
  const state = readJson<Record<string, any>>(SMARTDJ_STATE_FILE, {});
  const buckets = [
    state.playlist,
    state.lastPlaylist,
    state.tracks,
    state.lastResult?.playlist,
    state.result?.playlist,
    readBackgroundCleanReadyTracks(),
  ];

  const merged: AnyTrack[] = [];

  for (const bucket of buckets) {
    if (Array.isArray(bucket)) merged.push(...bucket.filter(Boolean));
  }

  const seen = new Set<string>();
  const holdKeys = getEmergencyHoldKeys();

  return merged.filter((track) => {
    if (isEmergencyHeldTrack(track, holdKeys)) return false;
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


// SMARTZJ_FRESH_FIRST_QUEUE_V1
function getFreshReadyTime(track: AnyTrack) {
  const fields = [
    track.processedAt,
    track.cleanReadyAt,
    track.cleanedAt,
    track.completedAt,
    track.returnedAt,
    track.updatedAt,
    track.createdAt,
    track.bleepJobUpdatedAt,
    track.bleepJobCompletedAt,
  ];

  for (const value of fields) {
    const time = Date.parse(String(value || ""));
    if (Number.isFinite(time)) return time;
  }

  return 0;
}

function readFreshFirstState() {
  return readJson<Record<string, any>>(FRESH_FIRST_STATE_FILE, {
    knownKeys: [],
    recentKeys: [],
    updatedAt: "",
  });
}

function chooseSmartZjFreshFirstNext(cleanTracks: AnyTrack[], currentKey: string, playerState: Record<string, any>) {
  const freshState = readFreshFirstState();

  const knownKeys = new Set(
    Array.isArray(freshState.knownKeys) ? freshState.knownKeys.map(String) : []
  );

  const recentKeys = new Set(
    Array.isArray(freshState.recentKeys) ? freshState.recentKeys.map(String) : []
  );

  const hasKnownHistory = knownKeys.size > 0;

  const freshNewTracks = hasKnownHistory
    ? cleanTracks.filter((track) => {
        const key = getTrackKey(track);
        return key && key !== currentKey && !knownKeys.has(key);
      })
    : [];

  if (freshNewTracks.length > 0) {
    freshNewTracks.sort((a, b) => getFreshReadyTime(b) - getFreshReadyTime(a));

    const picked = freshNewTracks[0];
    const pickedKey = getTrackKey(picked);
    const index = cleanTracks.findIndex((track) => getTrackKey(track) === pickedKey);

    return {
      track: picked,
      index: index >= 0 ? index : 0,
      reason: "FRESH_NEW_CLEAN_TRACK_FIRST",
    };
  }

  const unplayedTracks = cleanTracks.filter((track) => {
    const key = getTrackKey(track);
    return key && key !== currentKey && !recentKeys.has(key);
  });

  if (unplayedTracks.length > 0) {
    const picked = unplayedTracks[0];
    const pickedKey = getTrackKey(picked);
    const index = cleanTracks.findIndex((track) => getTrackKey(track) === pickedKey);

    return {
      track: picked,
      index: index >= 0 ? index : 0,
      reason: "ROTATE_UNPLAYED_CLEAN_TRACK",
    };
  }

  let currentIndex = cleanTracks.findIndex((track) => getTrackKey(track) === currentKey);

  if (currentIndex < 0 && typeof playerState.index === "number") {
    currentIndex = playerState.index;
  }

  let nextIndex = ((currentIndex + 1) % cleanTracks.length + cleanTracks.length) % cleanTracks.length;

  if (cleanTracks.length > 1 && getTrackKey(cleanTracks[nextIndex]) === currentKey) {
    nextIndex = (nextIndex + 1) % cleanTracks.length;
  }

  return {
    track: cleanTracks[nextIndex],
    index: nextIndex,
    reason: "NORMAL_CLEAN_ROTATION",
  };
}

function rememberSmartZjFreshFirstPlay(track: AnyTrack, cleanTracks: AnyTrack[]) {
  const freshState = readFreshFirstState();
  const playedKey = getTrackKey(track);
  const allKeys = cleanTracks.map(getTrackKey).filter(Boolean);

  const previousKnown = Array.isArray(freshState.knownKeys) ? freshState.knownKeys.map(String) : [];
  const previousRecent = Array.isArray(freshState.recentKeys) ? freshState.recentKeys.map(String) : [];

  const knownKeys = Array.from(new Set([...previousKnown, ...allKeys])).slice(-2000);

  const recentLimit = Math.max(1, Math.min(100, cleanTracks.length > 1 ? cleanTracks.length - 1 : 1));
  const recentKeys = [
    playedKey,
    ...previousRecent.filter((key) => key && key !== playedKey),
  ].filter(Boolean).slice(0, recentLimit);

  writeJson(FRESH_FIRST_STATE_FILE, {
    ok: true,
    policy: "Fresh clean READY tracks go to the front. Raw Azura blocked.",
    lastPlayedKey: playedKey,
    lastPlayedTitle: titleFromTrack(track),
    cleanTrackCount: cleanTracks.length,
    knownKeys,
    recentKeys,
    updatedAt: new Date().toISOString(),
  });
}


// SMARTZJ_GENRE_LANE_OUTPUT_V1
function getSmartZjGenreLane(track: AnyTrack) {
  const combined = [
    track.genreLane,
    track.genre,
    track.lane,
    track.folder,
    track.azuraRelativePath,
    track.sourceFilePath,
    track.localAudioPath,
    track.id,
    track.trackId,
    track.title,
  ]
    .map((value) => cleanText(value).toLowerCase())
    .join(" ");

  if (combined.includes("hip-hop") || combined.includes("hip hop")) return "Hip-Hop";
  if (combined.includes("r-n-b") || combined.includes("r&b") || combined.includes("rnb")) return "R-n-B";
  if (combined.includes("fresh-dancehall") || combined.includes("fresh dancehall")) return "Fresh-Dancehall";
  if (combined.includes("ole-school-dancehall") || combined.includes("old school dancehall") || combined.includes("ole school dancehall")) return "Ole-School-Dancehall";
  if (combined.includes("dancehall")) return "Dancehall";
  if (combined.includes("reggae")) return "Reggae";
  if (combined.includes("jingles")) return "Jingles";

  return cleanText(track.genreLane || track.genre || track.lane || "SmartZJ Clean Mix");
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

  const selection = chooseSmartZjFreshFirstNext(cleanTracks, currentKey, playerState);
  const nextIndex = selection.index;
  const track = selection.track;
  const selectionReason = selection.reason;
  const audioUrl = pickSafeUrl(track);
  const now = new Date().toISOString();

  const title = titleFromTrack(track);
  const artist = artistFromTrack(track);
  const genreLane = getSmartZjGenreLane(track);

  const broadcast = {
    ok: true,
    status: "SMARTDJ_BROADCASTING",
    source: "SMARTDJ",
    title,
      artist,
      genreLane,
    audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    startedAt: now,
    updatedAt: now,
    genreLane,
    message: `SmartZJ Mini AutoNext ${genreLane} item ${nextIndex + 1} of ${cleanTracks.length}. Fresh-first: ${selectionReason}. Raw Azura blocked.`,
    sequence: {
      mode: "SMARTZJ_MINI_AUTONEXT",
      index: nextIndex,
      itemNumber: nextIndex + 1,
      total: cleanTracks.length,
      isLast: nextIndex + 1 === cleanTracks.length,
      selectionReason,
    },
    track: {
      ...track,
      genreLane,
      id: cleanText(track.id || track.trackId || title),
      trackId: cleanText(track.trackId || track.id || title),
      title,
      artist,
      genreLane,
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
  rememberSmartZjFreshFirstPlay(track, cleanTracks);

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
      selectionReason,
      title,
      artist,
      genreLane,
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






