import { NextResponse } from "next/server";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, ".data");
const SMARTDJ_STATE_FILE = join(DATA_DIR, "smartdj-state.json");
const LOCAL_WHISPER_DIR = join(DATA_DIR, "local-whisper");
const CLEAN_OUTPUT_DIR = join(ROOT, "public", "audio", "smartdj", "clean");

const SECOND_SCAN_WORDS = new Set([
  "fuck",
  "fucking",
  "fucked",
  "shit",
  "shits",
  "bitch",
  "bitches",
  "pussy",
  "punani",
  "batty",
  "bumbo",
  "bumboclaat",
  "bloodclaat",
  "rass",
  "raas",
  "cunt",
  "cock",
  "dick",
  "sex",
  "sexy",
  "screw",
  "screwing",
  "screwed",
  "bucker",
  "bukka",
]);

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (!existsSync(filePath)) return fallback;
    const raw = readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJsonFile(filePath: string, value: any) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function safeSegment(value: unknown) {
  return cleanText(value)
    .replace(/[^a-z0-9_\-.]+/gi, "_")
    .replace(/_+/g, "_")
    .slice(0, 160);
}

function normalizeWord(value: unknown) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function getTrackId(track: AnyRecord) {
  return cleanText(track.trackId || track.id || track.title);
}

function trackText(track: AnyRecord) {
  return cleanText(
    [
      track.status,
      track.statusText,
      track.cleanStatus,
      track.safetyStatus,
      track.bleepJobStatus,
      track.reason,
      track.safetyNote,
      track.action,
      track.message,
      track.decision,
    ]
      .filter(Boolean)
      .join(" ")
  ).toLowerCase();
}

function isSecondScanTrack(track: AnyRecord) {
  const text = trackText(track);

  return (
    text.includes("smartdj_second_scan_recommended") ||
    text.includes("second scan") ||
    text.includes("second_scan")
  );
}

function isCleanReady(track: AnyRecord) {
  const text = trackText(track);
  const url = cleanText(
    track.safeAudioUrl ||
      track.radioSafeAudioUrl ||
      track.cleanAudioUrl ||
      track.bleepedAudioUrl ||
      track.processedAudioUrl
  );

  return Boolean(url) || text.includes("processed_audio_ready");
}

function getPlaylistTracks(state: AnyRecord): AnyRecord[] {
  const direct = Array.isArray(state.playlist) ? state.playlist : [];
  const last = Array.isArray(state.lastPlaylist) ? state.lastPlaylist : [];
  const lastResultPlaylist = Array.isArray(state.lastResult?.playlist)
    ? state.lastResult.playlist
    : [];

  const source = direct.length ? direct : last.length ? last : lastResultPlaylist;
  return source.filter(Boolean);
}

function idsMatch(track: AnyRecord, wantedId: string) {
  const wanted = cleanText(wantedId).toLowerCase();

  return [
    track.id,
    track.trackId,
    track.bleepJobId,
    track.title,
  ]
    .filter(Boolean)
    .map((item) => cleanText(item).toLowerCase())
    .includes(wanted);
}

function updateMatchingTrack(value: any, wantedId: string, updater: (track: AnyRecord) => AnyRecord): any {
  if (Array.isArray(value)) {
    return value.map((item) => updateMatchingTrack(item, wantedId, updater));
  }

  if (value && typeof value === "object") {
    let next: AnyRecord = { ...value };

    if (idsMatch(next, wantedId)) {
      next = updater(next);
    }

    for (const key of Object.keys(next)) {
      next[key] = updateMatchingTrack(next[key], wantedId, updater);
    }

    return next;
  }

  return value;
}

function getTranscriptWords(parsed: any): AnyRecord[] {
  if (Array.isArray(parsed?.words)) return parsed.words;

  if (Array.isArray(parsed?.segments)) {
    return parsed.segments.flatMap((segment: any) =>
      Array.isArray(segment?.words) ? segment.words : []
    );
  }

  return [];
}

function findTranscriptFile(jobId: string, trackId: string) {
  if (!existsSync(LOCAL_WHISPER_DIR)) return "";

  const needles = [
    safeSegment(jobId).toLowerCase(),
    safeSegment(trackId).toLowerCase(),
  ].filter(Boolean);

  const files = readdirSync(LOCAL_WHISPER_DIR)
    .filter((name) => name.toLowerCase().endsWith(".json"))
    .map((name) => join(LOCAL_WHISPER_DIR, name))
    .filter((filePath) => {
      const lower = filePath.toLowerCase();
      return needles.some((needle) => lower.includes(needle));
    })
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  return files[0] || "";
}

function makeCues(words: AnyRecord[]) {
  return words
    .map((item) => {
      const word = normalizeWord(item.word ?? item.text ?? "");
      if (!word || !SECOND_SCAN_WORDS.has(word)) return null;

      const start = Number(item.start ?? item.startTime ?? item.start_sec);
      const rawEnd = Number(item.end ?? item.endTime ?? item.end_sec);

      if (!Number.isFinite(start)) return null;

      const end = Number.isFinite(rawEnd) && rawEnd > start ? rawEnd : start + 0.55;

      return {
        word,
        start: Math.max(0, start - 0.12),
        end: end + 0.18,
      };
    })
    .filter(Boolean) as Array<{ word: string; start: number; end: number }>;
}

function buildMuteFilter(cues: Array<{ start: number; end: number }>) {
  return cues
    .slice(0, 80)
    .map((cue) => {
      const start = cue.start.toFixed(3);
      const end = cue.end.toFixed(3);
      return `volume=enable='between(t,${start},${end})':volume=0`;
    })
    .join(",");
}

function createSecondScanCleanCopy(track: AnyRecord, cues: Array<{ word: string; start: number; end: number }>) {
  const trackId = getTrackId(track);
  const jobId = cleanText(track.bleepJobId || `smartdj-second-scan-${safeSegment(trackId)}`);
  const sourceFilePath = cleanText(track.sourceFilePath || track.localAudioPath || "");

  if (!sourceFilePath || !existsSync(sourceFilePath)) {
    return {
      ok: false,
      status: "SECOND_SCAN_SOURCE_FILE_MISSING",
      message: "SmartDJ second scan could not find the downloaded local source file. Raw audio remains blocked.",
    };
  }

  mkdirSync(CLEAN_OUTPUT_DIR, { recursive: true });

  const outputName = `${safeSegment(jobId)}-second-scan-bleeped.mp3`;
  const outputPath = join(CLEAN_OUTPUT_DIR, outputName);
  const publicUrl = `/audio/smartdj/clean/${outputName}`;
  const filter = buildMuteFilter(cues);

  if (!filter) {
    return {
      ok: false,
      status: "SMARTDJ_SECOND_SCAN_NO_RISKY_CUES_FOUND",
      message: "SmartDJ second scan found no risky cues. Row stays blocked/yellow.",
    };
  }

  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      sourceFilePath,
      "-af",
      filter,
      "-codec:a",
      "libmp3lame",
      "-q:a",
      "4",
      outputPath,
    ],
    { stdio: "pipe" }
  );

  return {
    ok: true,
    status: "PROCESSED_AUDIO_READY",
    processedAudioUrl: publicUrl,
    cleanAudioUrl: publicUrl,
    cueCount: cues.length,
    mutedWords: [...new Set(cues.map((cue) => cue.word))],
    message: "SmartDJ second scan created a cautious clean/bleeped copy and returned it to the row.",
  };
}

async function runSecondScan() {
  let state = readJsonFile<AnyRecord>(SMARTDJ_STATE_FILE, {});
  const playlist = getPlaylistTracks(state);

  let scanned = 0;
  let processedReady = 0;
  let stillSecondScan = 0;
  let failed = 0;

  const results: AnyRecord[] = [];

  for (const track of playlist) {
    if (isCleanReady(track)) {
      results.push({
        trackId: getTrackId(track),
        status: "ALREADY_CLEAN_READY",
      });
      continue;
    }

    if (!isSecondScanTrack(track)) continue;

    scanned++;

    const trackId = getTrackId(track);
    const jobId = cleanText(track.bleepJobId || `smartdj-local-clean-${safeSegment(trackId)}`);
    const transcriptFile = findTranscriptFile(jobId, trackId);

    if (!transcriptFile) {
      stillSecondScan++;
      results.push({
        ok: false,
        trackId,
        status: "SECOND_SCAN_TRANSCRIPT_NOT_FOUND",
        message: "SmartDJ second scan could not find transcript words yet. Row stays blocked/yellow.",
      });
      continue;
    }

    const parsed = readJsonFile<AnyRecord>(transcriptFile, {});
    const words = getTranscriptWords(parsed);
    const cues = makeCues(words);

    if (!cues.length) {
      stillSecondScan++;
      state = updateMatchingTrack(state, trackId, (item) => ({
        ...item,
        status: "SMARTDJ_SECOND_SCAN_RECOMMENDED",
        safetyStatus: "SMARTDJ_SECOND_SCAN_RECOMMENDED",
        cleanStatus: "SMARTDJ_SECOND_SCAN_RECOMMENDED",
        needsBleep: true,
        held: true,
        rawAudioBlocked: true,
        audioUrl: "",
        cleanAudioUrl: "",
        processedAudioUrl: "",
        safetyNote:
          "SmartDJ second scan found no risky cue to bleep. Row remains yellow/blocked until a stronger scan can verify it.",
      }));

      results.push({
        ok: false,
        trackId,
        status: "SMARTDJ_SECOND_SCAN_NO_RISKY_CUES_FOUND",
        cueCount: 0,
        message: "Second scan found no risky cues. Row remains blocked/yellow.",
      });
      continue;
    }

    try {
      const processed = createSecondScanCleanCopy(track, cues);

      if (processed.ok && processed.status === "PROCESSED_AUDIO_READY") {
        processedReady++;

        state = updateMatchingTrack(state, trackId, (item) => ({
          ...item,
          status: "READY",
          safetyStatus: "READY",
          cleanStatus: "PROCESSED_AUDIO_READY",
          bleepJobStatus: "PROCESSED_AUDIO_READY",
          needsBleep: false,
          held: false,
          rawAudioBlocked: true,
          audioUrl: processed.processedAudioUrl,
          cleanAudioUrl: processed.cleanAudioUrl,
          processedAudioUrl: processed.processedAudioUrl,
          safetyNote:
            "Returned from SmartDJ second-scan clean/bleep processor. Only processed audio is allowed.",
        }));
      } else {
        stillSecondScan++;
      }

      results.push({
        trackId,
        ...processed,
      });
    } catch (error: any) {
      failed++;
      results.push({
        ok: false,
        trackId,
        status: "SMARTDJ_SECOND_SCAN_FAILED",
        message: String(error?.message || error),
      });
    }
  }

  const finalPlaylist = getPlaylistTracks(state);

  state = {
    ...state,
    playlist: finalPlaylist,
    lastPlaylist: finalPlaylist,
    resultCount: finalPlaylist.length,
    resultLabel: `SmartDJ playlist loaded (${finalPlaylist.length})`,
    statusText: `SmartDJ second scan checked ${scanned} yellow row(s). ${processedReady} turned clean-ready, ${stillSecondScan} stayed yellow, ${failed} failed.`,
    message:
      "SmartDJ second-scan engine ran. Green rows are clean-ready. Yellow rows remain blocked. Raw audio remains blocked.",
    reply:
      "SmartDJ second scan complete. Clean/bleeped copies were returned where risky cues were found.",
    timestamp: new Date().toISOString(),
  };

  writeJsonFile(SMARTDJ_STATE_FILE, state);

  return {
    ok: true,
    route: "/api/radio/smartdj-second-scan",
    action: "SMARTDJ_SECOND_SCAN_ENGINE",
    playlistCount: playlist.length,
    scanned,
    processedReady,
    stillSecondScan,
    failed,
    message:
      "SmartDJ second scan finished. It only releases rows when it creates a processed clean/bleeped copy.",
    results,
    state,
  };
}

export async function GET() {
  const result = await runSecondScan();

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

export async function POST() {
  const result = await runSecondScan();

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}
