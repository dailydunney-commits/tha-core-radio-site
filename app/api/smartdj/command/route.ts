import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SmartDJTrack = {
  id: string;
  title: string;
  artist: string;
  source: string;
  reason: string;
  audioUrl: string;
  url: string;
  streamUrl: string;
  rawUrl?: string;
};

type SmartDJState = {
  ok: boolean;
  command: string;
  intent: string;
  target: string;
  message: string;
  reply: string;
  statusText: string;
  action: string;
  targetPanel: string;
  playlistTitle: string;
  playlist: SmartDJTrack[];
  lastPlaylist: SmartDJTrack[];
  timestamp: string;
  resultCount: number;
  resultLabel: string;
};

declare global {
  var __THA_CORE_SMARTDJ_STATE__: SmartDJState | undefined;
}

function getAzuraBaseUrl(): string {
  return (
    process.env.AZURACAST_BASE_URL ||
    process.env.NEXT_PUBLIC_AZURACAST_BASE_URL ||
    "http://thacoreonlinerad.com"
  ).replace(/\/+$/, "");
}

function getAzuraStationId(): string {
  return (
    process.env.AZURACAST_STATION_ID ||
    process.env.NEXT_PUBLIC_AZURACAST_STATION_ID ||
    "1"
  );
}

function proxyAudioUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  return `/api/smartdj/audio?src=${encodeURIComponent(rawUrl)}`;
}

const SMARTDJ_STATE_DIR = join(process.cwd(), ".data");
const SMARTDJ_STATE_FILE = join(SMARTDJ_STATE_DIR, "smartdj-state.json");

function readSavedSmartDjState(): SmartDJState | null {
  try {
    if (!existsSync(SMARTDJ_STATE_FILE)) return null;
    const saved = JSON.parse(readFileSync(SMARTDJ_STATE_FILE, "utf8")) as SmartDJState;
    if (!saved || typeof saved !== "object") return null;
    if (!Array.isArray(saved.playlist)) saved.playlist = [];
    if (!Array.isArray(saved.lastPlaylist)) saved.lastPlaylist = [];
    return saved;
  } catch {
    return null;
  }
}

function saveSmartDjState(state: SmartDJState) {
  try {
    mkdirSync(SMARTDJ_STATE_DIR, { recursive: true });
    writeFileSync(SMARTDJ_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {}
}

function setSmartDjState(state: SmartDJState): SmartDJState {
  globalThis.__THA_CORE_SMARTDJ_STATE__ = state;
  saveSmartDjState(state);
  return state;
}
function blankState(): SmartDJState {
  return {
    ok: true,
    command: "",
    intent: "idle",
    target: "",
    message: "SmartDJ command ready.",
    reply: "SmartDJ command ready.",
    statusText: "SmartDJ command ready.",
    action: "idle",
    targetPanel: "smartdj",
    playlistTitle: "",
    playlist: [],
    lastPlaylist: [],
    timestamp: new Date().toISOString(),
    resultCount: 0,
    resultLabel: "SmartDJ returned 0 result(s).",
  };
}

function getState(): SmartDJState {
  if (!globalThis.__THA_CORE_SMARTDJ_STATE__) {
    globalThis.__THA_CORE_SMARTDJ_STATE__ = readSavedSmartDjState() || blankState();
  }

  return globalThis.__THA_CORE_SMARTDJ_STATE__;
}

function cleanCommand(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 260);
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchTarget(command: string): string {
  const text = normalize(command);

  if (text.includes("mother")) return "mother";
  if (text.includes("dancehall")) return "dancehall";
  if (text.includes("reggae")) return "reggae";
  if (text.includes("rnb") || text.includes("r b")) return "rnb";
  if (text.includes("hip hop") || text.includes("hiphop")) return "hip hop";

  const cleaned = command
    .replace(/find/gi, "")
    .replace(/play/gi, "")
    .replace(/build/gi, "")
    .replace(/playlist/gi, "")
    .replace(/song/gi, "")
    .replace(/songs/gi, "")
    .replace(/and/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || "music";
}

function getDisplayTarget(command: string): string {
  const text = normalize(command);

  if (text.includes("mother")) return "Mothers Day Song";
  if (text.includes("dancehall")) return "Dancehall Song";
  if (text.includes("reggae")) return "Reggae Song";
  if (text.includes("rnb") || text.includes("r b")) return "RNB Song";
  if (text.includes("hip hop") || text.includes("hiphop")) return "Hip-Hop Song";

  const target = getSearchTarget(command);

  return target
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAzuraSearchQueries(command: string): string[] {
  const text = normalize(command);
  const target = getSearchTarget(command);

  if (text.includes("mother")) {
    return [
      "mother clean",
      "mother radio",
      "mother radio edit",
      "mothers clean",
      "mothers radio",
      "mothers day clean",
      "mothers day radio",
      "clean mother",
      "radio mother"
    ];
  }

  return [
    `${target} clean`,
    `${target} radio`,
    `${target} radio edit`,
    `${target} clean radio`,
  ];
}

function getAnyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
}

function toAbsoluteUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";

  const raw = value.trim();

  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${getAzuraBaseUrl()}${raw}`;

  return "";
}

function extractAudioUrl(item: any): string {
  const direct = getAnyString(
    item?.audioUrl,
    item?.streamUrl,
    item?.url,
    item?.download_url,
    item?.play_url,
    item?.links?.download,
    item?.links?.play,
    item?.links?.self,
    item?.media?.download_url,
    item?.media?.play_url
  );

  return toAbsoluteUrl(direct);
}

function mediaText(item: any): string {
  return normalize(
    [
      item?.title,
      item?.artist,
      item?.name,
      item?.path,
      item?.song?.title,
      item?.song?.artist,
      item?.media?.title,
      item?.media?.artist,
      item?.media_file,
      item?.extra_metadata?.artist,
      item?.extra_metadata?.title,
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function isStrictRequestMatch(item: any, command: string): boolean {
  const text = mediaText(item);
  const request = normalize(command);

  if (request.includes("mother")) {
    return text.includes("mother");
  }

  const words = getSearchTarget(command)
    .split(" ")
    .map((word) => normalize(word))
    .filter((word) => word.length >= 3);

  return words.some((word) => text.includes(word));
}

function mediaIsDirty(item: any): boolean {
  const text = mediaText(item);

  return (
    text.includes("explicit") ||
    text.includes("uncensored") ||
    text.includes("dirty") ||
    text.includes("dirty version") ||
    text.includes("raw version") ||
    text.includes("parental advisory")
  );
}

function mediaIsCleanRadio(item: any): boolean {
  const text = mediaText(item);

  if (mediaIsDirty(item)) return false;

  return (
    text.includes("clean") ||
    text.includes("radio") ||
    text.includes("radio edit") ||
    text.includes("clean version") ||
    text.includes("clean radio") ||
    text.includes("edited") ||
    text.includes("censored")
  );
}

function scoreMedia(item: any, queryWords: string[]): number {
  const text = mediaText(item);
  let score = 0;

  for (const word of queryWords) {
    if (word && text.includes(word)) score += 10;
  }

  if (text.includes("clean")) score += 6;
  if (text.includes("radio edit")) score += 5;
  if (text.includes("radio")) score += 3;

  return score;
}

function normalizeMediaItem(item: any, index: number): SmartDJTrack {
  const artist = getAnyString(
    item?.artist,
    item?.song?.artist,
    item?.media?.artist,
    item?.extra_metadata?.artist,
    "AzuraCast"
  );

  const title = getAnyString(
    item?.title,
    item?.song?.title,
    item?.media?.title,
    item?.extra_metadata?.title,
    item?.name,
    item?.path,
    `AzuraCast Track ${index + 1}`
  );

  const rawUrl = extractAudioUrl(item);
  const playableUrl = rawUrl ? proxyAudioUrl(rawUrl) : "";

  return {
    id: String(item?.id ?? item?.unique_id ?? item?.media_id ?? `azuracast-track-${index + 1}`),
    artist,
    title,
    source: "AzuraCast Media Library",
    reason: rawUrl
      ? "Clean/radio-safe track matched from AzuraCast."
      : "Matched clean/radio metadata, but no direct audio URL was returned.",
    audioUrl: playableUrl,
    url: playableUrl,
    streamUrl: playableUrl,
    rawUrl,
  };
}

async function fetchJsonFast(url: string, apiKey: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);

  try {
    const headers: HeadersInit = { Accept: "application/json" };
    if (apiKey) headers["X-API-Key"] = apiKey;

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractList(payload: any): any[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.files)) return payload.files;

  return [];
}

async function searchAzuraCastCleanMedia(command: string): Promise<SmartDJTrack[]> {
  const apiKey = process.env.AZURACAST_API_KEY || "";
  const baseUrl = getAzuraBaseUrl();
  const stationId = getAzuraStationId();
  const searchTarget = getSearchTarget(command);
  const words = normalize(searchTarget).split(" ").filter(Boolean);
  const queries = Array.from(new Set(getAzuraSearchQueries(command)));

  const urls = queries.flatMap((query) => [
    `${baseUrl}/api/station/${stationId}/files?search=${encodeURIComponent(query)}`,
    `${baseUrl}/api/station/${stationId}/files?query=${encodeURIComponent(query)}`,
  ]);

  const settled = await Promise.allSettled(urls.map((url) => fetchJsonFast(url, apiKey)));
  const collected = new Map<string, any>();

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;

    const list = extractList(result.value);

    for (const item of list) {
      const key = String(
        item?.id ??
          item?.unique_id ??
          item?.media_id ??
          item?.path ??
          JSON.stringify(item)
      );

      if (!collected.has(key)) collected.set(key, item);
    }
  }

  const allItems = Array.from(collected.values());

  return allItems
    .map((item) => ({
      item,
      score: scoreMedia(item, words),
    }))
    .filter((entry) => isStrictRequestMatch(entry.item, command) && mediaIsCleanRadio(entry.item))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((entry, index) => normalizeMediaItem(entry.item, index));
}


async function searchAzuraCastAnyMedia(command: string): Promise<SmartDJTrack[]> {
  const apiKey = process.env.AZURACAST_API_KEY || "";
  const baseUrl = getAzuraBaseUrl();
  const stationId = getAzuraStationId();
  const searchTarget = getSearchTarget(command);
  const words = normalize(searchTarget).split(" ").filter(Boolean);

  const queries = Array.from(
    new Set([
      searchTarget,
      `${searchTarget} song`,
      `${searchTarget} music`,
    ])
  );

  const urls = queries.flatMap((query) => [
    `${baseUrl}/api/station/${stationId}/files?search=${encodeURIComponent(query)}`,
    `${baseUrl}/api/station/${stationId}/files?query=${encodeURIComponent(query)}`,
  ]);

  const settled = await Promise.allSettled(urls.map((url) => fetchJsonFast(url, apiKey)));
  const collected = new Map<string, any>();

  for (const result of settled) {
    if (result.status !== "fulfilled") continue;

    const list = extractList(result.value);

    for (const item of list) {
      const key = String(
        item?.id ??
          item?.unique_id ??
          item?.media_id ??
          item?.path ??
          JSON.stringify(item)
      );

      if (!collected.has(key)) collected.set(key, item);
    }
  }

  const allItems = Array.from(collected.values());

  return allItems
    .map((item) => ({
      item,
      score: scoreMedia(item, words),
    }))
    .filter((entry) => isStrictRequestMatch(entry.item, command))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry, index) => normalizeMediaItem(entry.item, index));
}

async function createSmartDjBleepJob(command: string, origin: string, originalTrack?: SmartDJTrack | null) {
  const target = extractSmartDjTarget(command);

  const trackForJob =
    originalTrack ?? {
      id: `smartdj-bleep-needed-${Date.now()}`,
      title: target,
      artist: "SmartDJ",
      source: "SmartDJ request",
      reason:
        "No clean/radio edit version was returned. SmartDJ must find a clean version or create a processed bleeped copy before broadcast.",
      audioUrl: "",
      url: "",
      streamUrl: "",
      rawUrl: "",
    };

  const response = await fetch(`${origin}/api/radio/bleep-job`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      source: "SMARTDJ",
      track: trackForJob,
    }),
  });

  return response.json().catch(() => null);
}

function buildStateFromTracks(command: string, tracks: SmartDJTrack[]): SmartDJState {
  const target = extractSmartDjTarget(command);
  const playlistTitle = `build ${target.toLowerCase()} playlist`;

  return {
    ok: true,
    command,
    intent: "find_play_song",
    target,
    message: `SmartDJ returned ${tracks.length} result(s) for ${target}.`,
    reply: `SmartDJ returned ${tracks.length} result(s) for ${target}.`,
    statusText: `SmartDJ returned ${tracks.length} result(s) for ${target}.`,
    action: "prepare_song_queue",
    targetPanel: "smartdj_queue",
    playlistTitle,
    playlist: tracks,
    lastPlaylist: tracks,
    timestamp: new Date().toISOString(),
    resultCount: tracks.length,
    resultLabel: `SmartDJ returned ${tracks.length} result(s).`,
  };
}


function extractSmartDjTarget(command: string): string {
  const cleaned = String(command || "").replace(/\s+/g, " ").trim();

  return (
    cleaned
      .replace(/^smartdj\s*/i, "")
      .replace(/^dj\s*/i, "")
      .replace(/^find\s+and\s+play\s+/i, "")
      .replace(/^find\s+clean\s+/i, "")
      .replace(/^find\s+/i, "")
      .replace(/^search\s+for\s+/i, "")
      .replace(/^search\s+/i, "")
      .replace(/^play\s+/i, "")
      .trim() || cleaned
  );
}

function buildBleepJobState(
  command: string,
  candidateTrack?: SmartDJTrack | null
): SmartDJState {
  const target = extractSmartDjTarget(command);

  const heldTrack = {
    id: String(candidateTrack?.id || `smartdj-held-${Date.now()}`),
    title: String(candidateTrack?.title || target || "SmartDJ held track"),
    artist: String(candidateTrack?.artist || "SmartDJ"),
    source: String(candidateTrack?.source || "SmartDJ request"),
    reason:
      "HELD - No clean/radio-safe audio found yet. Waiting for clean/bleep copy before preview, queue, or broadcast.",
    statusText: "HELD - needs clean/bleep copy",
    action: "held_for_clean_bleep",
    audioUrl: String(candidateTrack?.audioUrl || ""),
    url: String(candidateTrack?.url || ""),
    streamUrl: String(candidateTrack?.streamUrl || ""),
    rawUrl: String(candidateTrack?.rawUrl || ""),
  } as SmartDJTrack;

  const tracks = [heldTrack];
  const playlistTitle = `build ${target.toLowerCase()} playlist`;

  return {
    ...blankState(),
    ok: true,
    command,
    intent: "find_play_song",
    target,
    message: `SmartDJ returned ${tracks.length} result(s). No clean version found, so the track is HELD for ${target} until a clean/bleep copy is ready.`,
    reply: `SmartDJ created the playlist with ${tracks.length} HELD track(s). Clean/bleep copy required before preview, queue, or broadcast.`,
    statusText: `SmartDJ playlist created with ${tracks.length} HELD track(s). Waiting on clean/bleep copy.`,
    action: "playlist_created_with_held_tracks",
    targetPanel: "smartdj_queue",
    playlistTitle,
    playlist: tracks,
    lastPlaylist: tracks,
    timestamp: new Date().toISOString(),
    resultCount: tracks.length,
    resultLabel: `SmartDJ playlist created with ${tracks.length} HELD track(s).`,
  };
}


async function syncProcessedBleepJobsIntoSmartDjState(state: SmartDJState, origin: string): Promise<SmartDJState> {
  try {
    const response = await fetch(`${origin}/api/radio/bleep-job`, {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

    const readyJobs = jobs.filter((job: any) => {
      const status = String(job?.status || job?.processorStatus || "").toUpperCase();

      const audioUrl =
        job?.processedAudioUrl ||
        job?.bleepedAudioUrl ||
        job?.cleanAudioUrl ||
        job?.radioSafeAudioUrl ||
        job?.safeAudioUrl ||
        job?.track?.processedAudioUrl ||
        job?.track?.bleepedAudioUrl ||
        job?.track?.cleanAudioUrl ||
        job?.track?.radioSafeAudioUrl ||
        job?.track?.safeAudioUrl ||
        job?.track?.audioUrl ||
        job?.track?.url ||
        job?.track?.streamUrl ||
        "";

      return Boolean(audioUrl) && (
        status.includes("PROCESSED_AUDIO_READY") ||
        status.includes("PROCESSED_AUDIO_ATTACHED") ||
        status.includes("READY")
      );
    });

    if (readyJobs.length === 0) return state;

    const readyByTrackId = new Map<string, any>();

    for (const job of readyJobs) {
      const trackId = String(job?.track?.id || job?.trackId || "");
      if (trackId) readyByTrackId.set(trackId, job);
    }

    let changed = false;

    const syncTrack = (track: any) => {
      const job = readyByTrackId.get(String(track?.id || ""));

      if (!job) return track;

      const audioUrl =
        job?.processedAudioUrl ||
        job?.bleepedAudioUrl ||
        job?.cleanAudioUrl ||
        job?.radioSafeAudioUrl ||
        job?.safeAudioUrl ||
        job?.track?.processedAudioUrl ||
        job?.track?.bleepedAudioUrl ||
        job?.track?.cleanAudioUrl ||
        job?.track?.radioSafeAudioUrl ||
        job?.track?.safeAudioUrl ||
        job?.track?.audioUrl ||
        job?.track?.url ||
        job?.track?.streamUrl ||
        "";

      if (!audioUrl) return track;

      changed = true;

      return {
        ...track,
        audioUrl,
        url: audioUrl,
        streamUrl: audioUrl,
        processedAudioUrl: job?.processedAudioUrl || job?.track?.processedAudioUrl || audioUrl,
        bleepedAudioUrl: job?.bleepedAudioUrl || job?.track?.bleepedAudioUrl || audioUrl,
        cleanAudioUrl: job?.cleanAudioUrl || job?.track?.cleanAudioUrl || audioUrl,
        radioSafeAudioUrl: job?.radioSafeAudioUrl || job?.track?.radioSafeAudioUrl || audioUrl,
        safeAudioUrl: job?.safeAudioUrl || job?.track?.safeAudioUrl || audioUrl,
        reason: "PROCESSED AUDIO READY - clean/bleeped copy attached.",
        statusText: "CLEAN/BLEEPED READY",
        action: "processed_audio_ready",
      };
    };

    const playlist = Array.isArray(state.playlist) ? state.playlist.map(syncTrack) : [];
    const lastPlaylist = Array.isArray(state.lastPlaylist) ? state.lastPlaylist.map(syncTrack) : playlist;

    if (!changed) return state;

    return {
      ...state,
      playlist,
      lastPlaylist,
      message: "SmartDJ playlist synced with processed clean/bleeped audio.",
      reply: "SmartDJ clean/bleeped copy is ready. Preview and queue can now be tested.",
      statusText: "SmartDJ processed audio ready.",
      resultLabel: `SmartDJ playlist ready: ${playlist.length} track(s).`,
    };
  } catch {
    return state;
  }
}

// SMARTDJ_SYNC_PROCESSED_BLEEP_JOBS_V1
export async function GET(request: NextRequest) {
  const state = await syncProcessedBleepJobsIntoSmartDjState(getState(), request.nextUrl.origin);

  return NextResponse.json(
    {
      ...state,
      playlist: state.playlist ?? [],
      lastPlaylist: state.lastPlaylist ?? state.playlist ?? [],
      lastResult: state,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const command = cleanCommand(body?.command ?? body?.prompt ?? body?.text);

    if (!command) {
      return NextResponse.json(
        {
          ok: false,
          message: "Missing SmartDJ command.",
          reply: "Missing SmartDJ command.",
          resultCount: 0,
          resultLabel: "SmartDJ returned 0 result(s).",
        },
        { status: 400 }
      );
    }

    const text = normalize(command);
    const currentState = getState();

    if (text.includes("last playlist") || text.includes("view playlist")) {
      const count =
        typeof currentState.resultCount === "number"
          ? currentState.resultCount
          : currentState.playlist.length;

      return NextResponse.json(
        {
          ...currentState,
          message: `SmartDJ returned ${count} result(s).`,
          reply: `SmartDJ returned ${count} result(s).`,
          resultCount: count,
          resultLabel: `SmartDJ returned ${count} result(s).`,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const smartTarget = extractSmartDjTarget(command);

    const sourceRes = await fetch(
      `${request.nextUrl.origin}/api/radio/azura-source-search?query=${encodeURIComponent(smartTarget)}`,
      { method: "POST", cache: "no-store" }
    ).catch(() => null);

    const sourceData = sourceRes
      ? await sourceRes.json().catch(() => null)
      : null;

    const cleanTracks =
      Array.isArray(sourceData?.results) && sourceData.results.length > 0
        ? sourceData.results
        : await searchAzuraCastCleanMedia(smartTarget);

    if (cleanTracks.length > 0) {
      const nextState = buildStateFromTracks(extractSmartDjTarget(command), cleanTracks);
      setSmartDjState(nextState);

      return NextResponse.json(nextState, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const originalMatches = await searchAzuraCastAnyMedia(extractSmartDjTarget(command));
    const originalTrack = originalMatches[0] ?? null;
    await createSmartDjBleepJob(extractSmartDjTarget(command), request.nextUrl.origin, originalTrack).catch(() => null);

    const nextState = buildBleepJobState(extractSmartDjTarget(command));
    setSmartDjState(nextState);

    return NextResponse.json(nextState, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const fallback = {
      ...blankState(),
      ok: true,
      command: "SmartDJ fallback",
      intent: "find_play_song",
      target: "SmartDJ fallback",
      message:
        error instanceof Error
          ? `SmartDJ search error: ${error.message}`
          : "SmartDJ search error.",
      reply:
        error instanceof Error
          ? `SmartDJ search error: ${error.message}`
          : "SmartDJ search error.",
      statusText: "SmartDJ search error.",
      action: "smartdj_error",
      targetPanel: "smartdj_queue",
      playlist: [],
      lastPlaylist: [],
      resultCount: 0,
      resultLabel: "SmartDJ returned 0 result(s).",
      timestamp: new Date().toISOString(),
    };

    globalThis.__THA_CORE_SMARTDJ_STATE__ = fallback;

    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}






