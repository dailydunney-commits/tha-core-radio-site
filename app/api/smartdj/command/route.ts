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

const SMARTDJ_STATE_FILE = join(process.cwd(), ".data", "smartdj-state.json");

function loadSavedState(): SmartDJState | null {
  try {
    if (!existsSync(SMARTDJ_STATE_FILE)) return null;

    const raw = readFileSync(SMARTDJ_STATE_FILE, "utf8");
    const parsed = JSON.parse(raw) as SmartDJState;

    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.playlist)) parsed.playlist = [];
    if (!Array.isArray(parsed.lastPlaylist)) parsed.lastPlaylist = [];

    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: SmartDJState) {
  try {
    mkdirSync(join(process.cwd(), ".data"), { recursive: true });
    writeFileSync(SMARTDJ_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Keep SmartDJ working even if local file save fails.
  }
}

function setState(state: SmartDJState): SmartDJState {
  globalThis.__THA_CORE_SMARTDJ_STATE__ = state;
  saveState(state);
  return state;
}
function getState(): SmartDJState {
  if (!globalThis.__THA_CORE_SMARTDJ_STATE__) {
    globalThis.__THA_CORE_SMARTDJ_STATE__ = loadSavedState() || blankState();
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

function getPlayableBleepUrl(jobResult: any): string {
  const raw = getAnyString(
    jobResult?.bleepedAudioUrl,
    jobResult?.cleanAudioUrl,
    jobResult?.processedAudioUrl,
    jobResult?.outputAudioUrl,
    jobResult?.radioSafeAudioUrl,
    jobResult?.safeAudioUrl,
    jobResult?.result?.bleepedAudioUrl,
    jobResult?.result?.cleanAudioUrl,
    jobResult?.result?.processedAudioUrl,
    jobResult?.result?.outputAudioUrl,
    jobResult?.job?.bleepedAudioUrl,
    jobResult?.job?.cleanAudioUrl,
    jobResult?.job?.processedAudioUrl,
    jobResult?.job?.outputAudioUrl,
    jobResult?.track?.bleepedAudioUrl,
    jobResult?.track?.cleanAudioUrl,
    jobResult?.track?.processedAudioUrl,
    jobResult?.track?.outputAudioUrl
  );

  if (!raw) return "";
  if (raw.startsWith("/")) return raw;

  return proxyAudioUrl(raw);
}

function buildBleepJobState(
  command: string,
  originalTrack?: SmartDJTrack | null,
  bleepJobResult?: any
): SmartDJState {
  const target = extractSmartDjTarget(command);
  const bleepedUrl = getPlayableBleepUrl(bleepJobResult);

  const fallbackTrack: SmartDJTrack = {
    id: `smartdj-bleep-needed-${Date.now()}`,
    title: target,
    artist: "SmartDJ",
    source: "SmartDJ request",
    reason:
      "No clean/radio edit version was returned. SmartDJ created a bleep job and blocked raw dirty audio until a cleaned/bleeped copy is ready.",
    audioUrl: "",
    url: "",
    streamUrl: "",
    rawUrl: "",
  };

  const baseTrack = originalTrack ?? fallbackTrack;

  const safeQueueTrack: SmartDJTrack = {
    ...baseTrack,
    id: `${baseTrack.id || `smartdj-${Date.now()}`}-safe-check`,
    source: bleepedUrl
      ? "SmartDJ auto-bleeped clean copy"
      : "SmartDJ bleep queue",
    reason: bleepedUrl
      ? "No clean version was found, so SmartDJ prepared a bleeped/radio-safe version for playlist use."
      : "No clean version was found. SmartDJ created a bleep job and kept the song in the queue, but raw dirty audio is blocked until the bleeped copy is ready.",
    audioUrl: bleepedUrl,
    url: bleepedUrl,
    streamUrl: bleepedUrl,
    rawUrl:
      baseTrack.rawUrl ||
      baseTrack.audioUrl ||
      baseTrack.url ||
      baseTrack.streamUrl ||
      "",
  };

  const playlist = [safeQueueTrack];
  const playlistTitle = `build ${target.toLowerCase()} playlist`;

  return {
    ...blankState(),
    ok: true,
    command,
    intent: "find_play_song",
    target,
    message: bleepedUrl
      ? `SmartDJ returned 1 result(s). No clean version found, so a bleeped/radio-safe version was prepared for ${target}.`
      : `SmartDJ returned 1 result(s). No clean version found, so 1 bleep job was created for ${target}. Raw dirty audio is blocked until cleaned.`,
    reply: bleepedUrl
      ? `SmartDJ returned 1 result(s). Bleeped/radio-safe version is ready for ${target}.`
      : `SmartDJ returned 1 result(s). Bleep job created for ${target}. Raw dirty audio is blocked until cleaned.`,
    statusText: bleepedUrl
      ? `SmartDJ bleeped/radio-safe track ready for ${target}.`
      : `SmartDJ bleep job queued for ${target}. Waiting for cleaned copy.`,
    action: bleepedUrl ? "prepare_song_queue" : "create_bleep_job",
    targetPanel: "smartdj_queue",
    playlistTitle,
    playlist,
    lastPlaylist: playlist,
    timestamp: new Date().toISOString(),
    resultCount: playlist.length,
    resultLabel: `SmartDJ returned ${playlist.length} result(s).`,
  };
}
function getReadyAudioUrlFromBleepJob(job: any): string {
  return getAnyString(
    job?.processedAudioUrl,
    job?.bleepedAudioUrl,
    job?.cleanAudioUrl,
    job?.radioSafeAudioUrl,
    job?.safeAudioUrl,
    job?.track?.processedAudioUrl,
    job?.track?.bleepedAudioUrl,
    job?.track?.cleanAudioUrl,
    job?.track?.radioSafeAudioUrl,
    job?.track?.safeAudioUrl,
    job?.track?.audioUrl,
    job?.track?.url,
    job?.track?.streamUrl
  );
}

function sameSmartDjTrackForBleepJob(track: SmartDJTrack, job: any): boolean {
  const trackTitle = normalize(track?.title);
  const trackArtist = normalize(track?.artist);
  const jobTitle = normalize(job?.track?.title);
  const jobArtist = normalize(job?.track?.artist);

  const trackRaw = normalize(
    track?.rawUrl || track?.audioUrl || track?.url || track?.streamUrl || track?.id
  );

  const jobRaw = normalize(
    job?.track?.rawUrl ||
      job?.track?.audioUrl ||
      job?.track?.url ||
      job?.track?.streamUrl ||
      job?.track?.id
  );

  if (trackRaw && jobRaw && (trackRaw.includes(jobRaw) || jobRaw.includes(trackRaw))) {
    return true;
  }

  if (trackTitle && jobTitle && trackTitle === jobTitle) {
    if (!trackArtist || !jobArtist) return true;
    return trackArtist === jobArtist;
  }

  return false;
}

async function syncSmartDjStateWithBleepJobs(origin: string): Promise<SmartDJState> {
  const state = getState();
  const playlist = Array.isArray(state.playlist) ? state.playlist : [];

  if (playlist.length === 0) return state;

  try {
    const response = await fetch(`${origin}/api/radio/bleep-job`, {
      method: "GET",
      cache: "no-store",
    }).catch(() => null);

    if (!response || !response.ok) return state;

    const data = await response.json().catch(() => null);
    const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

    if (jobs.length === 0) return state;

    let changed = false;

    const nextPlaylist = playlist.map((track) => {
      const currentAudio = getAnyString(track.audioUrl, track.url, track.streamUrl);

      if (currentAudio) return track;

      const readyJob = jobs.find((job: any) => {
        const readyUrl = getReadyAudioUrlFromBleepJob(job);
        return readyUrl && sameSmartDjTrackForBleepJob(track, job);
      });

      if (!readyJob) return track;

      const readyUrl = getReadyAudioUrlFromBleepJob(readyJob);
      changed = true;

      return {
        ...track,
        source: "SmartDJ auto-bleeped clean copy",
        reason:
          "Bleep job completed. SmartDJ linked the clean/bleeped audio copy back to this playlist row.",
        audioUrl: readyUrl,
        url: readyUrl,
        streamUrl: readyUrl,
        rawUrl: track.rawUrl || readyJob?.track?.rawUrl || "",
      };
    });

    if (!changed) return state;

    const nextState: SmartDJState = {
      ...state,
      action: "prepare_song_queue",
      targetPanel: "smartdj_queue",
      playlist: nextPlaylist,
      lastPlaylist: nextPlaylist,
      resultCount: nextPlaylist.length,
      resultLabel: `SmartDJ returned ${nextPlaylist.length} result(s).`,
      message: "SmartDJ bleep job completed. Clean/bleeped playlist audio is ready.",
      reply: "SmartDJ bleep job completed. Clean/bleeped playlist audio is ready.",
      statusText: "SmartDJ clean/bleeped audio linked back to playlist.",
      timestamp: new Date().toISOString(),
    };

    return setState(nextState);
  } catch {
    return state;
  }
}
export async function GET(request: NextRequest) {
  const state = await syncSmartDjStateWithBleepJobs(request.nextUrl.origin);

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
    const currentState = await syncSmartDjStateWithBleepJobs(request.nextUrl.origin);

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

    const sourceTracks = Array.isArray(sourceData?.results)
      ? sourceData.results
      : [];

    const sourceCleanTracks = sourceTracks.filter((track: any) => {
      const label = [
        track?.title,
        track?.artist,
        track?.source,
        track?.reason,
        track?.audioUrl,
        track?.url,
        track?.streamUrl,
        track?.rawUrl,
      ]
        .join(" ")
        .toLowerCase();

      const looksDirty =
        label.includes("explicit") ||
        label.includes("dirty") ||
        label.includes("uncensored") ||
        label.includes("raw version") ||
        label.includes("parental advisory") ||
        label.includes("bleep processing") ||
        label.includes("manual source match");

      const looksClean =
        label.includes("clean") ||
        label.includes("radio edit") ||
        label.includes("radio-safe") ||
        label.includes("edited") ||
        label.includes("censored");

      return looksClean && !looksDirty;
    });

    const cleanTracks =
      sourceCleanTracks.length > 0
        ? sourceCleanTracks
        : await searchAzuraCastCleanMedia(smartTarget);

    if (cleanTracks.length > 0) {
      const nextState = buildStateFromTracks(extractSmartDjTarget(command), cleanTracks);
      setState(nextState);

      return NextResponse.json(nextState, {
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const originalMatches =
      sourceTracks.length > 0
        ? sourceTracks
        : await searchAzuraCastAnyMedia(extractSmartDjTarget(command));

    const originalTrack = originalMatches[0] ?? null;
    const bleepJobResult = await createSmartDjBleepJob(
      extractSmartDjTarget(command),
      request.nextUrl.origin,
      originalTrack
    ).catch(() => null);

    const nextState = buildBleepJobState(
      extractSmartDjTarget(command),
      originalTrack,
      bleepJobResult
    );
    setState(nextState);

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

    setState(fallback);

    return NextResponse.json(fallback, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }
}







