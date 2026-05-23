import fs from "fs";
import path from "path";
import { runLocalTranscribeAndProcess } from "@/lib/audio/local-transcribe-and-process";

type AnyRecord = Record<string, any>;

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".data");
const SMARTDJ_STATE_FILE = path.join(DATA_DIR, "smartdj-state.json");
const JOBS_FILE = path.join(DATA_DIR, "bleep-jobs.json");
const INPUT_DIR = path.join(DATA_DIR, "bleep-input", "smartdj-real");

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(INPUT_DIR, { recursive: true });
}

function safeJsonRead(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeJsonWrite(filePath: string, value: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function safeSegment(value: string) {
  return String(value || "track")
    .replace(/[^a-z0-9_\-.]+/gi, "_")
    .replace(/_+/g, "_")
    .slice(0, 140);
}

function getJobListShape(data: any): { list: AnyRecord[]; save: (list: AnyRecord[]) => any } {
  if (Array.isArray(data)) return { list: data, save: (list) => list };
  if (Array.isArray(data?.jobs)) return { list: data.jobs, save: (list) => ({ ...data, jobs: list }) };
  if (Array.isArray(data?.items)) return { list: data.items, save: (list) => ({ ...data, items: list }) };
  return { list: [], save: (list) => ({ jobs: list }) };
}

function looksLikeSmartDjTrack(value: any) {
  if (!value || typeof value !== "object") return false;

  const hasIdentity = Boolean(value.id || value.trackId || value.title);
  const hasAudio = Boolean(value.audioUrl || value.url || value.streamUrl || value.rawUrl);
  const isSmartDjish =
    String(value.source || "").toLowerCase().includes("azuracast") ||
    String(value.source || "").toLowerCase().includes("smartdj") ||
    String(value.action || "").toLowerCase().includes("playlist_track");

  return hasIdentity && hasAudio && isSmartDjish;
}

function collectTracks(value: any, tracks: AnyRecord[] = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectTracks(item, tracks));
    return tracks;
  }

  if (value && typeof value === "object") {
    if (looksLikeSmartDjTrack(value)) {
      tracks.push(value);
    }

    for (const key of Object.keys(value)) {
      collectTracks(value[key], tracks);
    }
  }

  return tracks;
}

function trackMatches(track: AnyRecord, wantedId: string) {
  const ids = [
    track.id,
    track.trackId,
    track.bleepJobId,
    track.title,
  ]
    .filter(Boolean)
    .map((item) => String(item));

  return ids.includes(wantedId);
}

function updateMatchingTrack(value: any, matcher: (track: AnyRecord) => boolean, updater: (track: AnyRecord) => AnyRecord): any {
  if (Array.isArray(value)) {
    return value.map((item) => updateMatchingTrack(item, matcher, updater));
  }

  if (value && typeof value === "object") {
    let next: AnyRecord = { ...value };

    if (looksLikeSmartDjTrack(next) && matcher(next)) {
      next = updater(next);
    }

    for (const key of Object.keys(next)) {
      next[key] = updateMatchingTrack(next[key], matcher, updater);
    }

    return next;
  }

  return value;
}

function pickAudioUrl(track: AnyRecord) {
  return String(
    track.rawUrl ||
    track.sourceDownloadUrl ||
    track.downloadUrl ||
    track.audioUrl ||
    track.url ||
    track.streamUrl ||
    ""
  ).trim();
}

function extensionFromContentType(contentType: string, fallbackUrl: string) {
  const lower = contentType.toLowerCase();

  if (lower.includes("wav")) return ".wav";
  if (lower.includes("mpeg") || lower.includes("mp3")) return ".mp3";
  if (lower.includes("mp4")) return ".mp4";
  if (lower.includes("m4a")) return ".m4a";
  if (lower.includes("ogg")) return ".ogg";
  if (lower.includes("webm")) return ".webm";

  const clean = fallbackUrl.split("?")[0].toLowerCase();
  if (clean.endsWith(".wav")) return ".wav";
  if (clean.endsWith(".m4a")) return ".m4a";
  if (clean.endsWith(".mp4")) return ".mp4";
  if (clean.endsWith(".ogg")) return ".ogg";
  if (clean.endsWith(".webm")) return ".webm";

  return ".mp3";
}

async function downloadSmartDjTrackAudio(sourceUrl: string, origin: string, jobId: string) {
  const fullUrl = sourceUrl.startsWith("/")
    ? new URL(sourceUrl, origin).toString()
    : sourceUrl;

  const azuraApiKey = String(
    process.env.AZURACAST_API_KEY ||
    process.env.AZURA_API_KEY ||
    ""
  ).trim();

  const headers: Record<string, string> = {
    "User-Agent": "ThaCoreSmartDJLocalClean/1.0",
    Accept: "audio/*,*/*",
  };

  if (azuraApiKey) {
    headers.Authorization = `Bearer ${azuraApiKey}`;
    headers["X-API-Key"] = azuraApiKey;
  }

  const response = await fetch(fullUrl, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const error: any = new Error(`SmartDJ source download failed with HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "audio/mpeg";
  const ext = extensionFromContentType(contentType, fullUrl);
  const outputPath = path.join(INPUT_DIR, `${safeSegment(jobId)}${ext}`);

  const bytes = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, bytes);

  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1024) {
    throw new Error("Downloaded SmartDJ audio file is missing or too small.");
  }

  return {
    sourceFilePath: outputPath,
    sourceDownloadUrl: fullUrl,
    sizeBytes: fs.statSync(outputPath).size,
  };
}

function upsertBleepJob(job: AnyRecord) {
  const jobsData = safeJsonRead(JOBS_FILE, { jobs: [] });
  const shape = getJobListShape(jobsData);

  const jobId = String(job.jobId || job.id || job.bleepJobId);
  const filtered = shape.list.filter((item) => {
    const ids = [item.id, item.jobId, item.bleepJobId].filter(Boolean).map(String);
    return !ids.includes(jobId);
  });

  filtered.push(job);
  safeJsonWrite(JOBS_FILE, shape.save(filtered));
}

export async function runSmartDjLocalCleanOne(body: AnyRecord) {
  ensureDirs();

  const origin = String(body.origin || "http://localhost:3000");
  const wantedId = body.trackId ? String(body.trackId).trim() : "";

  const state = safeJsonRead(SMARTDJ_STATE_FILE, null);

  if (!state) {
    return {
      ok: false,
      status: "SMARTDJ_STATE_NOT_FOUND",
      message: "No SmartDJ state file was found.",
    };
  }

  const tracks = collectTracks(state).filter((track) => {
    const id = String(track.id || track.trackId || "");
    return id !== "local-real-bleep-test-001";
  });

  const targetTrack = wantedId
    ? tracks.find((track) => trackMatches(track, wantedId))
    : tracks.find((track) => pickAudioUrl(track));

  if (!targetTrack) {
    return {
      ok: false,
      status: "SMARTDJ_TRACK_NOT_FOUND",
      message: "No matching real SmartDJ playlist track was found.",
      wantedId,
      foundCount: tracks.length,
    };
  }

  const originalTrackId = String(targetTrack.id || targetTrack.trackId || safeSegment(targetTrack.title || "smartdj-track"));
  const jobId = `smartdj-local-clean-${safeSegment(originalTrackId)}`;
  const originalAudioUrl = pickAudioUrl(targetTrack);

  if (!originalAudioUrl) {
    return {
      ok: false,
      status: "SMARTDJ_TRACK_HAS_NO_AUDIO",
      message: "The selected SmartDJ track has no audio URL.",
      originalTrackId,
      title: targetTrack.title || "",
    };
  }

  let downloadResult: AnyRecord;

  try {
    downloadResult = await downloadSmartDjTrackAudio(originalAudioUrl, origin, jobId);
  } catch (error: any) {
    const failedState = updateMatchingTrack(
      state,
      (track) => trackMatches(track, originalTrackId),
      (track) => ({
        ...track,
        status: "HELD",
        safetyStatus: "HELD",
        cleanStatus: "SMARTDJ_SOURCE_DOWNLOAD_FAILED",
        needsBleep: true,
        held: true,
        rawAudioBlocked: true,
        rawAudioUrl: originalAudioUrl,
        audioUrl: "",
        safetyNote: `Could not download SmartDJ source for local cleaning: ${String(error?.message || error)}`,
      })
    );

    safeJsonWrite(SMARTDJ_STATE_FILE, failedState);

    return {
      ok: false,
      status: "SMARTDJ_SOURCE_DOWNLOAD_FAILED",
      message: "Could not download the SmartDJ track source for local cleaning.",
      error: String(error?.message || error),
      originalAudioUrl,
    };
  }

  const processingState = updateMatchingTrack(
    state,
    (track) => trackMatches(track, originalTrackId),
    (track) => ({
      ...track,
      trackId: originalTrackId,
      bleepJobId: jobId,
      status: "HELD",
      safetyStatus: "PROCESSING",
      cleanStatus: "LOCAL_WHISPER_PROCESSING",
      needsBleep: true,
      held: true,
      rawAudioBlocked: true,
      rawAudioUrl: originalAudioUrl,
      sourceFilePath: downloadResult.sourceFilePath,
      audioUrl: "",
      safetyNote: "Local Whisper is creating a processed clean/bleeped copy. Raw audio blocked.",
    })
  );

  safeJsonWrite(SMARTDJ_STATE_FILE, processingState);

  upsertBleepJob({
    id: jobId,
    jobId,
    bleepJobId: jobId,
    trackId: originalTrackId,
    source: "SMARTDJ",
    title: targetTrack.title || originalTrackId,
    artist: targetTrack.artist || "SmartDJ",
    status: "BLEEP_JOB_CREATED",
    decision: "LOCAL_WHISPER_SMARTDJ_REAL_ROW_PROCESS",
    safe: false,
    needsBleep: true,
    sourceFilePath: downloadResult.sourceFilePath,
    localAudioPath: downloadResult.sourceFilePath,
    rawAudioUrl: originalAudioUrl,
    sourceDownloadUrl: downloadResult.sourceDownloadUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    message: "Real SmartDJ playlist row sent to Local Whisper clean/bleep processor.",
  });

  const processed: AnyRecord = await runLocalTranscribeAndProcess({
    jobId,
    sourceFilePath: downloadResult.sourceFilePath,
  });

  // SMARTDJ_SECOND_SCAN_STATE_V1
  // If SmartDJ transcribed but found no explicit cue, do not release raw audio.
  // Mark the row for SmartDJ second scan and flash detector light in owner panel.
  if (
    processed?.status === "SMARTDJ_SECOND_SCAN_RECOMMENDED" ||
    processed?.status === "LOCAL_TRANSCRIBED_NO_EXPLICIT_CUES_REVIEW_REQUIRED"
  ) {
    const secondScanState = updateMatchingTrack(
      safeJsonRead(SMARTDJ_STATE_FILE, state),
      (track) => trackMatches(track, originalTrackId),
      (track) => ({
        ...track,
        trackId: originalTrackId,
        bleepJobId: jobId,
        status: "SMARTDJ_SECOND_SCAN_RECOMMENDED",
        safetyStatus: "SMARTDJ_SECOND_SCAN_RECOMMENDED",
        cleanStatus: "SMARTDJ_SECOND_SCAN_RECOMMENDED",
        needsBleep: true,
        held: true,
        rawAudioBlocked: true,
        rawAudioUrl: originalAudioUrl,
        audioUrl: "",
        cleanAudioUrl: "",
        processedAudioUrl: "",
        safetyNote:
          "SmartDJ first scan found no explicit cue. SmartDJ second scan recommended before release. Raw audio blocked.",
      })
    );

    safeJsonWrite(SMARTDJ_STATE_FILE, secondScanState);
  }

  return {
    ...processed,
    smartDjRealRowTest: true,
    selectedTrackId: originalTrackId,
    selectedTitle: targetTrack.title || "",
    sourceSizeBytes: downloadResult.sizeBytes,
  };
}


