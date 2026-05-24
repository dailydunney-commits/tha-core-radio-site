import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";
import { runSmartDjLocalCleanOne } from "@/lib/audio/smartdj-local-clean-one";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyTrack = Record<string, any>;
type SmartDjState = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const SMARTDJ_STATE_FILE = join(DATA_DIR, "smartdj-state.json");

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

function isRawAzuraOrSourceUrl(url: string) {
  const text = cleanText(url).toLowerCase();

  return (
    text.includes("/listen/") ||
    text.includes("radio.mp3") ||
    text.includes("/api/station/") ||
    text.includes("/files/download") ||
    text.includes("/api/smartdj/audio?src=")
  );
}

function pickSafeAudioUrl(track: AnyTrack) {
  return cleanText(
    track.safeAudioUrl ||
      track.radioSafeAudioUrl ||
      track.cleanAudioUrl ||
      track.bleepedAudioUrl ||
      track.processedAudioUrl ||
      ""
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

function getTrackId(track: AnyTrack) {
  return cleanText(
    track.trackId ||
      track.id ||
      track.filename ||
      track.fileName ||
      track.slug ||
      track.title
  );
}

function getStatusText(track: AnyTrack) {
  return cleanText(
    `${track.status ?? ""} ${track.statusText ?? ""} ${track.cleanStatus ?? ""} ${track.safetyStatus ?? ""} ${track.bleepJobStatus ?? ""} ${track.reason ?? ""} ${track.safetyNote ?? ""} ${track.action ?? ""}`
  ).toLowerCase();
}

function isCleanReady(track: AnyTrack) {
  const safeUrl = pickSafeAudioUrl(track);
  const statusText = getStatusText(track);

  return (
    Boolean(safeUrl && !isRawAzuraOrSourceUrl(safeUrl)) ||
    statusText.includes("processed_audio_ready") ||
    statusText.includes("processed audio ready") ||
    statusText.includes("clean/bleeped ready") ||
    statusText.includes("clean_or_bleeped") ||
    statusText.includes("allow_safe_copy_only")
  );
}

function needsAutoClean(track: AnyTrack) {
  if (isCleanReady(track)) return false;

  const statusText = getStatusText(track);
  const hasAnyAudio =
    cleanText(track.audioUrl) ||
    cleanText(track.rawUrl) ||
    cleanText(track.sourceAudioUrl) ||
    cleanText(track.originalAudioUrl) ||
    cleanText(track.url) ||
    cleanText(track.streamUrl);

  return (
    Boolean(hasAnyAudio) ||
    statusText.includes("held") ||
    statusText.includes("second scan") ||
    statusText.includes("smartdj_second_scan_recommended") ||
    statusText.includes("source_search") ||
    statusText.includes("needs clean") ||
    statusText.includes("needs bleep") ||
    statusText.includes("explicit") ||
    statusText.includes("dirty") ||
    statusText.includes("unverified")
  );
}

async function callSecondScan(origin: string) {
  try {
    const response = await fetch(`${origin}/api/radio/smartdj-second-scan`, {
      method: "POST",
      cache: "no-store",
    });

    const text = await response.text();

    try {
      return {
        ok: response.ok,
        httpStatus: response.status,
        result: JSON.parse(text),
      };
    } catch {
      return {
        ok: response.ok,
        httpStatus: response.status,
        result: text,
      };
    }
  } catch (error: any) {
    return {
      ok: false,
      httpStatus: 0,
      error: String(error?.message || error),
    };
  }
}

function summarizePlaylist() {
  const state = readJsonFile<SmartDjState>(SMARTDJ_STATE_FILE, {});
  const playlist = getPlaylistTracks(state);

  const ready = playlist.filter(isCleanReady);
  const remaining = playlist.filter((track) => !isCleanReady(track) && needsAutoClean(track));

  return {
    state,
    playlist,
    playlistCount: playlist.length,
    readyCount: ready.length,
    remainingCount: remaining.length,
    remaining,
  };
}

async function runSmartDjAutoClean(origin: string) {
  const startedAt = new Date().toISOString();

  let totalAttempted = 0;
  let totalProcessedReady = 0;
  let totalSecondScanRuns = 0;
  let totalFailed = 0;
  let totalSkippedReady = 0;

  const passes: any[] = [];
  const maxPasses = 3;

  for (let pass = 1; pass <= maxPasses; pass++) {
    const before = summarizePlaylist();

    if (!before.playlistCount) {
      passes.push({
        pass,
        status: "NO_PLAYLIST",
        message: "No SmartDJ playlist rows found.",
      });
      break;
    }

    totalSkippedReady += before.readyCount;

    if (!before.remainingCount) {
      passes.push({
        pass,
        status: "ALL_ROWS_CLEAN_READY",
        playlistCount: before.playlistCount,
        readyCount: before.readyCount,
        message: "All SmartDJ rows already have clean/bleeped safe audio attached.",
      });
      break;
    }

    const passResult: any = {
      pass,
      playlistCount: before.playlistCount,
      readyBefore: before.readyCount,
      remainingBefore: before.remainingCount,
      cleaned: 0,
      secondScanRecommended: 0,
      failed: 0,
      rows: [],
      secondScan: null,
    };

    for (const track of before.remaining) {
      const trackId = getTrackId(track);

      if (!trackId) {
        totalFailed++;
        passResult.failed++;
        passResult.rows.push({
          ok: false,
          status: "SMARTDJ_TRACK_ID_MISSING",
          title: track.title || "Untitled SmartDJ track",
        });
        continue;
      }

      totalAttempted++;

      try {
        const result: any = await runSmartDjLocalCleanOne({ trackId });

        passResult.rows.push({
          trackId,
          title: track.title || "",
          status: result?.status || "UNKNOWN",
          returnedToSmartDj: Boolean(result?.returnedToSmartDj),
          processedAudioUrl: result?.processedAudioUrl || result?.cleanAudioUrl || "",
          result,
        });

        if (result?.status === "PROCESSED_AUDIO_READY" && result?.returnedToSmartDj) {
          totalProcessedReady++;
          passResult.cleaned++;
          continue;
        }

        if (
          result?.status === "SMARTDJ_SECOND_SCAN_RECOMMENDED" ||
          result?.status === "LOCAL_TRANSCRIBED_NO_EXPLICIT_CUES_REVIEW_REQUIRED"
        ) {
          passResult.secondScanRecommended++;
          continue;
        }

        if (result?.status !== "PROCESSED_AUDIO_READY") {
          totalFailed++;
          passResult.failed++;
        }
      } catch (error: any) {
        totalFailed++;
        passResult.failed++;
        passResult.rows.push({
          ok: false,
          trackId,
          status: "SMARTDJ_AUTO_CLEAN_ROW_FAILED",
          message: String(error?.message || error),
        });
      }
    }

    const afterLocalClean = summarizePlaylist();
    const secondScanNeeded = afterLocalClean.remaining.some((track) => {
      const statusText = getStatusText(track);
      return (
        statusText.includes("second scan") ||
        statusText.includes("smartdj_second_scan_recommended") ||
        statusText.includes("local_transcribed_no_explicit_cues_review_required")
      );
    });

    if (secondScanNeeded) {
      totalSecondScanRuns++;
      passResult.secondScan = await callSecondScan(origin);
    }

    const after = summarizePlaylist();

    passResult.readyAfter = after.readyCount;
    passResult.remainingAfter = after.remainingCount;

    passes.push(passResult);

    if (!after.remainingCount) break;

    if (
      after.remainingCount >= before.remainingCount &&
      !secondScanNeeded &&
      passResult.cleaned === 0
    ) {
      break;
    }
  }

  const final = summarizePlaylist();

  const nextState: SmartDjState = {
    ...final.state,
    resultCount: final.playlistCount,
    resultLabel: `SmartDJ playlist loaded (${final.playlistCount})`,
    statusText:
      final.remainingCount === 0
        ? `SmartDJ auto clean loop complete. ${final.readyCount}/${final.playlistCount} row(s) are clean-ready.`
        : `SmartDJ auto clean loop ran. ${final.readyCount}/${final.playlistCount} row(s) clean-ready, ${final.remainingCount} still blocked or waiting.`,
    message:
      "SmartDJ auto clean loop ran while broadcast stayed live. Raw Azura audio remains blocked. Only clean/bleeped returned rows can preview, queue, or broadcast.",
    reply:
      final.remainingCount === 0
        ? "SmartDJ auto clean complete. All available rows are clean-ready."
        : "SmartDJ auto clean ran. Some rows still need source audio or another cleaning pass.",
    autoCleanLoop: {
      ok: final.remainingCount === 0,
      startedAt,
      finishedAt: new Date().toISOString(),
      playlistCount: final.playlistCount,
      readyCount: final.readyCount,
      remainingCount: final.remainingCount,
      totalAttempted,
      totalProcessedReady,
      totalSecondScanRuns,
      totalFailed,
    },
    timestamp: new Date().toISOString(),
  };

  writeJsonFile(SMARTDJ_STATE_FILE, nextState);

  return {
    ok: final.remainingCount === 0,
    route: "/api/radio/smartdj-auto-clean",
    action: "SMARTDJ_AUTO_CLEAN_LOOP_ROW_RETURN",
    broadcastPolicy: "DO_NOT_STOP_CURRENT_BROADCAST",
    rawAudioPolicy: "BLOCK_RAW_AZURA_USE_CLEAN_OR_BLEEPED_ONLY",
    playlistCount: final.playlistCount,
    readyCount: final.readyCount,
    remainingCount: final.remainingCount,
    totalAttempted,
    totalProcessedReady,
    totalSecondScanRuns,
    totalFailed,
    totalSkippedReady,
    startedAt,
    finishedAt: new Date().toISOString(),
    message:
      final.remainingCount === 0
        ? "SmartDJ auto clean loop finished. Clean/bleeped copies returned to SmartDJ rows."
        : "SmartDJ auto clean loop finished with some rows still blocked. Broadcast was not stopped.",
    passes,
  };
}

export async function GET(req: NextRequest) {
  const result = await runSmartDjAutoClean(req.nextUrl.origin);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 423,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function POST(req: NextRequest) {
  const result = await runSmartDjAutoClean(req.nextUrl.origin);

  return NextResponse.json(result, {
    status: result.ok ? 200 : 423,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
