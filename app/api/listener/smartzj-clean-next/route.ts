import { existsSync, mkdirSync, readFileSync, writeFileSync , readdirSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyTrack = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const SMARTDJ_STATE_FILE = join(DATA_DIR, "smartdj-state.json");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");
const PLAYER_STATE_FILE = join(DATA_DIR, "smartzj-mini-autonext.json");
const SMARTZJ_JINGLE_COUNTER_FILE = join(DATA_DIR, "smartzj-jingle-counter.json");
const FRESH_FIRST_STATE_FILE = join(DATA_DIR, "smartzj-fresh-first-queue.json");
const LANE_PLAY_HISTORY_FILE = join(DATA_DIR, "smartzj-lane-play-history.json");
const BACKGROUND_CLEAN_STATE_FILE = join(DATA_DIR, "smartdj-background-clean-state.json");
const SMARTZJ_LIVE_READY_POOL_FILE = join(DATA_DIR, "smartzj-live-ready-pool.json");
const SMARTZJ_EMERGENCY_HOLD_FILE = join(DATA_DIR, "smartzj-emergency-hold.json");
const SMARTZJ_BROADCAST_MODE_FILE = join(DATA_DIR, "smartzj-broadcast-mode.json");
const SMARTZJ_REQUEST_BLOCK_FILE = join(DATA_DIR, "smartzj-request-block.json");

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

function canonicalSmartZjLane(value: unknown) {
  const text = cleanText(value)
    .replace(/[_/\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const lower = text.toLowerCase();

  if (!lower) return "";

  if (
    lower.includes("ole school dancehall") ||
    lower.includes("old school dancehall") ||
    lower.includes("ole-school-dancehall")
  ) {
    return "Ole-School-Dancehall";
  }

  if (lower.includes("fresh dancehall") || lower.includes("fresh-dancehall")) {
    return "Fresh-Dancehall";
  }

  if (lower.includes("dancehall")) return "Dancehall";
  if (lower.includes("reggae")) return "Reggae";
  if (lower.includes("hip hop") || lower.includes("hip-hop")) return "Hip-Hop";
  if (lower.includes("r n b") || lower.includes("r-n-b") || lower.includes("r&b") || lower.includes("rnb")) return "R-n-B";

  return text
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

function laneKey(value: unknown) {
  return canonicalSmartZjLane(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function internalBaseUrl() {
  return String(process.env.SMARTZJ_INTERNAL_BASE_URL || "http://127.0.0.1:3101").replace(/\/+$/, "");
}

async function getSchedulePolicy() {
  try {
    const res = await fetch(`${internalBaseUrl()}/api/radio/smartzj-schedule`, {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    });

    const data = await res.json();

    return {
      ok: Boolean(data?.ok),
      selectedLane: canonicalSmartZjLane(data?.selectedLane || data?.activeBlock?.selectedLane || ""),
      scheduleOverrideActive: Boolean(data?.scheduleOverrideActive || data?.activeBlock?.interruptBroadcast),
      requestPriorityBlocked: Boolean(data?.requestPriorityBlocked || data?.activeBlock?.prioritizeOverRequests),
      interruptBroadcast: Boolean(data?.interruptBroadcast || data?.activeBlock?.interruptBroadcast),
      prioritizeOverRequests: Boolean(data?.prioritizeOverRequests || data?.activeBlock?.prioritizeOverRequests),
      playJinglesBetweenTracks: Boolean(data?.playJinglesBetweenTracks || data?.activeBlock?.playJinglesBetweenTracks),
      allowJingleOverlay: Boolean(data?.allowJingleOverlay || data?.activeBlock?.allowJingleOverlay),
      playbackOrder: cleanText(data?.playbackOrder || data?.activeBlock?.playbackOrder || "shuffled").toLowerCase(),
      // SMARTZJ_READ_SCHEDULE_JINGLE_FREQUENCY_V1
      songsBetweenJingles: Number(
        data?.songsBetweenJingles ??
          data?.songsBetweenScheduleJingles ??
          data?.activeBlock?.songsBetweenJingles ??
          data?.activeBlock?.songsBetweenScheduleJingles ??
          data?.activeBlock?.jingleEverySongs ??
          3
      ),
      noRepeatTitleCount: Number(data?.noRepeatTitleCount ?? data?.activeBlock?.noRepeatTitleCount ?? 10),
      noRepeatArtistCount: Number(data?.noRepeatArtistCount ?? data?.activeBlock?.noRepeatArtistCount ?? 5),
      activeBlockId: cleanText(data?.activeBlock?.id || ""),
      activeBlockName: cleanText(data?.activeBlock?.name || ""),
    };
  } catch {
    return {
      ok: false,
      selectedLane: "",
      scheduleOverrideActive: false,
      requestPriorityBlocked: false,
      interruptBroadcast: false,
      prioritizeOverRequests: false,
      playJinglesBetweenTracks: false,
      allowJingleOverlay: false,
      playbackOrder: "shuffled",
      songsBetweenJingles: 3,
      noRepeatTitleCount: 10,
      noRepeatArtistCount: 5,
      activeBlockId: "",
      activeBlockName: "",
    };
  }
}

async function getScheduleSelectedLane() {
  try {
    const policy = await getSchedulePolicy();
    return policy.selectedLane || "";
  } catch {
    return "";
  }
}

async function getRequestedLane(req?: NextRequest) {
  const modeState = readJson<Record<string, any>>(SMARTZJ_BROADCAST_MODE_FILE, {});

  try {
    const url = new URL(req?.url || "http://localhost");
    const rawLane = cleanText(
      url.searchParams.get("lane") ||
        url.searchParams.get("genreLane") ||
        url.searchParams.get("target") ||
        ""
    );

    const rawLaneKey = rawLane.toLowerCase().replace(/[^a-z0-9]+/g, "");

    if (rawLaneKey === "schedule" || rawLaneKey === "smartzjschedule" || rawLaneKey === "auto_schedule") {
      const scheduledLane = await getScheduleSelectedLane();

      writeJson(SMARTZJ_BROADCAST_MODE_FILE, {
        ok: true,
        mode: "SCHEDULE",
        selectedLane: scheduledLane,
        updatedAt: new Date().toISOString(),
        message: scheduledLane
          ? `SmartZJ schedule mode enabled. Schedule selected lane: ${scheduledLane}`
          : "SmartZJ schedule mode enabled, but no schedule lane was available. Auto clean mix will be used.",
      });

      return scheduledLane;
    }

    if (rawLaneKey === "auto" || rawLaneKey === "all" || rawLaneKey === "mix" || rawLaneKey === "clear") {
      writeJson(SMARTZJ_BROADCAST_MODE_FILE, {
        ok: true,
        mode: "AUTO_ROTATE",
        selectedLane: "",
        updatedAt: new Date().toISOString(),
        message: "SmartZJ lane lock cleared. Auto rotate enabled.",
      });

      return "";
    }

    const requestedLane = canonicalSmartZjLane(rawLane);

    if (requestedLane) {
      writeJson(SMARTZJ_BROADCAST_MODE_FILE, {
        ok: true,
        mode: "SELECTED_LANE",
        selectedLane: requestedLane,
        updatedAt: new Date().toISOString(),
        message: `SmartZJ lane lock saved: ${requestedLane}`,
      });

      return requestedLane;
    }
  } catch {
    // Fall through to saved state.
  }

  const savedMode = cleanText(modeState.mode).toUpperCase();

  if (savedMode === "SELECTED_LANE") {
    return canonicalSmartZjLane(modeState.selectedLane);
  }

  if (savedMode === "SCHEDULE" || savedMode === "AUTO_SCHEDULE") {
    return await getScheduleSelectedLane();
  }

  return "";
}

function trackMatchesLane(track: AnyTrack, requestedLane: string) {
  if (!requestedLane) return true;

  const trackLane = laneKey(getSmartZjGenreLane(track));
  const requested = laneKey(requestedLane);

  if (trackLane === requested) return true;

  // Schedule may select broad "Dancehall" while the clean live pool stores
  // new dancehall as "Fresh-Dancehall". Ole-School stays separate unless
  // schedule requests Ole-School-Dancehall directly.
  if (requested === "dancehall" && trackLane === "freshdancehall") {
    return true;
  }

  return false;
}


// THA_CORE_CLEAN_NEXT_STRICT_FOLDER_LANE_V1
function trackAudioPathTextV1(track: AnyTrack) {
  return cleanText(
    pickSafeUrl(track) ||
      track.audioUrl ||
      track.streamUrl ||
      track.listen_url ||
      track.cleanAudioUrl ||
      track.processedAudioUrl ||
      track.azuraRelativePath ||
      track.sourceRelativePath ||
      track.relativePath ||
      track.sourceFilePath ||
      track.localAudioPath ||
      track.folder ||
      track.id ||
      track.trackId ||
      ""
  ).replace(/\\/g, "/");
}

function trackStrictlyMatchesRequestedFolderLaneV1(track: AnyTrack, requestedLane: string) {
  const lane = canonicalSmartZjLane(requestedLane);
  if (!lane) return true;

  const key = laneKey(lane);
  const pathText = trackAudioPathTextV1(track).toLowerCase();
  if (!pathText) return false;

  if (key === "oleschooldancehall") {
    return pathText.includes("/ole-school-dancehall/") || pathText.includes("ole-school-dancehall");
  }

  if (key === "freshdancehall") {
    return pathText.includes("/fresh-dancehall/") || pathText.includes("fresh-dancehall");
  }

  if (key === "reggae") {
    return pathText.includes("/reggae/") || pathText.includes("reggae");
  }

  if (key === "hiphop") {
    return pathText.includes("/hip-hop/") || pathText.includes("hip-hop") || pathText.includes("hiphop");
  }

  if (key === "rnb") {
    return pathText.includes("/r-n-b/") || pathText.includes("r-n-b") || pathText.includes("rnb");
  }

  if (key === "dancehall") {
    return (
      pathText.includes("/dancehall/") ||
      pathText.includes("/fresh-dancehall/") ||
      pathText.includes("/ole-school-dancehall/") ||
      pathText.includes("dancehall")
    );
  }

  return pathText.includes("/" + lane.toLowerCase() + "/") || pathText.includes(lane.toLowerCase());
}


// THA_CORE_CLEAN_NEXT_FINAL_SELECTED_LANE_GATE_V1
function currentBroadcastTrackForLaneCheckV1(current: Record<string, any>) {
  const track = (current?.track && typeof current.track === "object") ? current.track : {};
  const audioUrl = cleanText(
    current?.audioUrl ||
      current?.streamUrl ||
      current?.listen_url ||
      track.audioUrl ||
      track.cleanAudioUrl ||
      track.processedAudioUrl ||
      ""
  );

  return {
    ...track,
    audioUrl,
    cleanAudioUrl: audioUrl,
    processedAudioUrl: audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    genreLane: cleanText(current?.genreLane || track.genreLane || ""),
    title: cleanText(current?.title || track.title || ""),
  };
}

function writeSelectedLaneNoAudioStandbyV1(
  requestedLane: string,
  reason: string,
  extra: Record<string, any> = {}
) {
  const now = new Date().toISOString();

  writeJson(CURRENT_BROADCAST_FILE, {
    ok: false,
    type: "standby",
    mode: "SCHEDULE_SELECTED_LANE_NO_AUDIO",
    source: "CONTROL_PANEL_MASTER_SCHEDULE_EDITOR",
    status: reason,
    requestedLane,
    selectedLane: requestedLane,
    laneLocked: Boolean(requestedLane),
    title: "No scheduled audio ready",
    artist: "",
    genreLane: requestedLane,
    audioUrl: "",
    streamUrl: "",
    listen_url: "",
    directAudioUrl: "",
    rawAzuraBlocked: true,
    oldFallbackBlocked: true,
    blockedFallbackLeak: true,
    smartZJRequired: false,
    updatedAt: now,
    message: "Selected Schedule Editor lane has no matching clean audio ready. Current-broadcast cleared to safe no-audio standby.",
    ...extra,
  });
}


// THA_CORE_CLEAN_NEXT_SELECTED_LANE_METADATA_OR_PATH_V2
function trackMatchesSelectedScheduleLaneV2(track: AnyTrack, requestedLane: string) {
  const lane = canonicalSmartZjLane(requestedLane);
  if (!lane) return true;

  // Schedule Editor lane truth can come from metadata/library counts OR physical clean path.
  // Do not reject valid Schedule Editor tracks just because their clean URL is stored under an older/original folder.
  return trackMatchesLane(track, lane) || trackStrictlyMatchesRequestedFolderLaneV1(track, lane);
}

function getLaneCounts(tracks: AnyTrack[]) {
  const counts: Record<string, number> = {};

  for (const track of tracks) {
    const lane = canonicalSmartZjLane(getSmartZjGenreLane(track) || "SmartZJ Clean Mix");
    counts[lane] = (counts[lane] || 0) + 1;
  }

  return counts;
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

function publicCleanAudioExists(url: string) {
  const cleanUrl = cleanText(url).split("?")[0];

  // THA_CORE_CONTROL_PANEL_MUZIK_PUBLIC_AUDIO_EXISTS_V1
  const allowedPublicAudioRoot =
    cleanUrl.startsWith("/audio/smartdj/clean/") ||
    cleanUrl.startsWith("/audio/control-panel/muzik/");

  if (!allowedPublicAudioRoot) {
    return false;
  }

  const parts = cleanUrl.replace(/^\/+/, "").split(/[\\/]+/).filter(Boolean);
  const filePath = join(process.cwd(), "public", ...parts);

  return existsSync(filePath);
}

function readSmartZjRequestBlock() {
  return readJson<Record<string, any>>(SMARTZJ_REQUEST_BLOCK_FILE, {
    ok: true,
    blockType: "SONG_REQUESTS",
    queue: [],
  });
}

function writeSmartZjRequestBlock(block: Record<string, any>) {
  writeJson(SMARTZJ_REQUEST_BLOCK_FILE, {
    ...block,
    ok: true,
    blockType: "SONG_REQUESTS",
    queue: Array.isArray(block.queue) ? block.queue : [],
    updatedAt: new Date().toISOString(),
  });
}

function getNextReadySmartZjRequest(schedulePolicy: Record<string, any> | null | undefined) {
  if (Boolean(schedulePolicy?.prioritizeOverRequests || schedulePolicy?.requestPriorityBlocked)) {
    return null;
  }

  const block = readSmartZjRequestBlock();
  const queue = Array.isArray(block.queue) ? block.queue : [];

  for (const item of queue) {
    const status = cleanText(item?.status).toUpperCase();
    if (status !== "REQUEST_READY") continue;
    if (item?.ready === false) continue;
    if (!item?.track || typeof item.track !== "object") continue;

    const track = item.track as AnyTrack;
    const audioUrl = pickSafeUrl(track);

    if (!audioUrl || !publicCleanAudioExists(audioUrl)) continue;

    return {
      item,
      track: {
        ...track,
        id: cleanText(track.id || track.trackId || item.requestId || item.id || item.title),
        trackId: cleanText(track.trackId || track.id || item.requestId || item.id || item.title),
        title: cleanText(track.title || item.title || "Listener Request"),
        artist: cleanText(track.artist || item.artist || "AzuraCast"),
        source: "SMARTZJ_REQUEST_BLOCK",
        requestId: cleanText(item.requestId || item.id),
        requestedBy: cleanText(item.requestedBy || "Listener"),
        requestPriority: "REQUEST_PRIORITY_NEXT",
        audioUrl,
        cleanAudioUrl: audioUrl,
        processedAudioUrl: audioUrl,
        safetyStatus: "READY",
        cleanStatus: "PROCESSED_AUDIO_READY",
        needsBleep: false,
        held: false,
        rawAudioBlocked: true,
      },
    };
  }

  return null;
}

function markSmartZjRequestPlayed(requestId: string) {
  if (!requestId) return;

  const block = readSmartZjRequestBlock();
  const queue = Array.isArray(block.queue) ? block.queue : [];
  const now = new Date().toISOString();

  writeSmartZjRequestBlock({
    ...block,
    queue: queue.map((item: Record<string, any>) => {
      const itemId = cleanText(item.requestId || item.id);
      if (itemId !== requestId) return item;

      return {
        ...item,
        status: "PLAYED",
        ready: false,
        playedAt: now,
        updatedAt: now,
        message: "Request was sent to SmartZJ current broadcast.",
      };
    }),
  });
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


// THA_CORE_CLEAN_NEXT_LOAD_SCHEDULE_MUSIC_LIBRARY_V1
async function readScheduleMusicLibraryTracksForCleanNextV1() {
  try {
    const res = await fetch(`${internalBaseUrl()}/api/radio/smartzj-schedule?cleanNextMusicLibrary=1`, {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    });

    const data = await res.json().catch(() => ({}));
    const tracks = Array.isArray(data?.musicLibrary?.tracks) ? data.musicLibrary.tracks : [];

    return tracks
      .map((track: Record<string, any>, index: number) => {
        const rel = cleanText(track.relativePath || track.sourceRelativePath || track.file || "");
        const audioUrl = cleanText(
          track.safeAudioUrl ||
            track.cleanAudioUrl ||
            track.audioUrl ||
            track.url ||
            track.publicPath ||
            ""
        );

        if (
          !audioUrl.startsWith("/audio/control-panel/muzik/") &&
          !audioUrl.startsWith("/audio/smartdj/clean/")
        ) {
          return null;
        }

        const relParts = rel.split(/[\\/]+/).filter(Boolean);
        const urlParts = audioUrl.split(/[\\/]+/).filter(Boolean);
        const folderLane = cleanText(track.genreLane || track.lane || track.primaryLane || track.folder || relParts[0] || urlParts[2] || "");
        const genreLane = canonicalSmartZjLane(folderLane);
        const fileName = cleanText(relParts[relParts.length - 1] || urlParts[urlParts.length - 1] || `schedule-track-${index + 1}`);
        const title = cleanText(track.title || track.name || fileName.replace(/\.[a-z0-9]+$/i, "") || "Schedule Editor Track");
        const id = cleanText(track.id || track.trackId || rel || audioUrl || `${genreLane}-${index}`);

        return {
          ...track,
          id,
          trackId: cleanText(track.trackId || id),
          title,
          artist: cleanText(track.artist || "Schedule Editor"),
          genreLane,
          lane: genreLane,
          folder: genreLane,
          audioUrl,
          safeAudioUrl: audioUrl,
          cleanAudioUrl: audioUrl,
          processedAudioUrl: audioUrl,
          streamUrl: audioUrl,
          listen_url: audioUrl,
          relativePath: rel || audioUrl.replace(/^\/audio\/control-panel\/muzik\//, ""),
          sourceRelativePath: rel || audioUrl.replace(/^\/audio\/control-panel\/muzik\//, ""),
          source: "SCHEDULE_EDITOR_MUSIC_LIBRARY",
          status: "READY",
          safetyStatus: "READY",
          cleanStatus: "PROCESSED_AUDIO_READY",
          rawAudioBlocked: true,
          held: false,
          needsBleep: false,
        };
      })
      .filter(Boolean) as AnyTrack[];
  } catch {
    return [];
  }
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

function readLanePlayHistory() {
  return readJson<Record<string, any>>(LANE_PLAY_HISTORY_FILE, {
    ok: true,
    policy: "Per-lane SmartZJ play history. Every clean READY track plays once before repeat.",
    lanes: {},
  });
}

function uniqueTrackKeys(cleanTracks: AnyTrack[]) {
  const keys: string[] = [];
  const seen = new Set<string>();

  for (const track of cleanTracks) {
    const key = getTrackKey(track);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
  }

  return keys;
}

function laneHistoryName(cleanTracks: AnyTrack[], track?: AnyTrack) {
  const sourceTrack = track || cleanTracks[0] || {};
  return canonicalSmartZjLane(getSmartZjGenreLane(sourceTrack) || sourceTrack.genreLane || "SmartZJ Clean Mix") || "SmartZJ-Clean-Mix";
}

function normalizeSmartZjRepeatText(value: any) {
  return cleanText(value)
    .toLowerCase()
    .replace(/\b(official|music|video|audio|mp3|clean|version|radio|edit|lyric|lyrics|visualizer|ft|feat|featuring)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function smartZjRepeatTitleKey(track: AnyTrack) {
  return normalizeSmartZjRepeatText(titleFromTrack(track));
}

function smartZjRepeatArtistKey(track: AnyTrack) {
  const explicitArtist = normalizeSmartZjRepeatText(artistFromTrack(track));

    // SMARTZJ_WEAK_ARTIST_METADATA_FALLBACK_V1
  // If metadata says AzuraCast, Tha Core, or lane names, ignore it and derive artist from title/file name.
  const weakArtistKeys = new Set([
    "azuracast",
    "tha core",
    "smartzj",
    "smart dj",
    "jingles",
    "test jingles",
    "dancehall",
    "fresh dancehall",
    "ole school dancehall",
    "old school dancehall",
    "reggae",
    "hip hop",
    "r n b",
    "rnb",
    "smartzj clean mix"
  ]);

  if (explicitArtist && !weakArtistKeys.has(explicitArtist)) {
    return explicitArtist.split(" ").slice(0, 3).join(" ");
  }

  // SMARTZJ_STRICT_ARTIST_FAMILY_KEY_V1
  // If real artist metadata is missing/AzuraCast, use a stricter artist-family key from the title.
  // This stops same-artist runs like "nicodemus suzy wong" then "nicodemus spring valley".
  const fallbackTitleKey = smartZjRepeatTitleKey(track)
    .replace(/^(fresh dancehall|ole school dancehall|old school dancehall|dancehall|reggae|hip hop|r n b|rnb|jingles|test jingles)\s+/i, "")
    .trim();

  const fallbackWords = fallbackTitleKey.split(" ").filter(Boolean);
  if (fallbackWords.length <= 0) return "";

  const first = fallbackWords[0];
  const twoWordPrefixes = new Set(["a", "dj", "mc", "lil", "young", "big", "baby", "king", "queen"]);

  if (twoWordPrefixes.has(first) && fallbackWords.length >= 2) {
    return fallbackWords.slice(0, 2).join(" ");
  }

  return first;
}

// SMARTZJ_ARTIST_HISTORY_FAMILY_KEYS_V1
function smartZjRepeatArtistHistoryKeys(value: unknown) {
  const cleanValue = normalizeSmartZjRepeatText(value);
  if (!cleanValue) return [];

  const firstWord = cleanValue.split(" ").filter(Boolean)[0] || "";
  return Array.from(new Set([cleanValue, firstWord].filter(Boolean)));
}

function pickSmartZjAntiRepeatCandidate(
  tracks: AnyTrack[],
  currentKey: string,
  recentKeySet: Set<string>,
  recentTitleSet: Set<string>,
  recentArtistSet: Set<string>,
  preferNewest: boolean
) {
  const candidates = tracks
    .map((track) => ({
      track,
      key: getTrackKey(track),
      titleKey: smartZjRepeatTitleKey(track),
      artistKey: smartZjRepeatArtistKey(track),
      readyTime: getFreshReadyTime(track),
    }))
    .filter((item) => item.key && item.key !== currentKey);

  const stages = [
    candidates.filter((item) => !recentKeySet.has(item.key) && !recentTitleSet.has(item.titleKey) && !recentArtistSet.has(item.artistKey)),
    candidates.filter((item) => !recentKeySet.has(item.key) && !recentTitleSet.has(item.titleKey)),
    candidates.filter((item) => !recentKeySet.has(item.key)),
    candidates,
  ];

  for (const stage of stages) {
    if (stage.length <= 0) continue;

    if (preferNewest) {
      stage.sort((a, b) => b.readyTime - a.readyTime);
    }

    return stage[0].track;
  }

  return undefined;
}

function chooseSmartZjFreshFirstNext(cleanTracks: AnyTrack[], currentKey: string, playerState: Record<string, any>) {
  const freshState = readFreshFirstState();
  const laneHistory = readLanePlayHistory();

  const lane = laneHistoryName(cleanTracks);
  const allKeys = uniqueTrackKeys(cleanTracks);
  const allKeySet = new Set(allKeys);

  const laneStates = laneHistory.lanes && typeof laneHistory.lanes === "object"
    ? laneHistory.lanes
    : {};

  const laneState = laneStates[lane] || {};
  const playedKeys = Array.isArray(laneState.playedKeys)
    ? laneState.playedKeys.map(String).filter((key: string) => allKeySet.has(key))
    : [];

  const playedSet = new Set(playedKeys);

  const knownKeys = new Set(
    Array.isArray(freshState.knownKeys) ? freshState.knownKeys.map(String) : []
  );

  const recentKeySet = new Set(
    Array.isArray(freshState.recentKeys) ? freshState.recentKeys.map(String) : []
  );

  const recentTitleSet = new Set(
    Array.isArray(freshState.recentTitleKeys) ? freshState.recentTitleKeys.map(String) : []
  );

  const recentArtistSet = new Set(
    Array.isArray(freshState.recentArtistKeys) ? freshState.recentArtistKeys.flatMap((key: unknown) => smartZjRepeatArtistHistoryKeys(key)) : []
  );

  const hasKnownHistory = knownKeys.size > 0;

  const unplayedTracks = cleanTracks.filter((track) => {
    const key = getTrackKey(track);
    return key && key !== currentKey && !playedSet.has(key);
  });

  if (unplayedTracks.length > 0) {
    const freshNewTracks = hasKnownHistory
      ? unplayedTracks.filter((track) => {
          const key = getTrackKey(track);
          return key && !knownKeys.has(key);
        })
      : [];

    if (freshNewTracks.length > 0) {
      const picked = pickSmartZjAntiRepeatCandidate(
        freshNewTracks,
        currentKey,
        recentKeySet,
        recentTitleSet,
        recentArtistSet,
        true
      ) || freshNewTracks[0];

      const pickedKey = getTrackKey(picked);
      const index = cleanTracks.findIndex((track) => getTrackKey(track) === pickedKey);

      return {
        track: picked,
        index: index >= 0 ? index : 0,
        reason: "FRESH_NEW_CLEAN_TRACK_FIRST_ANTI_REPEAT",
      };
    }

    const picked = pickSmartZjAntiRepeatCandidate(
      unplayedTracks,
      currentKey,
      recentKeySet,
      recentTitleSet,
      recentArtistSet,
      false
    ) || unplayedTracks[0];

    const pickedKey = getTrackKey(picked);
    const index = cleanTracks.findIndex((track) => getTrackKey(track) === pickedKey);

    return {
      track: picked,
      index: index >= 0 ? index : 0,
      reason: "LANE_ROUND_UNPLAYED_CLEAN_TRACK_ANTI_REPEAT",
    };
  }

  const resetTracks = cleanTracks.filter((track) => {
    const key = getTrackKey(track);
    return key && key !== currentKey;
  });

  const picked = pickSmartZjAntiRepeatCandidate(
    resetTracks,
    currentKey,
    recentKeySet,
    recentTitleSet,
    recentArtistSet,
    true
  ) || resetTracks[0] || cleanTracks[0];

  const pickedKey = getTrackKey(picked);
  const index = cleanTracks.findIndex((track) => getTrackKey(track) === pickedKey);

  return {
    track: picked,
    index: index >= 0 ? index : 0,
    reason: "LANE_ROUND_COMPLETE_RESET_ANTI_REPEAT",
  };
}

function chooseSmartZjPlaybackOrderNext(
  cleanTracks: AnyTrack[],
  currentKey: string,
  playerState: Record<string, any>,
  playbackOrder: unknown,
  noRepeatTitleCount: unknown,
  noRepeatArtistCount: unknown
) {
  const order = cleanText(playbackOrder || "shuffled").toLowerCase();
  const noRepeatTitleLimit = Math.max(0, Math.min(200, Math.floor(Number(noRepeatTitleCount ?? 10) || 0)));
  const noRepeatArtistLimit = Math.max(0, Math.min(100, Math.floor(Number(noRepeatArtistCount ?? 5) || 0)));
  const freshState = readFreshFirstState();

  const recentKeySet = new Set(
    Array.isArray(freshState.recentKeys) ? freshState.recentKeys.map(String) : []
  );

  const recentTitleKeys = Array.isArray(freshState.recentTitleKeys)
    ? freshState.recentTitleKeys.map(String)
    : [];

  const recentArtistKeys = Array.isArray(freshState.recentArtistKeys)
    ? freshState.recentArtistKeys.flatMap((key: unknown) => smartZjRepeatArtistHistoryKeys(key))
    : [];

  // SMARTZJ_SCHEDULE_NO_REPEAT_RECENT_WINDOW_FIX_V1
  // Recent title/artist keys are stored newest-first, so block from the front of the list.
  const recentTitleSet = new Set(
    noRepeatTitleLimit > 0 ? recentTitleKeys.slice(0, noRepeatTitleLimit) : []
  );

  const recentArtistSet = new Set(
    noRepeatArtistLimit > 0 ? recentArtistKeys.slice(0, noRepeatArtistLimit).flatMap((key: unknown) => smartZjRepeatArtistHistoryKeys(key)) : []
  );

  const candidates = cleanTracks.filter((track) => {
    const key = getTrackKey(track);
    return key && key !== currentKey;
  });

  // SMARTZJ_RANDOM_ONLY_TRUE_RANDOM_V2
  // Random is true random. Shuffled falls through to full-lane bag before repeat.
  if (order === "random") {
    const randomized = [...candidates];

    for (let i = randomized.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [randomized[i], randomized[j]] = [randomized[j], randomized[i]];
    }

    const picked =
      pickSmartZjAntiRepeatCandidate(
        randomized,
        currentKey,
        recentKeySet,
        recentTitleSet,
        recentArtistSet,
        false
      ) || randomized[0] || cleanTracks[0];

    const pickedKey = getTrackKey(picked);
    const index = cleanTracks.findIndex((track) => getTrackKey(track) === pickedKey);

    return {
      track: picked,
      index: index >= 0 ? index : 0,
      reason: "SCHEDULE_RANDOM_ANTI_REPEAT",
    };
  }

  if (order === "sequential") {
    const currentIndex = cleanTracks.findIndex((track) => getTrackKey(track) === currentKey);
    const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;

    const ordered = cleanTracks
      .slice(startIndex)
      .concat(cleanTracks.slice(0, startIndex))
      .filter((track) => {
        const key = getTrackKey(track);
        return key && key !== currentKey;
      });

    const picked =
      pickSmartZjAntiRepeatCandidate(
        ordered,
        currentKey,
        recentKeySet,
        recentTitleSet,
        recentArtistSet,
        false
      ) || ordered[0] || cleanTracks[0];

    const pickedKey = getTrackKey(picked);
    const index = cleanTracks.findIndex((track) => getTrackKey(track) === pickedKey);

    return {
      track: picked,
      index: index >= 0 ? index : 0,
      reason: "SCHEDULE_SEQUENTIAL_NEXT_ANTI_REPEAT",
    };
  }

  if (order === "shuffled" || order === "shuffle") {
    const selection = chooseSmartZjFreshFirstNext(cleanTracks, currentKey, playerState);

    return {
      ...selection,
      reason: `SCHEDULE_SHUFFLE_FULL_LANE_${selection.reason}`,
    };
  }

  const selection = chooseSmartZjFreshFirstNext(cleanTracks, currentKey, playerState);

  return {
    ...selection,
    reason: `SCHEDULE_DEFAULT_SHUFFLE_${selection.reason}`,
  };
}
function rememberSmartZjFreshFirstPlay(track: AnyTrack, cleanTracks: AnyTrack[]) {
  const freshState = readFreshFirstState();
  const laneHistory = readLanePlayHistory();

  const playedKey = getTrackKey(track);
  const allKeys = uniqueTrackKeys(cleanTracks);
  const allKeySet = new Set(allKeys);
  const lane = laneHistoryName(cleanTracks, track);
  const now = new Date().toISOString();

  const laneStates = laneHistory.lanes && typeof laneHistory.lanes === "object"
    ? laneHistory.lanes
    : {};

  const previousLaneState = laneStates[lane] || {};
  let round = Number(previousLaneState.round || 1);
  let playedKeys = Array.isArray(previousLaneState.playedKeys)
    ? previousLaneState.playedKeys.map(String).filter((key: string) => allKeySet.has(key))
    : [];

  if (allKeys.length > 0 && playedKeys.length >= allKeys.length) {
    round += 1;
    playedKeys = [];
  }

  if (playedKey && allKeySet.has(playedKey) && !playedKeys.includes(playedKey)) {
    playedKeys.push(playedKey);
  }

  const previousKnown = Array.isArray(freshState.knownKeys) ? freshState.knownKeys.map(String) : [];
  const previousRecent = Array.isArray(freshState.recentKeys) ? freshState.recentKeys.map(String) : [];
  const previousRecentTitles = Array.isArray(freshState.recentTitleKeys) ? freshState.recentTitleKeys.map(String) : [];
  const previousRecentArtists = Array.isArray(freshState.recentArtistKeys) ? freshState.recentArtistKeys.flatMap((key: unknown) => smartZjRepeatArtistHistoryKeys(key)) : [];

  const playedTitleKey = smartZjRepeatTitleKey(track);
  const playedArtistKey = smartZjRepeatArtistKey(track);

  const knownKeys = Array.from(new Set([...previousKnown, ...allKeys])).slice(-5000);
  const recentLimit = Math.max(1, Math.min(500, cleanTracks.length || 1));
  const recentKeys = [
    playedKey,
    ...previousRecent.filter((key) => key && key !== playedKey),
  ].filter(Boolean).slice(0, recentLimit);

  const recentTitleKeys = [
    playedTitleKey,
    ...previousRecentTitles.filter((key) => key && key !== playedTitleKey),
  ].filter(Boolean).slice(0, Math.min(80, recentLimit));

  const recentArtistKeys = [
    playedArtistKey,
    ...previousRecentArtists.filter((key) => key && key !== playedArtistKey),
  ].filter(Boolean).slice(0, Math.min(40, recentLimit));

  const updatedLaneState = {
    ok: true,
    lane,
    round,
    playableCount: allKeys.length,
    playedCount: playedKeys.length,
    remainingCount: Math.max(allKeys.length - playedKeys.length, 0),
    lastPlayedKey: playedKey,
    lastPlayedTitle: titleFromTrack(track),
    playedKeys,
    updatedAt: now,
  };

  writeJson(LANE_PLAY_HISTORY_FILE, {
    ok: true,
    policy: "Per-lane SmartZJ play history. Every clean READY track plays once before repeat.",
    updatedAt: now,
    lanes: {
      ...laneStates,
      [lane]: updatedLaneState,
    },
  });

  writeJson(FRESH_FIRST_STATE_FILE, {
    ok: true,
    policy: "Fresh clean READY tracks go to the front. Raw Azura blocked. Per-lane history prevents repeats before full lane round.",
    lastPlayedKey: playedKey,
    lastPlayedTitle: titleFromTrack(track),
    cleanTrackCount: cleanTracks.length,
    lane,
    laneRound: round,
    lanePlayedCount: playedKeys.length,
    laneRemainingCount: Math.max(allKeys.length - playedKeys.length, 0),
    knownKeys,
    recentKeys,
    recentTitleKeys,
    recentArtistKeys,
    updatedAt: now,
  });
}


// SMARTZJ_LANE_FALLBACK_FROM_ID_URL_V1
function deriveSmartZjLaneFromIdOrUrl(track: AnyTrack) {
  const direct = cleanText(
    track.genreLane ||
      track.genre ||
      track.lane ||
      track.folder ||
      track.target
  );

  if (direct && direct.toLowerCase() !== "unknown" && laneKey(direct) !== "all") {
    return canonicalSmartZjLane(direct);
  }

  const pathValues = [
    track.id,
    track.trackId,
    track.azuraRelativePath,
    track.sourceFilePath,
    track.localAudioPath,
  ];

  for (const value of pathValues) {
    const text = cleanText(value).replace(/\\/g, "/");
    const first = text.split("/").map((part) => part.trim()).filter(Boolean)[0] || "";

    if (
      first &&
      !["audio", "public", "home", "var", "tmp", "mnt", "data"].includes(first.toLowerCase())
    ) {
      return canonicalSmartZjLane(first);
    }
  }

  const urlValues = [
    track.audioUrl,
    track.cleanAudioUrl,
    track.processedAudioUrl,
    track.streamUrl,
    track.listen_url,
  ];

  for (const value of urlValues) {
    const text = cleanText(value);
    const match = text.match(/smartdj-local-clean-([^_\/]+)_/i);
    if (match?.[1]) {
      return canonicalSmartZjLane(match[1]);
    }
  }

  return "";
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

  return cleanText(
    track.genreLane ||
      track.genre ||
      track.lane ||
      track.folder ||
      deriveSmartZjLaneFromIdOrUrl(track) ||
      "SmartZJ Clean Mix"
  );
}

function isSmartZjJingleTrack(track: AnyTrack) {
  return laneKey(getSmartZjGenreLane(track)) === "jingles";
}

const SCHEDULE_JINGLE_DURATION_SECONDS: Record<string, number> = {
  "ad-drop.mp3": 9,
  "dj-drop.mp3": 15,
  "hype-drop.mp3": 371,
  "next-jingle.mp3": 150,
  "sponsor-drop.mp3": 10,
  "station-id.mp3": 46,
  "voice-drop.mp3": 7,
};

function getScheduleJingleHoldSeconds(trackOrBroadcast: AnyTrack | Record<string, any>) {
  const audioUrl = String(
    trackOrBroadcast?.audioUrl ||
      trackOrBroadcast?.streamUrl ||
      trackOrBroadcast?.listen_url ||
      trackOrBroadcast?.track?.audioUrl ||
      ""
  );

  const fileName = audioUrl.replace(/\\/g, "/").split("/").pop()?.toLowerCase() || "";
  const duration = SCHEDULE_JINGLE_DURATION_SECONDS[fileName] || 15;

  return Math.max(7, duration);
}

const DEFAULT_SONGS_BETWEEN_SCHEDULE_JINGLES = 3;

function getSongsBetweenScheduleJingles(policy: Record<string, any> | null | undefined) {
  const raw =
    policy?.songsBetweenJingles ??
    policy?.jingleEverySongs ??
    policy?.jingleEvery ??
    DEFAULT_SONGS_BETWEEN_SCHEDULE_JINGLES;

  const value = Number(raw);

  if (!Number.isFinite(value)) return DEFAULT_SONGS_BETWEEN_SCHEDULE_JINGLES;

  return Math.max(1, Math.min(12, Math.floor(value)));
}

const SMARTZJ_MIN_MUSIC_PLAY_SECONDS = 120;

function getBroadcastAgeSeconds(currentBroadcastState: Record<string, any>) {
  const startedAtMs = Date.parse(String(currentBroadcastState?.startedAt || ""));
  return Number.isFinite(startedAtMs)
    ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
    : 9999;
}

function shouldBypassSmartZjEarlyHold(req?: NextRequest) {
  const params = req?.nextUrl?.searchParams;

  return Boolean(
    params?.get("force") === "1" ||
      params?.get("manual") === "1" ||
      params?.get("ended") === "1" ||
      params?.get("ownerMonitorEnded") ||
      params?.get("listenerEnded") ||
      params?.get("watchdogEnded")
  );
}

function loadScheduleJingleTracksFromDrops(): AnyTrack[] {
  const dropsDir = join(process.cwd(), "public", "drops");

  if (!existsSync(dropsDir)) return [];

  return readdirSync(dropsDir)
    .filter((fileName) => {
      const lowerFileName = fileName.toLowerCase();
      if (!lowerFileName.endsWith(".mp3")) return false;
      const duration = SCHEDULE_JINGLE_DURATION_SECONDS[lowerFileName] || 15;
      // SMARTZJ_SCHEDULE_MORE_SHORT_JINGLES_V1
      // Short stingers/drops 7-46s are allowed between songs.
      // Long jingles stay blocked here until overlay/mix mode is wired.
      return duration >= 7 && duration <= 46;
    })
    .sort((a, b) => a.localeCompare(b))
    .map((fileName) => {
      const safeFileName = fileName.replace(/\\/g, "/").split("/").pop() || fileName;
      const title = safeFileName
        .replace(/\.mp3$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const url = `/drops/${safeFileName}`;
      const trackId = `Jingles/${safeFileName}`;

      return {
        id: trackId,
        trackId,
        title: title || safeFileName,
        artist: "Tha Core",
        source: "SCHEDULE_JINGLES",
        genreLane: "Jingles",
        lane: "Jingles",
        folder: "Jingles",
        audioUrl: url,
        streamUrl: url,
        cleanAudioUrl: url,
        processedAudioUrl: url,
        status: "READY",
        safetyStatus: "READY",
        cleanStatus: "PROCESSED_AUDIO_READY",
        bleepJobStatus: "PROCESSED_AUDIO_READY",
        needsBleep: false,
        held: false,
        rawAudioBlocked: true,
        durationSeconds: SCHEDULE_JINGLE_DURATION_SECONDS[safeFileName.toLowerCase()] || 15,
        safetyNote:
          "Auto-loaded approved Tha Core public/drop jingle for SmartZJ schedule between-track use.",
      };
    });
}

function mergeScheduleJinglesWithCleanTracks(tracks: AnyTrack[]) {
  const merged = [...tracks];
  const seen = new Set(
    merged.map((track) =>
      String(track.trackId || track.id || track.audioUrl || "").toLowerCase()
    )
  );

  for (const jingle of loadScheduleJingleTracksFromDrops()) {
    const key = String(jingle.trackId || jingle.id || jingle.audioUrl || "").toLowerCase();
    const urlKey = String(jingle.audioUrl || "").toLowerCase();

    if (seen.has(key) || seen.has(urlKey)) continue;

    merged.push(jingle);
    seen.add(key);
    seen.add(urlKey);
  }

  return merged;
}

function smartZjDuplicateTitleKey(track: AnyTrack) {
  return cleanText(titleFromTrack(track))
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(clean|radio|edit|official|audio|video|lyrics|mp3|verified|real|bleeped|version|visualizer|feat|ft)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function smartZjRecentTitleKeys(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => cleanText(item).toLowerCase()).filter(Boolean).slice(0, 20)
    : [];
}

function filterSmartZjRecentDuplicateTitles(
  tracks: AnyTrack[],
  playerState: Record<string, any>
) {
  const recentTitleKeys = smartZjRecentTitleKeys(playerState.recentTitleKeys);
  const currentTitleKey = cleanText(playerState.currentTitleKey || "").toLowerCase();

  const filtered = tracks.filter((track) => {
    const key = smartZjDuplicateTitleKey(track);
    if (!key) return true;
    if (key === currentTitleKey) return false;
    return !recentTitleKeys.includes(key);
  });

  return filtered.length >= Math.min(8, tracks.length) ? filtered : tracks;
}

function smartZjCanonicalSongKey(track: AnyTrack) {
  const lane = cleanText(track?.genreLane || track?.lane || "").toLowerCase();
  const rawValue = String(
    track?.azuraRelativePath ||
      track?.sourceFilePath ||
      track?.localAudioPath ||
      track?.trackId ||
      track?.id ||
      track?.title ||
      track?.audioUrl ||
      ""
  );

  const fileName = rawValue.split(/[\\/]/).pop() || rawValue;

  let key = fileName.toLowerCase();
  key = key.replace(/\.(mp3|wav|m4a|aac)$/gi, "");
  key = key.replace(/^smartdj[-_\s]*local[-_\s]*clean[-_\s]*/gi, "");
  key = key.replace(/[-_\s]*(verified[-_\s]*clean|real[-_\s]*bleeped|second[-_\s]*scan[-_\s]*bleeped)$/gi, "");
  key = key.replace(/_mp3(_\d+)?$/gi, "");
  key = key.replace(/[-_\s]*(official|video|lyrics|audio|clean|version|promo)\b/gi, " ");
  key = key.replace(/[_\-]+/g, " ");
  key = key.replace(/\s+/g, " ").trim();

  return `${lane || "any"}:${key || cleanText(rawValue).toLowerCase()}`;
}

function dedupeSmartZjTracksBySongKey(tracks: AnyTrack[]) {
  const seen = new Set<string>();
  const deduped: AnyTrack[] = [];

  for (const track of tracks) {
    const key = smartZjCanonicalSongKey(track);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    deduped.push(track);
  }

  return deduped.length ? deduped : tracks;
}


// AI_HOST_BETWEEN_SONG_SMALL_HELPER_V1
// Small safe helper: lets Nia become the selected between-song jingle/drop.
// SmartZJ remains the broadcast brain. If AI fails, normal jingles continue.
async function getNiaBetweenSongDrop(input: {
  currentBroadcastState: Record<string, any>;
  requestedLane: string;
  schedulePolicy: Record<string, any> | null | undefined;
  songsSinceScheduleJingle: number;
  songsBetweenScheduleJingles: number;
  nextMusicTrack?: AnyTrack;
}): Promise<AnyTrack | null> {
  try {
    if (process.env.AI_HOST_BETWEEN_SONG_ENABLED === "false") return null;

    const every = Math.max(
      1,
      Number(process.env.AI_HOST_EVERY_SONGS || input.songsBetweenScheduleJingles || 3)
    );

    if (input.songsSinceScheduleJingle < every) return null;

    const current = input.currentBroadcastState || {};
    const currentTrack = current.track || {};
    const nextTrack = input.nextMusicTrack || {};

    const body = {
      previousTitle: current.title || currentTrack.title || "",
      previousArtist: current.artist || currentTrack.artist || "",
      lane:
        input.requestedLane ||
        input.schedulePolicy?.selectedLane ||
        input.schedulePolicy?.activeBlockName ||
        current.genreLane ||
        currentTrack.genreLane ||
        "",
      nextTitle: titleFromTrack(nextTrack),
      nextArtist: artistFromTrack(nextTrack),
      blockSegmentName:
        input.schedulePolicy?.activeBlockName ||
        input.schedulePolicy?.activeBlockId ||
        "",
      blockSegmentEveryMinutes: 30,
    };

    const response = await fetch(`${internalBaseUrl()}/api/radio/ai-host-next-drop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.ok || !data?.track) return null;

    return data.track as AnyTrack;
  } catch {
    return null;
  }
}

// NIA_PROGRAM_LOCK_V1
// Full Nia program blocks must not be interrupted by SmartZJ AutoNext/watchdog.
// Only the Nia program broadcast route or a manual force override may return to music.
const NIA_PROGRAM_STATE_FILE = join(process.cwd(), ".data", "ai-host-program-broadcast-state.json");

function getNiaProgramLock(req?: NextRequest) {
  try {
    const requestUrl = req ? new URL(req.url) : null;
    const allowDuringNiaProgram =
      requestUrl?.searchParams.get("allowDuringNiaProgram") === "true" ||
      requestUrl?.searchParams.get("forceSmartZjDuringNiaProgram") === "true";

    if (allowDuringNiaProgram) return null;

    const raw = readFileSync(NIA_PROGRAM_STATE_FILE, "utf8");
    const state = JSON.parse(raw);

    if (!state?.active) return null;

    const expectedEndAtMs = Date.parse(String(state.expectedEndAt || ""));
    const stillInsideProgram =
      Number.isFinite(expectedEndAtMs) && expectedEndAtMs > Date.now() - 15000;

    if (!stillInsideProgram) return null;

    return {
      ok: true,
      status: "NIA_PROGRAM_ACTIVE",
      programId: state.programId,
      programName: state.programName,
      programSlot: state.programSlot,
      currentPartNumber: state.currentPartNumber,
      totalParts: state.totalParts,
      expectedEndAt: state.expectedEndAt,
      audioUrl: state.audioUrl,
    };
  } catch {
    return null;
  }
}
async function runMiniAutoNext(req?: NextRequest) {
  const niaProgramLock = getNiaProgramLock(req);
  if (niaProgramLock) {
    return NextResponse.json(
      {
        ok: false,
        action: "SMARTZJ_BLOCKED_BY_NIA_PROGRAM_LOCK",
        safety: "NIA_PROGRAM_LOCK_ACTIVE",
        message:
          "Nia full program is active. SmartZJ AutoNext is blocked until Nia finishes or owner returns to music.",
        niaProgramLock,
      },
      { status: 423 }
    );
  }

  const scheduleMusicLibraryTracks = await readScheduleMusicLibraryTracksForCleanNextV1();
  const allCleanTracks = mergeScheduleJinglesWithCleanTracks([
    ...readSmartTracks(),
    ...scheduleMusicLibraryTracks,
  ]);
  const requestedLane = await getRequestedLane(req);
  const schedulePolicy = await getSchedulePolicy();
  const scheduleModeActive =
    Boolean(requestedLane) || Boolean(schedulePolicy?.scheduleOverrideActive);

  const laneCleanTracks = requestedLane
    ? allCleanTracks.filter((track) => trackMatchesLane(track, requestedLane))
    : allCleanTracks;

  let cleanTracks = laneCleanTracks.filter((track) => {
    if (requestedLane && !trackMatchesSelectedScheduleLaneV2(track, requestedLane)) return false;
    const audioUrl = pickSafeUrl(track);
    return publicCleanAudioExists(audioUrl);
  });

  const requestedLaneKey = laneKey(requestedLane || "");

  if (requestedLaneKey !== "jingles") {
    cleanTracks = cleanTracks.filter((track) => !isSmartZjJingleTrack(track));
  }

  const skippedMissingAudioCount = laneCleanTracks.length - cleanTracks.length;

  if (!cleanTracks.length) {
    if (requestedLane) {
      writeSelectedLaneNoAudioStandbyV1(
        requestedLane,
        skippedMissingAudioCount > 0
          ? "NO_PLAYABLE_CLEAN_AUDIO_FILES_FOR_SELECTED_FOLDER_LANE"
          : "NO_READY_CLEAN_TRACKS_FOR_SELECTED_FOLDER_LANE",
        {
          allCleanTrackCount: allCleanTracks.length,
          laneTrackCount: laneCleanTracks.length,
          skippedMissingAudioCount,
          laneCounts: getLaneCounts(allCleanTracks),
        }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        route: "/api/listener/smartzj-clean-next",
        action: "SMARTZJ_MINI_AUTONEXT",
        status: skippedMissingAudioCount > 0 ? "NO_PLAYABLE_CLEAN_AUDIO_FILES" : "NO_READY_CLEAN_TRACKS",
        requestedLane,
        laneLocked: Boolean(requestedLane),
        allCleanTrackCount: allCleanTracks.length,
        laneTrackCount: laneCleanTracks.length,
        skippedMissingAudioCount,
        laneCounts: getLaneCounts(allCleanTracks),
        message: skippedMissingAudioCount > 0
          ? "SmartZJ found READY rows, but their clean audio files are missing on disk. Raw Azura remains blocked."
          : "No READY clean/bleeped SmartZJ rows found. Raw Azura remains blocked.",
      },
      {
        status: 423,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }

  const playerState = readJson<Record<string, any>>(PLAYER_STATE_FILE, {
    index: -1,
  });

  const jingleCounterState = readJson<Record<string, any>>(SMARTZJ_JINGLE_COUNTER_FILE, {
    songsSinceScheduleJingle: 0,
  });
const songsBetweenScheduleJingles = Math.max(1, Number(playerState.songsBetweenScheduleJingles || 0) || getSongsBetweenScheduleJingles(schedulePolicy) || 3);
  const songsSinceScheduleJingle = Math.max(
    0,
    Number(playerState.songsSinceScheduleJingle || 0),
    Number(jingleCounterState.songsSinceScheduleJingle || 0)
  );
const currentKey = getCurrentKey();

  const currentBroadcastState = readJson<Record<string, any>>(CURRENT_BROADCAST_FILE, {});
  const currentBroadcastLane = laneKey(
    currentBroadcastState?.genreLane ||
      currentBroadcastState?.track?.genreLane ||
      currentBroadcastState?.currentBroadcast?.genreLane ||
      ""
  );

  const currentBroadcastStatus = String(currentBroadcastState?.status || "");
  const bypassSmartZjEarlyHold = shouldBypassSmartZjEarlyHold(req);
  const scheduleInterruptBroadcast = Boolean(schedulePolicy?.interruptBroadcast);
  const allowEarlyScheduleInterrupt = scheduleModeActive && scheduleInterruptBroadcast;
  const shouldHoldCurrentTrack =
    currentBroadcastStatus === "SMARTDJ_BROADCASTING" &&
    currentBroadcastLane &&
    currentBroadcastLane !== "jingles" &&
    !allowEarlyScheduleInterrupt &&
    !bypassSmartZjEarlyHold;

  const currentBroadcastAudioForHoldV3 = cleanText(
    currentBroadcastState?.audioUrl ||
      currentBroadcastState?.streamUrl ||
      currentBroadcastState?.listen_url ||
      currentBroadcastState?.track?.audioUrl ||
      ""
  ); // THA_CORE_NO_HOLD_EMPTY_STANDBY_WHEN_SCHEDULE_HAS_TRACKS_V1

  const currentBroadcastSelectedLaneOk = !requestedLane || trackMatchesSelectedScheduleLaneV2(
    currentBroadcastTrackForLaneCheckV1(currentBroadcastState),
    requestedLane
  );

  if (shouldHoldCurrentTrack && currentBroadcastAudioForHoldV3 && currentBroadcastSelectedLaneOk) {
    const ageSeconds = getBroadcastAgeSeconds(currentBroadcastState);

    if (ageSeconds < SMARTZJ_MIN_MUSIC_PLAY_SECONDS) {
      return NextResponse.json(
        {
          ok: true,
          route: "/api/listener/smartzj-clean-next",
          action: "SMARTZJ_CURRENT_TRACK_HOLD",
          status: "WAITING_FOR_CURRENT_TRACK_TO_PLAY",
          title: currentBroadcastState?.title || currentBroadcastState?.track?.title || "Current Track",
          genreLane: currentBroadcastState?.genreLane || currentBroadcastState?.track?.genreLane || currentBroadcastLane,
          audioUrl: currentBroadcastState?.audioUrl || currentBroadcastState?.track?.audioUrl || "",
          streamUrl: currentBroadcastState?.streamUrl || currentBroadcastState?.audioUrl || "",
          listen_url: currentBroadcastState?.listen_url || currentBroadcastState?.audioUrl || "",
          ageSeconds,
          holdSeconds: SMARTZJ_MIN_MUSIC_PLAY_SECONDS,
          remainingHoldSeconds: Math.max(0, SMARTZJ_MIN_MUSIC_PLAY_SECONDS - ageSeconds),
          smartZjEarlySkipGuardActive: true,
          interruptBroadcast: scheduleInterruptBroadcast,
          scheduleModeActive,
          message: "SmartZJ blocked an early AutoNext call because this schedule block is set to wait until the current clean track finishes.",
          currentBroadcast: currentBroadcastState,
        },
        {
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      );
    }
  }

  if (currentBroadcastLane === "jingles") {
    const startedAtMs = Date.parse(String(currentBroadcastState?.startedAt || ""));
    const ageSeconds = Number.isFinite(startedAtMs)
      ? Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000))
      : 9999;
    const holdSeconds = getScheduleJingleHoldSeconds(currentBroadcastState);

    if (ageSeconds < holdSeconds) {
      return NextResponse.json(
        {
          ok: true,
          route: "/api/listener/smartzj-clean-next",
          action: "SMARTZJ_JINGLE_HOLD",
          status: "WAITING_FOR_JINGLE_TO_FINISH",
          title: currentBroadcastState?.title || currentBroadcastState?.track?.title || "Jingle",
          genreLane: "Jingles",
          audioUrl: currentBroadcastState?.audioUrl || currentBroadcastState?.track?.audioUrl || "",
          streamUrl: currentBroadcastState?.streamUrl || currentBroadcastState?.audioUrl || "",
          listen_url: currentBroadcastState?.listen_url || currentBroadcastState?.audioUrl || "",
          ageSeconds,
          holdSeconds,
          remainingHoldSeconds: Math.max(0, holdSeconds - ageSeconds),
          scheduleJingleHoldActive: true,
          message: "SmartZJ is holding the current jingle/drop until its safe play time finishes.",
          currentBroadcast: currentBroadcastState,
        },
        {
          headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
        }
      );
    }
  }
  const schedulePolicyAny = (schedulePolicy || {}) as Record<string, any>;

  const scheduleJingleEnabled =
    Boolean(schedulePolicy?.playJinglesBetweenTracks) ||
    Boolean(schedulePolicyAny.enableJingles) ||
    Boolean(schedulePolicyAny.jinglesEnabled) ||
    Number(playerState.songsBetweenScheduleJingles || 0) > 0;

  const scheduleJingleModeActive = scheduleModeActive || scheduleJingleEnabled;

  const scheduleJingleTracks =
    scheduleJingleEnabled && scheduleJingleModeActive
      ? loadScheduleJingleTracksFromDrops()
      : [];

  // SMARTZJ_SCHEDULE_JINGLE_FULL_POOL_ROTATION_V1
  // Rotate through all approved short jingles before repeating.
  const recentScheduleJingleAudioUrls = Array.isArray(playerState.recentScheduleJingleAudioUrls)
    ? playerState.recentScheduleJingleAudioUrls.map(String).filter(Boolean)
    : [];

  const shouldInsertScheduleJingle =
    scheduleJingleEnabled &&
    Boolean(scheduleJingleTracks.length) &&
    currentBroadcastLane !== "jingles" &&
    songsSinceScheduleJingle >= songsBetweenScheduleJingles;

  if (shouldInsertScheduleJingle) {
    // AI_HOST_REPLACE_JINGLE_POOL_WITH_NIA_V1
    const niaDropTrack = await getNiaBetweenSongDrop({
      currentBroadcastState,
      requestedLane,
      schedulePolicy,
      songsSinceScheduleJingle,
      songsBetweenScheduleJingles,
      nextMusicTrack: cleanTracks.find((candidate) => !isSmartZjJingleTrack(candidate)) || cleanTracks[0],
    });

    if (niaDropTrack) {
      scheduleJingleTracks.splice(0, scheduleJingleTracks.length, niaDropTrack);
    }
    const lastScheduleJingleAudioUrl = String(playerState.lastScheduleJingleAudioUrl || "");
    const recentScheduleJingleSet = new Set(recentScheduleJingleAudioUrls);

    const unseenScheduleJingles =
      scheduleJingleTracks.length > 1
        ? scheduleJingleTracks.filter((track) => !recentScheduleJingleSet.has(pickSafeUrl(track)))
        : scheduleJingleTracks;

    const notLastScheduleJingles =
      scheduleJingleTracks.length > 1
        ? scheduleJingleTracks.filter((track) => pickSafeUrl(track) !== lastScheduleJingleAudioUrl)
        : scheduleJingleTracks;

    cleanTracks = unseenScheduleJingles.length
      ? unseenScheduleJingles
      : notLastScheduleJingles.length
        ? notLastScheduleJingles
        : scheduleJingleTracks;
  }

  cleanTracks = shouldInsertScheduleJingle
    ? cleanTracks
    : dedupeSmartZjTracksBySongKey(cleanTracks);

  const selectionSourceTracks = shouldInsertScheduleJingle
    ? cleanTracks
    : filterSmartZjRecentDuplicateTitles(cleanTracks, playerState);

  const dedupedSelectionSourceTracks = shouldInsertScheduleJingle
    ? selectionSourceTracks
    : dedupeSmartZjTracksBySongKey(selectionSourceTracks);

  const playbackOrder = cleanText(((schedulePolicy || {}) as Record<string, any>).playbackOrder || "shuffled").toLowerCase();
  const selection = chooseSmartZjPlaybackOrderNext(
    dedupedSelectionSourceTracks,
    currentKey,
    playerState,
    playbackOrder,
    schedulePolicyAny.noRepeatTitleCount,
    schedulePolicyAny.noRepeatArtistCount
  );
  const nextIndex = selection.index;
  const track = selection.track;
  const selectionReason = shouldInsertScheduleJingle
    ? `${selection.reason}_SCHEDULE_JINGLE_INSERT`
    : `${selection.reason}_DUPLICATE_TITLE_LOCK`;
  const audioUrl = pickSafeUrl(track);
  const now = new Date().toISOString();

  const title = titleFromTrack(track);
  const artist = artistFromTrack(track);
  const genreLane = getSmartZjGenreLane(track);
  const selectedIsScheduleJingle = isSmartZjJingleTrack(track);
  const nextSongsSinceScheduleJingle = selectedIsScheduleJingle
    ? 0
    : Math.min(999, songsSinceScheduleJingle + 1);

  const broadcast = {
    ok: true,
    status: "SMARTDJ_BROADCASTING",
    source: "SMARTDJ",
    title,
    reason: selectionReason,
    selectionReason,
    playbackOrder,
    artist,
    genreLane,
    audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    startedAt: now,
    updatedAt: now,
    message: `SmartZJ Mini AutoNext ${genreLane} item ${nextIndex + 1} of ${cleanTracks.length}. Fresh-first: ${selectionReason}. Raw Azura blocked.`,
    sequence: {
      mode: "SMARTZJ_MINI_AUTONEXT",
      index: nextIndex,
      itemNumber: nextIndex + 1,
      total: cleanTracks.length,
      isLast: nextIndex + 1 === cleanTracks.length,
      selectionReason,
      requestedLane,
      laneLocked: Boolean(requestedLane),
      skippedMissingAudioCount,
      scheduleOverrideActive: Boolean(schedulePolicy?.scheduleOverrideActive),
      requestPriorityBlocked: Boolean(schedulePolicy?.requestPriorityBlocked),
      playJinglesBetweenTracks: Boolean(schedulePolicy?.playJinglesBetweenTracks),
      allowJingleOverlay: Boolean(schedulePolicy?.allowJingleOverlay),
      scheduleJingleInsert: Boolean(selectedIsScheduleJingle),
      scheduleModeActive,
      scheduleJingleTrackCount: scheduleJingleTracks.length,
    },
    schedulePolicy: schedulePolicy || null,
    playJinglesBetweenTracks: Boolean(schedulePolicy?.playJinglesBetweenTracks),
    allowJingleOverlay: Boolean(schedulePolicy?.allowJingleOverlay),
    scheduleJingleInsert: Boolean(selectedIsScheduleJingle),
    scheduleModeActive,
    scheduleJingleTrackCount: scheduleJingleTracks.length,
    songsBetweenScheduleJingles,
    songsSinceScheduleJingle,
    nextSongsSinceScheduleJingle,
    track: {
      ...track,
      genreLane,
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

  if (
    requestedLane &&
    !selectedIsScheduleJingle &&
    !trackMatchesSelectedScheduleLaneV2(
      {
        ...track,
        audioUrl,
        cleanAudioUrl: audioUrl,
        processedAudioUrl: audioUrl,
        streamUrl: audioUrl,
        listen_url: audioUrl,
        genreLane,
        title,
      },
      requestedLane
    )
  ) {
    writeSelectedLaneNoAudioStandbyV1(
      requestedLane,
      "FINAL_GATE_BLOCKED_WRONG_SELECTED_FOLDER_LANE",
      {
        blockedTitle: title,
        blockedArtist: artist,
        blockedGenreLane: genreLane,
        blockedAudioUrl: audioUrl,
        selectionReason,
      }
    );

    return NextResponse.json(
      {
        ok: false,
        route: "/api/listener/smartzj-clean-next",
        action: "SMARTZJ_SELECTED_LANE_FINAL_GATE_BLOCKED",
        status: "NO_PLAYABLE_FOR_SELECTED_FOLDER_LANE",
        requestedLane,
        blockedTitle: title,
        blockedArtist: artist,
        blockedGenreLane: genreLane,
        blockedAudioUrl: audioUrl,
        rawAzuraBlocked: true,
        oldFallbackBlocked: true,
        message: "Clean-next tried to select audio outside the active Schedule Editor lane. Current-broadcast cleared to safe no-audio standby.",
      },
      {
        status: 423,
        headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
      }
    );
  }

  writeJson(CURRENT_BROADCAST_FILE, broadcast);
  if (!selectedIsScheduleJingle) rememberSmartZjFreshFirstPlay(track, cleanTracks);

  writeJson(PLAYER_STATE_FILE, {
    ok: true,
    mode: "SMARTZJ_MINI_AUTONEXT",
    index: nextIndex,
    total: cleanTracks.length,
    currentTitle: title,
    currentArtist: artist,
    currentAudioUrl: audioUrl,
    selectedLane: requestedLane,
    laneLocked: Boolean(requestedLane),
    skippedMissingAudioCount,
    songsBetweenScheduleJingles,
    songsSinceScheduleJingle: nextSongsSinceScheduleJingle,
    lastScheduleJingleAudioUrl: selectedIsScheduleJingle
      ? audioUrl
      : String(playerState.lastScheduleJingleAudioUrl || ""),
    recentScheduleJingleAudioUrls: selectedIsScheduleJingle
      ? [
          audioUrl,
          ...recentScheduleJingleAudioUrls.filter((url: string) => url && url !== audioUrl),
        ].slice(0, Math.max(1, scheduleJingleTracks.length || 8))
      : recentScheduleJingleAudioUrls,
    updatedAt: now,
  });

  writeJson(SMARTZJ_JINGLE_COUNTER_FILE, {
    ok: true,
    songsBetweenScheduleJingles,
    songsSinceScheduleJingle: nextSongsSinceScheduleJingle,
    lastScheduleJingleAudioUrl: selectedIsScheduleJingle
      ? audioUrl
      : String(jingleCounterState.lastScheduleJingleAudioUrl || playerState.lastScheduleJingleAudioUrl || ""),
    updatedAt: now,
  });

  return NextResponse.json(
    {
      ok: true,
      route: "/api/listener/smartzj-clean-next",
      action: "SMARTZJ_MINI_AUTONEXT",
      cleanTrackCount: cleanTracks.length,
      allCleanTrackCount: allCleanTracks.length,
      laneTrackCount: laneCleanTracks.length,
      skippedMissingAudioCount,
      index: nextIndex,
      itemNumber: nextIndex + 1,
      isLast: nextIndex + 1 === cleanTracks.length,
      selectionReason,
      requestedLane,
      laneLocked: Boolean(requestedLane),
      title,
      artist,
      genreLane,
      audioUrl,
      streamUrl: audioUrl,
      listen_url: audioUrl,
      message: "SmartZJ Mini AutoNext handed off the next existing READY clean/bleeped track.",
      currentBroadcast: broadcast,
    },
    {
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
    }
  );
}

export async function GET(req: NextRequest) {
  return runMiniAutoNext(req);
}

export async function POST(req: NextRequest) {
  return runMiniAutoNext(req);
}
