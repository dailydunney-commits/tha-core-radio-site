import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { runSmartDjLocalCleanOne } from "@/lib/audio/smartdj-local-clean-one";

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
  const startedAt = new Date().toISOString();

  const initialState = readJsonFile<SmartDjState>(SMARTDJ_STATE_FILE, {});
  const playlist = getPlaylistTracks(initialState);

  let alreadyReady = 0;
  let attempted = 0;
  let processedReady = 0;
  let secondScan = 0;
  let failed = 0;

  const results: any[] = [];

  for (const track of playlist) {
    const trackId = cleanText(track.trackId || track.id || track.title);

    if (!trackId) {
      failed++;
      results.push({
        ok: false,
        status: "SMARTDJ_TRACK_ID_MISSING",
        title: track.title || "Untitled SmartDJ track",
      });
      continue;
    }

    const safeUrl = pickSafeAudioUrl(track);
    const statusText = cleanText(
      `${track.status ?? ""} ${track.statusText ?? ""} ${track.cleanStatus ?? ""} ${track.safetyStatus ?? ""} ${track.bleepJobStatus ?? ""} ${track.reason ?? ""} ${track.safetyNote ?? ""}`
    ).toLowerCase();

    const isAlreadyClean =
      Boolean(safeUrl && !isRawAzuraOrSourceUrl(safeUrl)) ||
      statusText.includes("processed_audio_ready") ||
      statusText.includes("clean/bleeped ready");

    const isSecondScan =
      statusText.includes("smartdj_second_scan_recommended") ||
      statusText.includes("second scan");

    if (isAlreadyClean) {
      alreadyReady++;
      results.push({
        ok: true,
        trackId,
        status: "ALREADY_CLEAN_READY",
        message: "SmartDJ skipped this row because clean/bleeped audio is already attached.",
      });
      continue;
    }

    if (isSecondScan) {
      secondScan++;
      results.push({
        ok: true,
        trackId,
        status: "SMARTDJ_SECOND_SCAN_RECOMMENDED",
        message: "SmartDJ skipped repeat processing for this row. Second-scan lane is already active.",
      });
      continue;
    }

    if (!trackNeedsClean(track)) {
      alreadyReady++;
      results.push({
        ok: true,
        trackId,
        status: "NO_CLEAN_NEEDED",
        message: "SmartDJ did not find a cleaning requirement for this row.",
      });
      continue;
    }

    attempted++;

    try {
      const result: any = await runSmartDjLocalCleanOne({ trackId });

      results.push({
        trackId,
        ...result,
      });

      if (result?.status === "PROCESSED_AUDIO_READY" && result?.returnedToSmartDj) {
        processedReady++;
        continue;
      }

      if (result?.status === "SMARTDJ_SECOND_SCAN_RECOMMENDED") {
        secondScan++;
        continue;
      }

      if (result?.status === "LOCAL_TRANSCRIBED_NO_EXPLICIT_CUES_REVIEW_REQUIRED") {
        secondScan++;
        continue;
      }

      failed++;
    } catch (error: any) {
      failed++;
      results.push({
        ok: false,
        trackId,
        status: "SMARTDJ_AUTO_CLEAN_ROW_FAILED",
        message: String(error?.message || error),
      });
    }
  }

  const finalState = readJsonFile<SmartDjState>(SMARTDJ_STATE_FILE, {});
  const finalPlaylist = getPlaylistTracks(finalState);

  const nextState: SmartDjState = {
    ...finalState,
    resultCount: finalPlaylist.length,
    resultLabel: `SmartDJ playlist loaded (${finalPlaylist.length})`,
    statusText:
      attempted > 0
        ? `SmartDJ auto clean ran on ${attempted} track(s). ${processedReady} clean-ready, ${secondScan} second-scan, ${failed} failed.`
        : `SmartDJ auto clean checked ${playlist.length} track(s). ${alreadyReady} already clean-ready, ${secondScan} second-scan.`,
    message:
      "SmartDJ auto clean + return ran as the worker. Raw audio remains blocked. Only clean/bleeped returned rows can queue or broadcast.",
    reply:
      "SmartDJ auto clean + return complete. Green rows are clean-ready. Yellow flashing rows stay in SmartDJ second-scan lane.",
    timestamp: new Date().toISOString(),
  };

  writeJsonFile(SMARTDJ_STATE_FILE, nextState);

  return {
    ok: true,
    route: "/api/radio/smartdj-auto-clean",
    action: "SMARTDJ_AUTO_CLEAN_RETURN_WORKER",
    playlistCount: playlist.length,
    attempted,
    alreadyReady,
    processedReady,
    secondScan,
    failed,
    startedAt,
    finishedAt: new Date().toISOString(),
    message:
      "SmartDJ auto clean + return finished. Clean-ready rows returned to playlist. Second-scan rows remain blocked with flashing detector light.",
    results,
    state: nextState,
  };
}export async function GET() {
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


