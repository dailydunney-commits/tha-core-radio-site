import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { runSmartDjLocalCleanOne } from "@/lib/audio/smartdj-local-clean-one";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnyRecord = Record<string, any>;

const DATA_DIR = path.join(process.cwd(), ".data");
const SMARTDJ_STATE_FILE = path.join(DATA_DIR, "smartdj-state.json");
const LOOP_STATE_FILE = path.join(DATA_DIR, "smartdj-background-clean-state.json");

let running = false;

function readJson(filePath: string, fallback: AnyRecord) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, data: AnyRecord) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function trackIdOf(track: AnyRecord) {
  return String(track.id || track.trackId || track.file || track.title || "").trim();
}

function cleanUrlOf(track: AnyRecord) {
  return String(
    track.audioUrl ||
      track.cleanAudioUrl ||
      track.processedAudioUrl ||
      track.safeAudioUrl ||
      track.radioSafeAudioUrl ||
      ""
  ).trim();
}

function isReady(track: AnyRecord) {
  const url = cleanUrlOf(track);

  return (
    String(track.status || "").toUpperCase() === "READY" &&
    String(track.safetyStatus || "").toUpperCase() === "READY" &&
    String(track.cleanStatus || "").toUpperCase() === "PROCESSED_AUDIO_READY" &&
    url.startsWith("/audio/smartdj/clean/") &&
    track.rawAudioBlocked !== false &&
    !track.held &&
    !track.needsBleep
  );
}

function getTracks() {
  const state = readJson(SMARTDJ_STATE_FILE, {});
  const lists = [
    Array.isArray(state.playlist) ? state.playlist : [],
    Array.isArray(state.lastPlaylist) ? state.lastPlaylist : [],
    state.lastResult && Array.isArray(state.lastResult.playlist) ? state.lastResult.playlist : [],
  ];

  const seen = new Set<string>();
  const tracks: AnyRecord[] = [];

  for (const list of lists) {
    for (const track of list) {
      const id = trackIdOf(track);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      tracks.push(track);
    }
  }

  return tracks;
}

async function runLoop(options: AnyRecord) {
  const startedAt = new Date().toISOString();
  const target = String(options.target || "hip hop");
  const limit = Math.max(1, Math.min(Number(options.limit || 5), 10));
  const force = Boolean(options.force);

  running = true;

  const allTracks = getTracks();
  const pending = allTracks.filter((track) => force || !isReady(track)).slice(0, limit);
  const results: AnyRecord[] = [];

  writeJson(LOOP_STATE_FILE, {
    ok: true,
    running: true,
    action: "SMARTZJ_BACKGROUND_CLEAN_MVP",
    target,
    limit,
    totalRows: allTracks.length,
    pendingRows: pending.length,
    startedAt,
    message: "SmartZJ background clean started. Current broadcast will not stop. Raw Azura remains blocked.",
    results,
  });

  try {
    for (const track of pending) {
      const trackId = trackIdOf(track);
      if (!trackId) continue;

      try {
        const result: AnyRecord = await runSmartDjLocalCleanOne({
          trackId,
          id: trackId,
          sourceFilePath: track.sourceFilePath,
          localAudioPath: track.localAudioPath,
          source: "SMARTZJ_BACKGROUND_CLEAN",
          target,
          backgroundClean: true,
        });

        results.push({
          trackId,
          title: track.title || trackId,
          ok: Boolean(result.ok),
          status: result.status || "",
          cleanAudioUrl: result.cleanAudioUrl || result.processedAudioUrl || "",
          returnedToSmartDj: Boolean(result.returnedToSmartDj),
          message: result.message || "",
        });
      } catch (error: any) {
        results.push({
          trackId,
          title: track.title || trackId,
          ok: false,
          status: "BACKGROUND_CLEAN_FAILED",
          error: String(error?.message || error),
        });
      }

      writeJson(LOOP_STATE_FILE, {
        ok: true,
        running: true,
        action: "SMARTZJ_BACKGROUND_CLEAN_MVP",
        target,
        limit,
        processed: results.length,
        pendingRows: pending.length,
        updatedAt: new Date().toISOString(),
        message: "SmartZJ background clean running. Raw Azura remains blocked.",
        results,
      });
    }

    const finalTracks = getTracks();
    const readyCount = finalTracks.filter(isReady).length;
    const finishedAt = new Date().toISOString();

    writeJson(LOOP_STATE_FILE, {
      ok: true,
      running: false,
      action: "SMARTZJ_BACKGROUND_CLEAN_MVP",
      target,
      limit,
      processed: results.length,
      totalRows: finalTracks.length,
      readyCount,
      startedAt,
      finishedAt,
      message: "SmartZJ background clean finished. Only READY clean/bleeped rows can broadcast.",
      results,
    });
  } finally {
    running = false;
  }
}

export async function GET() {
  return NextResponse.json(readJson(LOOP_STATE_FILE, {
    ok: true,
    running,
    action: "SMARTZJ_BACKGROUND_CLEAN_MVP",
    target: "hip hop",
    message: "No SmartZJ background clean state yet.",
  }), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  if (running) {
    return NextResponse.json({
      ok: true,
      running: true,
      status: "ALREADY_RUNNING",
      state: readJson(LOOP_STATE_FILE, {}),
    }, {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    });
  }

  setTimeout(() => {
    runLoop(body).catch((error: any) => {
      writeJson(LOOP_STATE_FILE, {
        ok: false,
        running: false,
        status: "BACKGROUND_LOOP_CRASHED",
        error: String(error?.message || error),
        updatedAt: new Date().toISOString(),
      });
      running = false;
    });
  }, 10);

  return NextResponse.json({
    ok: true,
    running: true,
    status: "STARTED",
    action: "SMARTZJ_BACKGROUND_CLEAN_MVP",
    target: String(body.target || "hip hop"),
    message: "SmartZJ background clean started. Current broadcast will not stop. Raw Azura remains blocked.",
  }, {
    status: 202,
    headers: { "Cache-Control": "no-store" },
  });
}
