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
const SMARTZJ_LIVE_READY_POOL_FILE = path.join(DATA_DIR, "smartzj-live-ready-pool.json");

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

function targetLaneText(track: AnyRecord) {
  return [
    track.genreLane,
    track.genre,
    track.lane,
    track.folder,
    track.id,
    track.trackId,
    track.azuraRelativePath,
    track.sourceFilePath,
    track.localAudioPath,
  ]
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ");
}

function trackMatchesTarget(track: AnyRecord, target: string) {
  const wanted = normalizeLane(target);

  if (!wanted || wanted === "all" || wanted === "azura feeder" || wanted === "smartzj clean mix") {
    return true;
  }

  const text = targetLaneText(track);

  if (wanted.includes("ole school dancehall") || wanted.includes("old school dancehall")) {
    return text.includes("ole-school-dancehall") ||
      text.includes("ole school dancehall") ||
      text.includes("old-school-dancehall") ||
      text.includes("old school dancehall");
  }

  if (wanted.includes("hip hop") || wanted === "hiphop") {
    return text.includes("hip-hop") || text.includes("hip hop") || text.includes("hiphop");
  }

  if (wanted.includes("fresh dancehall")) {
    return text.includes("fresh-dancehall") || text.includes("fresh dancehall");
  }

  if (wanted === "dancehall") {
    return text.includes("dancehall") &&
      !text.includes("ole-school-dancehall") &&
      !text.includes("fresh-dancehall");
  }

  if (wanted.includes("r n b") || wanted === "rnb") {
    return text.includes("r-n-b") || text.includes("r&b") || text.includes("rnb") || text.includes("r n b");
  }

  if (wanted === "reggae") {
    return text.includes("reggae") &&
      !text.includes("fresh-dancehall") &&
      !text.includes("ole-school-dancehall") &&
      !text.includes("dancehall");
  }

  return text.includes(wanted);
}

function pickPendingForTarget(allTracks: AnyRecord[], target: string, force: boolean, limit: number) {
  const notReady = allTracks.filter((track) => force || !isReady(track));

  const targetPending = notReady.filter((track) => trackMatchesTarget(track, target));
  const otherPending = notReady.filter((track) => !trackMatchesTarget(track, target));

  return [...targetPending, ...otherPending].slice(0, limit);
}


// SMARTZJ_APPEND_READY_TO_LIVE_POOL_V1
function smartZjText(value: unknown) {
  return String(value ?? "").trim();
}

function inferSmartZjGenreLane(track: AnyRecord, target: string) {
  const combined = [
    track.genreLane,
    track.genre,
    track.lane,
    track.folder,
    target,
    track.id,
    track.trackId,
    track.title,
    track.azuraRelativePath,
    track.sourceFilePath,
    track.localAudioPath,
  ]
    .map((value) => smartZjText(value).toLowerCase())
    .join(" ");

  if (combined.includes("r-n-b") || combined.includes("r&b") || combined.includes("r n b") || combined.includes("rnb")) return "R-n-B";
  if (combined.includes("hip-hop") || combined.includes("hip hop")) return "Hip-Hop";
  if (combined.includes("fresh-dancehall") || combined.includes("fresh dancehall")) return "Fresh-Dancehall";
  if (combined.includes("ole-school-dancehall") || combined.includes("old school dancehall") || combined.includes("ole school dancehall")) return "Ole-School-Dancehall";
  if (combined.includes("dancehall")) return "Dancehall";
  if (combined.includes("reggae")) return "Reggae";

  return smartZjText(track.genreLane || target || "SmartZJ Clean Mix");
}

function appendReadyToSmartZjLivePool(track: AnyRecord, result: AnyRecord, target: string) {
  const status = smartZjText(result.status || result.cleanStatus || result.bleepJobStatus).toUpperCase();
  const cleanAudioUrl = smartZjText(result.cleanAudioUrl || result.processedAudioUrl || result.audioUrl);

  if (status !== "PROCESSED_AUDIO_READY" && status !== "READY") return null;
  if (!cleanAudioUrl.startsWith("/audio/smartdj/clean/")) return null;

  const trackId = smartZjText(result.trackId || result.selectedTrackId || track.trackId || track.id || cleanAudioUrl);
  const title = smartZjText(result.title || result.selectedTitle || track.title || trackId);
  const genreLane = inferSmartZjGenreLane(track, target);

  const readyRow: AnyRecord = {
    ...track,
    id: trackId,
    trackId,
    title,
    artist: smartZjText(track.artist || result.artist || "AzuraCast"),
    source: "SMARTZJ_LIVE_READY_POOL",
    genreLane,
    audioUrl: cleanAudioUrl,
    streamUrl: cleanAudioUrl,
    listen_url: cleanAudioUrl,
    cleanAudioUrl,
    processedAudioUrl: cleanAudioUrl,
    status: "READY",
    safetyStatus: "READY",
    cleanStatus: "PROCESSED_AUDIO_READY",
    bleepJobStatus: "PROCESSED_AUDIO_READY",
    needsBleep: false,
    held: false,
    rawAudioBlocked: true,
    returnedToSmartDj: true,
    updatedAt: new Date().toISOString(),
    safetyNote: "Added directly by SmartZJ background cleaner after successful clean/bleep processing. Raw Azura blocked.",
  };

  const pool = readJson(SMARTZJ_LIVE_READY_POOL_FILE, { ok: true, tracks: [] });
  const existing = Array.isArray(pool.tracks) ? pool.tracks : [];

  const key = `${trackId}|${cleanAudioUrl}`;
  const filtered = existing.filter((item: AnyRecord) => {
    const itemKey = `${smartZjText(item.trackId || item.id)}|${smartZjText(item.cleanAudioUrl || item.processedAudioUrl || item.audioUrl)}`;
    return itemKey !== key;
  });

  const tracks = [...filtered, readyRow].slice(-5000);

  writeJson(SMARTZJ_LIVE_READY_POOL_FILE, {
    ok: true,
    count: tracks.length,
    policy: "Persistent SmartZJ live READY pool. Raw Azura blocked.",
    updatedAt: new Date().toISOString(),
    tracks,
  });

  return readyRow;
}

async function runLoop(options: AnyRecord) {
  const startedAt = new Date().toISOString();
  const target = String(options.target || "hip hop");
  const limit = Math.max(1, Math.min(Number(options.limit || 25), 50));
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

        const livePoolRow = appendReadyToSmartZjLivePool(track, result, target);

        results.push({
          trackId,
          title: track.title || trackId,
          ok: Boolean(result.ok),
          status: result.status || "",
          cleanAudioUrl: result.cleanAudioUrl || result.processedAudioUrl || "",
          returnedToSmartDj: Boolean(result.returnedToSmartDj),
          returnedToLiveReadyPool: Boolean(livePoolRow),
          genreLane: livePoolRow?.genreLane || track.genreLane || target,
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
    limit: Math.max(1, Math.min(Number(body.limit || 25), 50)),
    message: "SmartZJ background clean started. Current broadcast will not stop. Raw Azura remains blocked.",
  }, {
    status: 202,
    headers: { "Cache-Control": "no-store" },
  });
}
