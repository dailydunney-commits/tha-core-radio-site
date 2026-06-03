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
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");

const DEFAULT_REQUEST_TRACK_SECONDS = 210;
const DEFAULT_CURRENT_REMAINING_SECONDS = 180;

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

function internalBaseUrl() {
  return String(process.env.SMARTZJ_INTERNAL_BASE_URL || "http://127.0.0.1:3101").replace(/\/+$/, "");
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

  if (title || audioUrl) output.push(record);

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

function publicCleanAudioExists(url: string) {
  const cleanUrl = cleanText(url).split("?")[0];

  if (!cleanUrl.startsWith("/audio/smartdj/clean/")) return false;

  const parts = cleanUrl.replace(/^\/+/, "").split(/[\\/]+/).filter(Boolean);
  const filePath = join(process.cwd(), "public", ...parts);

  return existsSync(filePath);
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

async function getScheduleRequestPolicy() {
  try {
    const res = await fetch(`${internalBaseUrl()}/api/radio/smartzj-schedule`, {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    });

    const data = await res.json();
    const activeBlock = data?.activeBlock || {};
    const prioritizeOverRequests = Boolean(
      data?.prioritizeOverRequests ||
        data?.requestPriorityBlocked ||
        activeBlock?.prioritizeOverRequests
    );

    return {
      ok: Boolean(data?.ok),
      activeBlockId: cleanText(activeBlock?.id || ""),
      activeBlockName: cleanText(activeBlock?.name || ""),
      prioritizeOverRequests,
      scheduleAllowsRequests: !prioritizeOverRequests,
      blockedReason: prioritizeOverRequests
        ? "Current schedule block has priority over listener requests."
        : "",
    };
  } catch {
    return {
      ok: false,
      activeBlockId: "",
      activeBlockName: "",
      prioritizeOverRequests: false,
      scheduleAllowsRequests: true,
      blockedReason: "",
    };
  }
}

function formatWaitLabel(seconds: number | null) {
  if (seconds === null) return "Waiting";
  if (seconds <= 5) return "Any moment now";
  if (seconds < 60) return "Less than 1 minute";

  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes === 1) return "About 1 minute";
  return `About ${minutes} minutes`;
}

function getCurrentBroadcastWaitSnapshot() {
  const current = readJson<AnyRecord>(CURRENT_BROADCAST_FILE, {});
  const status = cleanText(current.status);
  const title = cleanText(current.title || current.track?.title || "");
  const startedAtMs = Date.parse(cleanText(current.startedAt || current.track?.startedAt || ""));
  const rawDuration = Number(
    current.durationSeconds ||
      current.track?.durationSeconds ||
      current.currentBroadcast?.durationSeconds ||
      0
  );

  const isBroadcasting = status === "SMARTDJ_BROADCASTING" || Boolean(current.audioUrl || current.track?.audioUrl);
  const durationSeconds =
    rawDuration > 0
      ? Math.max(15, Math.min(900, Math.floor(rawDuration)))
      : DEFAULT_CURRENT_REMAINING_SECONDS;

  const ageSeconds = Number.isFinite(startedAtMs)
    ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
    : 0;

  const remainingSeconds = isBroadcasting
    ? Math.max(0, durationSeconds - ageSeconds)
    : 0;

  return {
    isBroadcasting,
    title,
    status,
    startedAt: cleanText(current.startedAt || ""),
    durationSeconds,
    ageSeconds,
    remainingSeconds,
  };
}

function isActiveRequestStatus(status: string) {
  return status !== "PLAYED" && status !== "CANCELLED";
}

function getRequestPlayStatus(
  item: AnyRecord,
  readyPlayable: boolean,
  scheduleAllowsRequests: boolean
) {
  const status = cleanText(item.status).toUpperCase();

  if (status === "PLAYED") return "BROADCAST_COMPLETE";
  if (status === "CANCELLED") return "CANCELLED";
  if (status === "REQUEST_NEEDS_CLEAN") return "WAITING_FOR_CLEAN_BLEEP";
  if (!readyPlayable) return "WAITING_FOR_CLEAN_BLEEP";
  if (!scheduleAllowsRequests) return "WAITING_FOR_REQUEST_ALLOWED_BLOCK";

  return "READY_AFTER_CURRENT_TRACK";
}

function listenerMessageForStatus(playStatus: string) {
  if (playStatus === "READY_AFTER_CURRENT_TRACK") {
    return "Your request is ready and waiting for the next allowed play slot.";
  }

  if (playStatus === "WAITING_FOR_CLEAN_BLEEP") {
    return "Your request is waiting for a clean/bleeped safe copy before broadcast.";
  }

  if (playStatus === "WAITING_FOR_REQUEST_ALLOWED_BLOCK") {
    return "Your request is waiting for the next listener request slot.";
  }

  if (playStatus === "BROADCAST_COMPLETE") {
    return "Your request has been broadcast.";
  }

  if (playStatus === "CANCELLED") {
    return "This request is no longer active.";
  }

  return "Your request is in the queue.";
}

async function addRequestTimers(block: AnyRecord) {
  const policy = await getScheduleRequestPolicy();
  const current = getCurrentBroadcastWaitSnapshot();
  const queue = Array.isArray(block.queue) ? block.queue : [];

  let activePosition = 0;
  let readyPlayablePosition = 0;

  const timerQueue = queue.map((item: AnyRecord) => {
    const status = cleanText(item.status).toUpperCase();
    const active = isActiveRequestStatus(status);

    if (active) activePosition += 1;

    const track = item?.track && typeof item.track === "object" ? (item.track as AnyRecord) : null;
    const audioUrl = track ? pickSafeUrl(track) : "";
    const readyPlayable =
      status === "REQUEST_READY" &&
      item.ready !== false &&
      Boolean(track) &&
      Boolean(audioUrl) &&
      publicCleanAudioExists(audioUrl);

    let readyPosition: number | null = null;
    let estimatedWaitSeconds: number | null = null;

    if (active && readyPlayable && policy.scheduleAllowsRequests) {
      readyPlayablePosition += 1;
      readyPosition = readyPlayablePosition;
      estimatedWaitSeconds =
        current.remainingSeconds + Math.max(0, readyPlayablePosition - 1) * DEFAULT_REQUEST_TRACK_SECONDS;
    }

    const playStatus = getRequestPlayStatus(item, readyPlayable, policy.scheduleAllowsRequests);
    const blockedReason =
      playStatus === "WAITING_FOR_REQUEST_ALLOWED_BLOCK"
        ? policy.blockedReason
        : playStatus === "WAITING_FOR_CLEAN_BLEEP"
          ? "Clean/bleeped READY audio is required before broadcast."
          : "";

    const queuePosition = active ? activePosition : null;
    const estimatedWaitLabel = formatWaitLabel(estimatedWaitSeconds);

    return {
      ...item,

      controlPanelTimer: {
        requestId: cleanText(item.requestId || item.id),
        queuePosition,
        readyQueuePosition: readyPosition,
        requestPlayStatus: playStatus,
        readyPlayable,
        estimatedWaitSeconds,
        estimatedWaitLabel,
        blockedReason,
        scheduleAllowsRequests: policy.scheduleAllowsRequests,
        activeBlockId: policy.activeBlockId,
        activeBlockName: policy.activeBlockName,
        currentBroadcastRemainingSeconds: current.remainingSeconds,
        currentBroadcastTitle: current.title,
      },

      listenerTimer: {
        requestId: cleanText(item.requestId || item.id),
        title: cleanText(item.title || "Requested Song"),
        artist: cleanText(item.artist || ""),
        requestPosition: queuePosition,
        requestPlayStatus: playStatus,
        estimatedWaitSeconds,
        estimatedWaitLabel,
        message: listenerMessageForStatus(playStatus),
      },
    };
  });

  const nextReady = timerQueue.find((item: AnyRecord) =>
    item?.controlPanelTimer?.requestPlayStatus === "READY_AFTER_CURRENT_TRACK"
  ) as AnyRecord | undefined;

  return {
    ...block,
    queue: timerQueue,

    controlPanelTimer: {
      queueCount: timerQueue.length,
      activeQueueCount: timerQueue.filter((item: AnyRecord) =>
        isActiveRequestStatus(cleanText(item.status).toUpperCase())
      ).length,
      readyPlayableCount: timerQueue.filter((item: AnyRecord) =>
        item?.controlPanelTimer?.readyPlayable
      ).length,
      scheduleAllowsRequests: policy.scheduleAllowsRequests,
      activeBlockId: policy.activeBlockId,
      activeBlockName: policy.activeBlockName,
      blockedReason: policy.blockedReason,
      currentBroadcast: current,
      nextReadyRequest: nextReady
        ? {
            requestId: cleanText(nextReady.requestId || nextReady.id),
            title: cleanText(nextReady.title),
            artist: cleanText(nextReady.artist),
            requestedBy: cleanText(nextReady.requestedBy),
            estimatedWaitSeconds: nextReady.controlPanelTimer.estimatedWaitSeconds,
            estimatedWaitLabel: nextReady.controlPanelTimer.estimatedWaitLabel,
          }
        : null,
    },

    listenerTimer: {
      publicQueue: timerQueue.map((item: AnyRecord) => item.listenerTimer),
    },
  };
}

export async function GET() {
  const block = await addRequestTimers(readRequestBlock());

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
    const saved = saveRequestBlock({
      ...block,
      queue: queue.filter((item: AnyRecord) => item.status !== "PLAYED" && item.status !== "CANCELLED"),
    });

    return NextResponse.json(await addRequestTimers(saved));
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
    block: await addRequestTimers(saved),
  });
}
