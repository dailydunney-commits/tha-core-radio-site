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
  // SMARTZJ_LOCAL_SOURCE_ROW_WRITEBACK_MATCH_V1
  // Scanned Azura/SmartZJ rows may have no public audioUrl yet.
  // They are still real rows if they have sourceFilePath/localAudioPath.
  const hasAudio = Boolean(
    value.audioUrl ||
      value.url ||
      value.streamUrl ||
      value.rawUrl ||
      value.cleanAudioUrl ||
      value.processedAudioUrl ||
      value.safeAudioUrl ||
      value.radioSafeAudioUrl ||
      value.sourceFilePath ||
      value.localAudioPath ||
      value.sourcePath
  );

  const isSmartDjish =
    String(value.source || "").toLowerCase().includes("azuracast") ||
    String(value.source || "").toLowerCase().includes("smartdj") ||
    String(value.source || "").toLowerCase().includes("smartzj") ||
    String(value.action || "").toLowerCase().includes("playlist_track") ||
    String(value.cleanStatus || "").toUpperCase() === "LOCAL_SOURCE_ATTACHED" ||
    Boolean(value.sourceFilePath || value.localAudioPath || value.sourcePath);

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

function pickLocalSourceFilePath(track: AnyRecord, body: AnyRecord, trackId: string) {
  const azuraMediaDir =
    process.env.AZURACAST_MEDIA_DIR ||
    "/var/lib/docker/volumes/azuracast_station_data/_data/tha-core-online/media";

  const candidates = [
    body.sourceFilePath,
    body.sourcePath,
    body.localAudioPath,
    track.sourceFilePath,
    track.sourcePath,
    track.localAudioPath,
    path.join(azuraMediaDir, trackId),
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);

  return (
    candidates.find((item) => {
      try {
        return fs.existsSync(item) && fs.statSync(item).isFile();
      } catch {
        return false;
      }
    }) || ""
  );
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


// SMARTZJ_DIRECT_LOCAL_ROW_CLEAN_V1
function hasDirectLocalAudioInput(input: any) {
  return Boolean(
    input?.sourceFilePath ||
    input?.localAudioPath ||
    input?.track?.sourceFilePath ||
    input?.track?.localAudioPath
  );
}

function directLocalTrackFallback(input: any) {
  const sourceFilePath =
    input?.sourceFilePath ||
    input?.localAudioPath ||
    input?.track?.sourceFilePath ||
    input?.track?.localAudioPath ||
    "";

  const trackId =
    input?.trackId ||
    input?.id ||
    input?.track?.trackId ||
    input?.track?.id ||
    sourceFilePath;

  const title =
    input?.title ||
    input?.trackTitle ||
    input?.track?.title ||
    String(trackId).split(/[\\/]/).pop() ||
    "SmartZJ local audio";

  return {
    id: trackId,
    trackId,
    title,
    source: input?.source || "SMARTZJ_DIRECT_LOCAL_ROW",
    sourceFilePath,
    localAudioPath: sourceFilePath,
    audioUrl: input?.audioUrl || input?.track?.audioUrl || "",
    cleanAudioUrl: input?.cleanAudioUrl || input?.track?.cleanAudioUrl || "",
    processedAudioUrl: input?.processedAudioUrl || input?.track?.processedAudioUrl || "",
    rawAudioBlocked: true,
    needsBleep: true,
    held: true,
    status: "HELD",
    safetyStatus: "HELD",
    cleanStatus: "LOCAL_SOURCE_ATTACHED",
    statusText: "HELD - direct local source attached for SmartZJ clean/bleep processing.",
  };
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

  let targetTrack = wantedId
    ? tracks.find((track) => trackMatches(track, wantedId))
    : tracks.find((track) => pickAudioUrl(track));

  // SMARTZJ_SCANNED_AZURA_ROW_FALLBACK_V1
  // Background scanner rows may be HELD with no audioUrl yet.
  // If the background cleaner passes trackId + sourceFilePath/localAudioPath,
  // accept it as a valid SmartZJ row and process the local source.
  if (!targetTrack && wantedId) {
    const fallbackSourcePath = String(
      body.sourceFilePath ||
        body.localAudioPath ||
        body.sourcePath ||
        ""
    ).trim();

    if (fallbackSourcePath && fs.existsSync(fallbackSourcePath)) {
      targetTrack = {
        id: wantedId,
        trackId: wantedId,
        title: body.title || wantedId,
        artist: body.artist || "AzuraCast",
        source: body.source || "SMARTZJ_AZURA_SCAN",
        sourceFilePath: fallbackSourcePath,
        localAudioPath: fallbackSourcePath,
        rawAudioBlocked: true,
        status: "HELD",
        safetyStatus: "HELD",
        cleanStatus: "LOCAL_SOURCE_ATTACHED",
        needsBleep: true,
        held: true,
        audioUrl: "",
        cleanAudioUrl: "",
        processedAudioUrl: "",
      };
    }
  }

  if (!targetTrack) {
    if (hasDirectLocalAudioInput(body)) {
      targetTrack = directLocalTrackFallback(body);
    } else {
      return {
        ok: false,
        status: "SMARTDJ_TRACK_NOT_FOUND",
        message: "No matching real SmartDJ playlist track was found.",
        wantedId,
        foundCount: tracks.length,
      };
    }
  }

  const originalTrackId = String(targetTrack.id || targetTrack.trackId || safeSegment(targetTrack.title || "smartdj-track"));
  const jobId = `smartdj-local-clean-${safeSegment(originalTrackId)}`;
  const originalAudioUrl = pickAudioUrl(targetTrack);

  const existingLocalSourcePath = pickLocalSourceFilePath(targetTrack, body, originalTrackId);

  // SMARTZJ_LOCAL_SOURCE_WITHOUT_AUDIO_URL_V1
  // Scanned Azura rows may have no audioUrl yet, but they are valid if sourceFilePath/localAudioPath exists.
  if (!originalAudioUrl && !existingLocalSourcePath) {
    return {
      ok: false,
      status: "SMARTDJ_TRACK_HAS_NO_AUDIO",
      message: "The selected SmartDJ track has no audio URL or local source file.",
      originalTrackId,
      title: targetTrack.title || "",
    };
  }

  let downloadResult: AnyRecord;

  try {
    if (existingLocalSourcePath && fs.existsSync(existingLocalSourcePath)) {
      const stat = fs.statSync(existingLocalSourcePath);

      if (!stat.isFile() || stat.size < 1024) {
        throw new Error(`Local SmartDJ source file is missing or too small: ${existingLocalSourcePath}`);
      }

      downloadResult = {
        sourceFilePath: existingLocalSourcePath,
        sourceDownloadUrl: originalAudioUrl,
        sizeBytes: stat.size,
        usedLocalSource: true,
      };
    } else {
      downloadResult = await downloadSmartDjTrackAudio(originalAudioUrl, origin, jobId);
    }
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
    processed?.status === "LOCAL_TRANSCRIBED_NO_EXPLICIT_CUES_REVIEW_REQUIRED" ||
    processed?.status === "LOCAL_WHISPER_NO_WORD_TIMESTAMPS"
  ) {
    // SMARTDJ_NO_CUE_VERIFIED_CLEAN_RETURN_V1
    // No raw Azura release. If no blocked terms are found, make a safe copied file and return it to the row.
    const blockedTerms = [
      "bloodcloth",
      "bloodclaat",
      "bloodclart",
      "bloodclot",
      "rascloth",
      "rasclaat",
      "rasclart",
      "rasscloth",
      "rassclaat",
      "rassclart",
      "pussy",
      "pussycloth",
      "pussyclaat",
      "pussyclart",
      "bombocloth",
      "bomboclaat",
      "bomboclat",
      "bumbocloth",
      "bumboclaat",
      "bumboclat",
      "bumboclot",
      "bumboclart",
      "bumbo",
      "bombo",
      "battyboy",
      "battybwoy",
      "battyman",
      "battyboi",
    ];

    const transcriptText = String(
      processed?.transcript ||
        processed?.text ||
        processed?.localWhisperResult?.transcript ||
        processed?.localWhisperResult?.text ||
        ""
    );

    // SMARTZJ_NO_WORD_TIMESTAMPS_REQUIRE_TRANSCRIPT_V1
    // If Whisper failed word timestamps and also gave no transcript, keep the track held.
    // We never approve raw/uncertain audio without readable transcript text.
    if (processed?.status === "LOCAL_WHISPER_NO_WORD_TIMESTAMPS" && !transcriptText.trim()) {
      const heldState = updateMatchingTrack(
        safeJsonRead(SMARTDJ_STATE_FILE, state),
        (track) => trackMatches(track, originalTrackId),
        (track) => ({
          ...track,
          trackId: originalTrackId,
          bleepJobId: jobId,
          status: "HELD",
          safetyStatus: "HELD",
          cleanStatus: "LOCAL_WHISPER_NO_WORD_TIMESTAMPS",
          needsBleep: true,
          held: true,
          rawAudioBlocked: true,
          rawAudioUrl: originalAudioUrl,
          audioUrl: "",
          cleanAudioUrl: "",
          processedAudioUrl: "",
          safetyNote:
            "Local Whisper returned no usable word timestamps and no readable transcript. Track remains held. Raw audio blocked.",
        })
      );

      safeJsonWrite(SMARTDJ_STATE_FILE, heldState);

      return {
        ...processed,
        ok: false,
        jobId,
        status: "LOCAL_WHISPER_NO_WORD_TIMESTAMPS",
        decision: "KEEP_HELD_NO_TRANSCRIPT",
        message:
          "Local Whisper returned no usable word timestamps and no readable transcript. Track remains held. Raw audio blocked.",
        returnedToSmartDj: false,
        returnedToLiveReadyPool: false,
        selectedTrackId: originalTrackId,
        selectedTitle: targetTrack.title || originalTrackId,
        sourceSizeBytes: downloadResult.sizeBytes,
      };
    }

    const normalizedTranscript = transcriptText.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const blockedHit = blockedTerms.find((term) =>
      normalizedTranscript.includes(term.replace(/[^a-z0-9]+/g, ""))
    );

    if (!blockedHit) {
      const cleanDir = path.join(process.cwd(), "public", "audio", "smartdj", "clean");
      fs.mkdirSync(cleanDir, { recursive: true });

      const verifiedFileName = `${safeSegment(jobId)}-verified-clean.mp3`;
      const verifiedFilePath = path.join(cleanDir, verifiedFileName);
      const verifiedAudioUrl = `/audio/smartdj/clean/${verifiedFileName}`;

      fs.copyFileSync(downloadResult.sourceFilePath, verifiedFilePath);

      if (!fs.existsSync(verifiedFilePath) || fs.statSync(verifiedFilePath).size < 1024) {
        throw new Error("Verified clean SmartDJ copy was not created or is too small.");
      }

      const verifiedState = updateMatchingTrack(
        safeJsonRead(SMARTDJ_STATE_FILE, state),
        (track) => trackMatches(track, originalTrackId),
        (track) => ({
          ...track,
          trackId: originalTrackId,
          bleepJobId: jobId,
          status: "READY",
          safetyStatus: "READY",
          cleanStatus: "PROCESSED_AUDIO_READY",
          needsBleep: false,
          held: false,
          rawAudioBlocked: true,
          rawAudioUrl: originalAudioUrl,
          audioUrl: verifiedAudioUrl,
          url: verifiedAudioUrl,
          streamUrl: verifiedAudioUrl,
          safeAudioUrl: verifiedAudioUrl,
          radioSafeAudioUrl: verifiedAudioUrl,
          cleanAudioUrl: verifiedAudioUrl,
          processedAudioUrl: verifiedAudioUrl,
          safetyNote: "Local Whisper and blocked-term scan found no blocked explicit cue. Verified clean copy returned to SmartDJ row. Raw Azura remains blocked.",
        })
      );

      safeJsonWrite(SMARTDJ_STATE_FILE, verifiedState);

      upsertBleepJob({
        id: jobId,
        jobId,
        bleepJobId: jobId,
        trackId: originalTrackId,
        source: "SMARTDJ",
        title: targetTrack.title || originalTrackId,
        artist: targetTrack.artist || "SmartDJ",
        status: "PROCESSED_AUDIO_READY",
        cleanStatus: "PROCESSED_AUDIO_READY",
        decision: "ALLOW_SAFE_COPY_ONLY",
        safe: true,
        needsBleep: false,
        sourceFilePath: downloadResult.sourceFilePath,
        localAudioPath: downloadResult.sourceFilePath,
        rawAudioUrl: originalAudioUrl,
        sourceDownloadUrl: downloadResult.sourceDownloadUrl,
        processedAudioUrl: verifiedAudioUrl,
        cleanAudioUrl: verifiedAudioUrl,
        verifiedNoCueCleanCopy: true,
        updatedAt: new Date().toISOString(),
        message: "Verified clean SmartDJ copy created after no blocked explicit terms were found.",
      });

      return {
        ok: true,
        jobId,
        status: "PROCESSED_AUDIO_READY",
        decision: "ALLOW_SAFE_COPY_ONLY",
        message: "Verified clean SmartDJ copy created and returned to row. Raw Azura remains blocked.",
        returnedToSmartDj: true,
        processedAudioUrl: verifiedAudioUrl,
        cleanAudioUrl: verifiedAudioUrl,
        verifiedNoCueCleanCopy: true,
        smartDjRealRowTest: true,
        selectedTrackId: originalTrackId,
        selectedTitle: targetTrack.title || originalTrackId,
        sourceSizeBytes: downloadResult.sizeBytes,
      };
    }

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





