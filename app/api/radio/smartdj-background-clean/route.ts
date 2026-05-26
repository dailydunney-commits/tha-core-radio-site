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


// SMARTZJ_TARGET_LANE_CLEANER_V1
function normalizeLane(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "n")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function trackSearchText(track: AnyRecord) {
  return [
    track.genreLane,
    track.genre,
    track.lane,
    track.target,
    track.folder,
    track.id,
    track.trackId,
    track.title,
    track.azuraRelativePath,
    track.sourceFilePath,
    track.localAudioPath,
    track.audioUrl,
    track.cleanAudioUrl,
    track.processedAudioUrl,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");
}

function trackMatchesTarget(track: AnyRecord, target: string) {
  const wanted = normalizeLane(target);
  const text = trackSearchText(track);

  if (!wanted || wanted === "all" || wanted === "azura feeder" || wanted === "smartzj clean mix") {
    return true;
  }

  if (wanted.includes("r n b") || wanted === "rnb") {
    return text.includes("r-n-b") || text.includes("r&b") || text.includes("rnb") || text.includes("r n b");
  }

  if (wanted.includes("hip hop")) {
    return text.includes("hip-hop") || text.includes("hip hop");
  }

  if (wanted.includes("fresh dancehall")) {
    return text.includes("fresh-dancehall") || text.includes("fresh dancehall");
  }

  if (wanted.includes("ole school dancehall") || wanted.includes("old school dancehall")) {
    return text.includes("ole-school-dancehall") || text.includes("old school dancehall") || text.includes("ole school dancehall");
  }

  if (wanted.includes("dancehall")) {
    return text.includes("dancehall");
  }

  if (wanted.includes("reggae")) {
    return text.includes("reggae");
  }

  return text.includes(wanted);
}

function pickPendingForTarget(allTracks: AnyRecord[], target: string, force: boolean, limit: number) {
  const notReady = allTracks.filter((track) => force || !isReady(track));

  const targetPending = notReady.filter((track) => trackMatchesTarget(track, target));
  const otherPending = notReady.filter((track) => !trackMatchesTarget(track, target));

  return [...targetPending, ...otherPending].slice(0, limit);
}

async function runLoop(options: AnyRecord) {
  const startedAt = new Date().toISOString();
  const target = String(options.target || "hip hop");
  const limit = Math.max(1, Math.min(Number(options.limit || 5), 25));
  const force = Boolean(options.force);

  running = true;

  const allTracks = getTracks();
  const pending = pickPendingForTarget(allTracks, target, force, limit);
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
          // SMARTZJ_PASS_FULL_TRACK_ROW_V1
          track,
          title: track.title,
          audioUrl: track.audioUrl,
          cleanAudioUrl: track.cleanAudioUrl,
          processedAudioUrl: track.processedAudioUrl,
          genreLane: track.genreLane || target,
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




