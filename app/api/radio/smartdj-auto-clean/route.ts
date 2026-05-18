import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyTrack = Record<string, any>;
type AnyJob = Record<string, any>;
type SmartDjState = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const SMARTDJ_STATE_FILE = join(DATA_DIR, "smartdj-state.json");
const BLEEP_JOBS_FILE = join(DATA_DIR, "bleep-jobs.json");

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!existsSync(filePath)) return fallback;
    const parsed = JSON.parse(readFileSync(filePath, "utf8"));
    return parsed ?? fallback;
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

function normalizeId(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getTrackKey(track: AnyTrack) {
  return (
    normalizeId(track.id) ||
    normalizeId(`${track.artist ?? ""}-${track.title ?? ""}`) ||
    normalizeId(track.title) ||
    `track-${Date.now()}`
  );
}

function pickSafeAudioUrl(item: AnyTrack) {
  return cleanText(
    item.safeAudioUrl ||
      item.radioSafeAudioUrl ||
      item.cleanAudioUrl ||
      item.bleepedAudioUrl ||
      item.processedAudioUrl ||
      ""
  );
}

function pickOriginalAudioUrl(item: AnyTrack) {
  return cleanText(
    item.rawUrl ||
      item.sourceAudioUrl ||
      item.originalAudioUrl ||
      item.audioUrl ||
      item.url ||
      item.streamUrl ||
      ""
  );
}

function isRawAzuraOrSourceUrl(url: string) {
  const text = url.toLowerCase();

  return (
    text.includes("/listen/") ||
    text.includes("radio.mp3") ||
    text.includes("/api/station/") ||
    text.includes("/files/download") ||
    text.includes("/api/smartdj/audio?src=")
  );
}

function trackNeedsClean(track: AnyTrack) {
  const safeUrl = pickSafeAudioUrl(track);
  const text = cleanText(
    `${track.action ?? ""} ${track.statusText ?? ""} ${track.reason ?? ""} ${track.source ?? ""}`
  ).toLowerCase();

  if (safeUrl && !isRawAzuraOrSourceUrl(safeUrl)) return false;

  return (
    !safeUrl ||
    text.includes("held") ||
    text.includes("source_search") ||
    text.includes("source audio found") ||
    text.includes("needs clean") ||
    text.includes("needs bleep") ||
    text.includes("explicit") ||
    text.includes("dirty")
  );
}

function getPlaylistTracks(state: SmartDjState): AnyTrack[] {
  const direct = Array.isArray(state.playlist) ? state.playlist : [];
  const last = Array.isArray(state.lastPlaylist) ? state.lastPlaylist : [];
  const lastResultPlaylist = Array.isArray(state.lastResult?.playlist)
    ? state.lastResult.playlist
    : [];

  const source = direct.length ? direct : last.length ? last : lastResultPlaylist;
  return source.filter(Boolean);
}

function findExistingJob(jobs: AnyJob[], track: AnyTrack) {
  const key = getTrackKey(track);
  const title = cleanText(track.title).toLowerCase();

  return (
    jobs.find((job) => {
      const jobTrack = job.track ?? {};
      const jobKey = getTrackKey(jobTrack);
      const jobTitle = cleanText(jobTrack.title || job.title).toLowerCase();

      return (
        key === jobKey ||
        (title && jobTitle && title === jobTitle)
      );
    }) || null
  );
}

function makeBleepJob(track: AnyTrack): AnyJob {
  const now = new Date().toISOString();
  const key = getTrackKey(track);
  const originalUrl = pickOriginalAudioUrl(track);

  return {
    id: `smartdj-clean-${key}`,
    createdAt: now,
    updatedAt: now,
    status: originalUrl ? "READY_FOR_BLEEP_PROCESSING" : "BLEEP_JOB_CREATED",
    source: "SMARTDJ",
    mode: "auto_clean_return",
    track: {
      ...track,
      rawUrl: originalUrl,
      sourceAudioUrl: originalUrl,
      originalAudioUrl: originalUrl,
      statusText: "HELD - waiting for clean/bleep copy",
      action: "held_for_clean_bleep",
      audioUrl: "",
      url: "",
      streamUrl: "",
    },
    explicitWords: [],
    cleanWords: [],
    message: originalUrl
      ? "SMARTDJ AUTO CLEAN - original audio attached. Processor must create clean/bleeped copy before return."
      : "SMARTDJ AUTO CLEAN - direct audio URL missing. Track remains HELD until source audio is found.",
  };
}

function updateJobForTrack(job: AnyJob, track: AnyTrack): AnyJob {
  const originalUrl = pickOriginalAudioUrl(track);
  const now = new Date().toISOString();

  if (!originalUrl) {
    return {
      ...job,
      updatedAt: now,
      status: job.status || "BLEEP_JOB_CREATED",
      message:
        job.message ||
        "SMARTDJ AUTO CLEAN - direct audio URL missing. Track remains HELD until source audio is found.",
    };
  }

  return {
    ...job,
    updatedAt: now,
    status:
      pickSafeAudioUrl(job) || pickSafeAudioUrl(job.track ?? {})
        ? "PROCESSED_AUDIO_READY"
        : "READY_FOR_BLEEP_PROCESSING",
    source: "SMARTDJ",
    mode: "auto_clean_return",
    track: {
      ...(job.track ?? {}),
      ...track,
      rawUrl: originalUrl,
      sourceAudioUrl: originalUrl,
      originalAudioUrl: originalUrl,
      statusText: "HELD - waiting for clean/bleep copy",
      action: "held_for_clean_bleep",
      audioUrl: "",
      url: "",
      streamUrl: "",
    },
    message:
      job.message ||
      "SMARTDJ AUTO CLEAN - original audio attached. Processor must create clean/bleeped copy before return.",
  };
}

function syncReadyJobToTrack(track: AnyTrack, jobs: AnyJob[]) {
  const matchingJob = findExistingJob(jobs, track);
  if (!matchingJob) return track;

  const safeUrl =
    pickSafeAudioUrl(matchingJob) ||
    pickSafeAudioUrl(matchingJob.track ?? {});

  if (!safeUrl || isRawAzuraOrSourceUrl(safeUrl)) return track;

  return {
    ...track,
    audioUrl: safeUrl,
    url: safeUrl,
    streamUrl: safeUrl,
    processedAudioUrl: safeUrl,
    bleepedAudioUrl: safeUrl,
    cleanAudioUrl: safeUrl,
    radioSafeAudioUrl: safeUrl,
    safeAudioUrl: safeUrl,
    statusText: "CLEAN/BLEEPED READY",
    action: "processed_audio_ready",
    reason: "PROCESSED AUDIO READY - clean/bleeped copy returned to SmartDJ playlist row.",
  };
}

async function runSmartDjAutoClean() {
  const state = readJsonFile<SmartDjState>(SMARTDJ_STATE_FILE, {});
  const existingJobs = readJsonFile<AnyJob[]>(BLEEP_JOBS_FILE, []);

  const playlist = getPlaylistTracks(state);
  let jobs = Array.isArray(existingJobs) ? [...existingJobs] : [];

  let jobsCreated = 0;
  let jobsUpdated = 0;
  let returnedReady = 0;
  let heldCount = 0;

  for (const track of playlist) {
    const safeTrack = syncReadyJobToTrack(track, jobs);
    if (safeTrack !== track) {
      returnedReady++;
      continue;
    }

    if (!trackNeedsClean(track)) continue;

    heldCount++;

    const existingJob = findExistingJob(jobs, track);

    if (existingJob) {
      jobs = jobs.map((job) =>
        job.id === existingJob.id ? updateJobForTrack(job, track) : job
      );
      jobsUpdated++;
    } else {
      jobs.unshift(makeBleepJob(track));
      jobsCreated++;
    }
  }

  jobs = jobs.slice(0, 100);
  writeJsonFile(BLEEP_JOBS_FILE, jobs);

  const syncedPlaylist = playlist.map((track) => syncReadyJobToTrack(track, jobs));

  const nextState: SmartDjState = {
    ...state,
    playlist: syncedPlaylist,
    lastPlaylist: syncedPlaylist,
    resultCount: syncedPlaylist.length,
    resultLabel: `SmartDJ playlist loaded (${syncedPlaylist.length})`,
    statusText:
      heldCount > 0
        ? `SmartDJ auto clean started. ${heldCount} track(s) held for clean/bleep processing.`
        : "SmartDJ auto clean complete. No unsafe playlist tracks found.",
    message:
      returnedReady > 0
        ? `SmartDJ returned ${returnedReady} clean/bleeped track(s) to the playlist.`
        : "SmartDJ scanned playlist and sent unsafe/unverified tracks to clean/bleep jobs.",
    reply:
      "SmartDJ auto clean is active. HELD tracks stay blocked until clean/bleeped audio is ready.",
    timestamp: new Date().toISOString(),
  };

  writeJsonFile(SMARTDJ_STATE_FILE, nextState);

  return {
    ok: true,
    route: "/api/radio/smartdj-auto-clean",
    action: "SMARTDJ_AUTO_CLEAN_RETURN",
    playlistCount: playlist.length,
    heldCount,
    jobsCreated,
    jobsUpdated,
    returnedReady,
    bleepJobCount: jobs.length,
    message:
      returnedReady > 0
        ? `SmartDJ returned ${returnedReady} clean/bleeped track(s) and processed ${heldCount} held track(s).`
        : `SmartDJ processed ${playlist.length} playlist track(s). ${heldCount} held for clean/bleep processing.`,
    state: nextState,
  };
}

export async function GET() {
  const result = await runSmartDjAutoClean();
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function POST() {
  const result = await runSmartDjAutoClean();
  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
