import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnyRecord = Record<string, any>;

const DATA_DIR = path.join(process.cwd(), ".data");
const WATCHDOG_STATE_FILE = path.join(DATA_DIR, "smartzj-watchdog-state.json");
const PUBLIC_DIR = path.join(process.cwd(), "public");

function internalBaseUrl() {
  return String(process.env.SMARTZJ_INTERNAL_BASE_URL || "http://127.0.0.1:3101").replace(/\/+$/, "");
}

function writeJson(filePath: string, data: AnyRecord) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

async function getJson(route: string) {
  const res = await fetch(`${internalBaseUrl()}${route}`, {
    method: "GET",
    cache: "no-store",
    headers: { "Cache-Control": "no-store" },
  });

  const text = await res.text();

  try {
    return {
      httpStatus: res.status,
      ...JSON.parse(text),
    };
  } catch {
    return {
      ok: false,
      httpStatus: res.status,
      raw: text,
    };
  }
}

async function postJson(route: string, body: AnyRecord = {}) {
  const res = await fetch(`${internalBaseUrl()}${route}`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();

  try {
    return {
      httpStatus: res.status,
      ...JSON.parse(text),
    };
  } catch {
    return {
      ok: false,
      httpStatus: res.status,
      raw: text,
    };
  }
}

function localAudioPathFromUrl(audioUrl: string) {
  if (!audioUrl || !audioUrl.startsWith("/audio/")) return "";
  const cleanUrl = decodeURIComponent(audioUrl.split("?")[0] || "");
  return path.join(PUBLIC_DIR, cleanUrl.replace(/^\/+/, ""));
}

function getDurationSeconds(filePath: string) {
  try {
    if (!filePath || !fs.existsSync(filePath)) return null;

    const output = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        filePath,
      ],
      {
        encoding: "utf8",
        timeout: 10000,
      }
    ).trim();

    const seconds = Number(output);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
}

function ageSecondsFrom(value: unknown) {
  const ms = new Date(String(value || "")).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor((Date.now() - ms) / 1000));
}

async function runWatchdog(request: NextRequest) {
  const url = new URL(request.url);

  const maxTrackSeconds = Math.max(
    120,
    Math.min(Number(url.searchParams.get("maxTrackSeconds") || process.env.SMARTZJ_WATCHDOG_MAX_TRACK_SECONDS || 540), 1800)
  );

  const graceSeconds = Math.max(
    15,
    Math.min(Number(url.searchParams.get("graceSeconds") || process.env.SMARTZJ_WATCHDOG_GRACE_SECONDS || 45), 300)
  );

  const minAgeSeconds = Math.max(
    30,
    Math.min(Number(url.searchParams.get("minAgeSeconds") || process.env.SMARTZJ_WATCHDOG_MIN_AGE_SECONDS || 90), 600)
  );

  const nowPlaying = await getJson("/api/listener/now-playing");

  const currentBroadcast = nowPlaying.currentBroadcast || {};
  const audioUrl = String(
    nowPlaying.audioUrl ||
      nowPlaying.streamUrl ||
      nowPlaying.listen_url ||
      currentBroadcast.audioUrl ||
      currentBroadcast.streamUrl ||
      currentBroadcast.listen_url ||
      ""
  );

  const startedAt =
    currentBroadcast.startedAt ||
    currentBroadcast.updatedAt ||
    nowPlaying.live?.broadcast_start ||
    "";

  const ageSeconds = ageSecondsFrom(startedAt);
  const localFile = localAudioPathFromUrl(audioUrl);
  const fileExists = Boolean(localFile && fs.existsSync(localFile));
  const fileSize = fileExists ? fs.statSync(localFile).size : 0;
  const durationSeconds = fileExists ? getDurationSeconds(localFile) : null;

  const reasons: string[] = [];

  if (!nowPlaying.ok) reasons.push("NOW_PLAYING_NOT_OK");
  if (nowPlaying.mode !== "CURRENT_BROADCAST") reasons.push("NOT_CURRENT_BROADCAST");
  if (nowPlaying.safety !== "CLEAN_OR_BLEEPED_CURRENT_BROADCAST") reasons.push("NOT_CLEAN_BLEEPED_BROADCAST");
  if (!audioUrl) reasons.push("NO_AUDIO_URL");
  if (audioUrl && !audioUrl.includes("/audio/smartdj/clean/")) reasons.push("AUDIO_URL_NOT_CLEAN_FOLDER");
  if (!fileExists) reasons.push("AUDIO_FILE_MISSING");
  if (fileExists && fileSize <= 0) reasons.push("AUDIO_FILE_EMPTY");

  if (ageSeconds !== null && ageSeconds >= minAgeSeconds) {
    if (durationSeconds !== null) {
      if (ageSeconds > durationSeconds + graceSeconds) {
        reasons.push("TRACK_STALE_PAST_DURATION");
      }
    } else if (ageSeconds > maxTrackSeconds) {
      reasons.push("TRACK_STALE_PAST_MAX_SECONDS");
    }
  }

  const shouldKick = reasons.length > 0;

  let nextResult: AnyRecord | null = null;

  if (shouldKick) {
    nextResult = await postJson("/api/listener/smartzj-clean-next", {
      source: "SMARTZJ_WATCHDOG",
      reasons,
      maxTrackSeconds,
      graceSeconds,
      minAgeSeconds,
    });
  }

  const result = {
    ok: true,
    route: "/api/radio/smartzj-watchdog",
    action: shouldKick ? "SMARTZJ_WATCHDOG_KICKED_NEXT" : "SMARTZJ_WATCHDOG_OK",
    shouldKick,
    reasons,
    checkedAt: new Date().toISOString(),
    maxTrackSeconds,
    graceSeconds,
    minAgeSeconds,
    current: {
      mode: nowPlaying.mode,
      safety: nowPlaying.safety,
      title: nowPlaying.now_playing?.song?.title || currentBroadcast.title || "",
      artist: nowPlaying.now_playing?.song?.artist || currentBroadcast.artist || "",
      audioUrl,
      localFile,
      fileExists,
      fileSize,
      durationSeconds,
      ageSeconds,
      startedAt,
      rawAzuraBlocked: currentBroadcast.track?.rawAudioBlocked,
      sequence: currentBroadcast.sequence || null,
    },
    nextResult,
    message: shouldKick
      ? "SmartZJ watchdog advanced to the next clean/bleeped READY track."
      : "SmartZJ watchdog checked current broadcast. No action needed.",
  };

  writeJson(WATCHDOG_STATE_FILE, result);

  return NextResponse.json(result, {
    status: shouldKick ? 202 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  return runWatchdog(request);
}

export async function POST(request: NextRequest) {
  return runWatchdog(request);
}
