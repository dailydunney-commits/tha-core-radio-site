import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AnyRecord = Record<string, any>;

const DATA_DIR = path.join(process.cwd(), ".data");
const ROTATION_STATE_FILE = path.join(DATA_DIR, "smartzj-folder-rotation-state.json");

const DEFAULT_MEDIA_DIR =
  process.env.SMARTZJ_MEDIA_DIR ||
  process.env.AZURACAST_MEDIA_DIR ||
  path.join(process.cwd(), ".data", "azura-source-cache");

function internalBaseUrl() {
  return String(process.env.SMARTZJ_INTERNAL_BASE_URL || "http://127.0.0.1:3101").replace(/\/+$/, "");
}

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

function isAudioFile(filePath: string) {
  return /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(filePath);
}

function walkAudioFiles(root: string, maxScan: number) {
  const files: string[] = [];
  const stack = [root];

  while (stack.length && files.length < maxScan) {
    const current = stack.pop();
    if (!current) continue;

    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }

      if (entry.isFile() && isAudioFile(full)) {
        files.push(full);
        if (files.length >= maxScan) break;
      }
    }
  }

  return files.sort();
}

function folderLaneOf(filePath: string, mediaDir: string) {
  const rel = path.relative(mediaDir, filePath).replace(/\\/g, "/");
  const parts = rel.split("/").filter(Boolean);

  if (parts.length >= 2) return parts[0];
  return "Root";
}

function collectFolders(mediaDir: string, maxScan: number) {
  const files = walkAudioFiles(mediaDir, maxScan);
  const counts = new Map<string, number>();

  for (const file of files) {
    const lane = folderLaneOf(file, mediaDir);
    counts.set(lane, (counts.get(lane) || 0) + 1);
  }

  return [...counts.entries()]
    .map(([lane, count]) => ({ lane, count }))
    .sort((a, b) => a.lane.localeCompare(b.lane));
}

function pickNextFolder(folders: AnyRecord[], state: AnyRecord) {
  if (!folders.length) return null;

  const lastIndexRaw = Number(state.folderIndex);
  const lastIndex = Number.isFinite(lastIndexRaw) ? lastIndexRaw : -1;
  const nextIndex = (lastIndex + 1) % folders.length;

  return {
    ...folders[nextIndex],
    index: nextIndex,
  };
}

async function postJson(route: string, body: AnyRecord) {
  const res = await fetch(`${internalBaseUrl()}${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

async function getJson(route: string) {
  const res = await fetch(`${internalBaseUrl()}${route}`, {
    method: "GET",
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForBackgroundClean(timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  let lastState: AnyRecord = {};

  while (Date.now() < deadline) {
    lastState = await getJson("/api/radio/smartdj-background-clean");

    if (!lastState.running) {
      return lastState;
    }

    await sleep(2000);
  }

  return {
    ok: false,
    status: "BACKGROUND_CLEAN_WAIT_TIMEOUT",
    state: lastState,
  };
}

async function runRotationLoop(options: AnyRecord) {
  const startedAt = new Date().toISOString();

  const mediaDir = String(options.mediaDir || DEFAULT_MEDIA_DIR);
  const limit = Math.max(1, Math.min(Number(options.limit || 25), 25));
  const maxScan = Math.max(100, Math.min(Number(options.maxScan || 20000), 100000));
  const cleanerTimeoutMs = Math.max(30000, Number(options.cleanerTimeoutMs || 30 * 60 * 1000));

  running = true;

  if (!fs.existsSync(mediaDir)) {
    writeJson(ROTATION_STATE_FILE, {
      ok: false,
      running: false,
      action: "SMARTZJ_FOLDER_ROTATION_BRAIN",
      status: "MEDIA_DIR_NOT_FOUND",
      mediaDir,
      updatedAt: new Date().toISOString(),
    });
    running = false;
    return;
  }

  const folders = collectFolders(mediaDir, maxScan);
  const maxFolders = Math.max(
    1,
    Math.min(
      Number(options.maxFolders || (options.continuous ? folders.length : 1)),
      Math.max(folders.length, 1)
    )
  );

  let state = readJson(ROTATION_STATE_FILE, {
    ok: true,
    folderIndex: -1,
    cycles: [],
  });

  const cycles: AnyRecord[] = Array.isArray(state.cycles) ? state.cycles : [];
  const runCycles: AnyRecord[] = [];
  let emptyLoads = 0;

  writeJson(ROTATION_STATE_FILE, {
    ...state,
    ok: true,
    running: true,
    action: "SMARTZJ_FOLDER_ROTATION_BRAIN",
    status: "STARTED",
    mediaDir,
    limit,
    maxFolders,
    folderCount: folders.length,
    startedAt,
    message: "SmartZJ folder rotation started. It will scan/load 25 from one folder/lane, clean/bleep them, then move to the next folder/lane.",
  });

  try {
    for (let i = 0; i < maxFolders; i++) {
      state = readJson(ROTATION_STATE_FILE, state);
      const picked = pickNextFolder(folders, state);

      if (!picked) break;

      const pickedRow = picked as AnyRecord;
      const target = String(pickedRow.lane || pickedRow.folder || pickedRow.name || "Root");
      const cycleStartedAt = new Date().toISOString();

      writeJson(ROTATION_STATE_FILE, {
        ...state,
        ok: true,
        running: true,
        action: "SMARTZJ_FOLDER_ROTATION_BRAIN",
        status: "RUNNING_FOLDER",
        currentFolder: target,
        currentfolderIndex: Number(pickedRow.index),
        mediaDir,
        limit,
        folderCount: folders.length,
        updatedAt: cycleStartedAt,
        message: `SmartZJ is loading ${limit} from ${target}, then cleaning/bleeping that folder batch.`,
        recentRunCycles: runCycles,
      });

      const scanResult = await postJson("/api/radio/smartdj-azura-scan-load", {
        mediaDir,
        target,
        limit,
        maxScan,
      });

      const rowsLoaded = Array.isArray(scanResult.rows)
        ? scanResult.rows.length
        : Number(scanResult.loaded || scanResult.matched || 0);

      let cleanStart: AnyRecord = {
        ok: true,
        status: "NO_ROWS_LOADED_FOR_FOLDER",
        message: "No new rows loaded for this folder. Moving to next folder.",
      };

      let cleanFinal: AnyRecord = cleanStart;

      if (rowsLoaded > 0) {
        cleanStart = await postJson("/api/radio/smartdj-background-clean", {
          target,
          limit,
          force: Boolean(options.force),
        });

        cleanFinal = await waitForBackgroundClean(cleanerTimeoutMs);
        emptyLoads = 0;
      } else {
        emptyLoads++;
      }

      const cycle = {
        folder: target,
        folderIndex: Number(pickedRow.index),
        folderAudioCount: Number(pickedRow.count || 0),
        rowsLoaded,
        scanStatus: scanResult.status || scanResult.action || "",
        cleanStartStatus: cleanStart.status || cleanStart.action || "",
        cleanFinalStatus: cleanFinal.status || cleanFinal.action || "",
        readyCount: cleanFinal.readyCount,
        processed: cleanFinal.processed,
        startedAt: cycleStartedAt,
        finishedAt: new Date().toISOString(),
      };

      runCycles.push(cycle);

      const nextState = {
        ok: true,
        running: true,
        action: "SMARTZJ_FOLDER_ROTATION_BRAIN",
        status: "FOLDER_FINISHED",
        folderIndex: Number(pickedRow.index),
        currentFolder: target,
        mediaDir,
        limit,
        folderCount: folders.length,
        updatedAt: new Date().toISOString(),
        message: `SmartZJ finished folder batch ${target}. Next cycle moves to the next folder/lane.`,
        cycles: [...cycles, ...runCycles].slice(-500),
        recentRunCycles: runCycles,
      };

      writeJson(ROTATION_STATE_FILE, nextState);

      if (emptyLoads >= folders.length) {
        break;
      }
    }

    const finishedAt = new Date().toISOString();

    writeJson(ROTATION_STATE_FILE, {
      ...readJson(ROTATION_STATE_FILE, {}),
      ok: true,
      running: false,
      action: "SMARTZJ_FOLDER_ROTATION_BRAIN",
      status: emptyLoads >= folders.length ? "ALL_FOLDERS_EMPTY_OR_ALREADY_SCANNED" : "FINISHED",
      mediaDir,
      limit,
      folderCount: folders.length,
      processedFolderBatches: runCycles.length,
      startedAt,
      finishedAt,
      message: "SmartZJ folder rotation finished this run. Each folder batch keeps raw Azura blocked and only returns clean/bleeped READY files.",
      recentRunCycles: runCycles,
    });
  } catch (error: any) {
    writeJson(ROTATION_STATE_FILE, {
      ok: false,
      running: false,
      action: "SMARTZJ_FOLDER_ROTATION_BRAIN",
      status: "ROTATION_CRASHED",
      error: String(error?.message || error),
      updatedAt: new Date().toISOString(),
      recentRunCycles: runCycles,
    });
  } finally {
    running = false;
  }
}

export async function GET() {
  return NextResponse.json(readJson(ROTATION_STATE_FILE, {
    ok: true,
    running,
    action: "SMARTZJ_FOLDER_ROTATION_BRAIN",
    message: "No SmartZJ folder rotation state yet.",
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
      state: readJson(ROTATION_STATE_FILE, {}),
    }, {
      status: 202,
      headers: { "Cache-Control": "no-store" },
    });
  }

  setTimeout(() => {
    runRotationLoop(body).catch((error: any) => {
      writeJson(ROTATION_STATE_FILE, {
        ok: false,
        running: false,
        action: "SMARTZJ_FOLDER_ROTATION_BRAIN",
        status: "ROTATION_LOOP_CRASHED",
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
    action: "SMARTZJ_FOLDER_ROTATION_BRAIN",
    limit: Math.max(1, Math.min(Number(body.limit || 25), 25)),
    maxFolders: Number(body.maxFolders || 1),
    message: "SmartZJ folder rotation started. It will load/clean 25 from the current folder, then move to the next folder on the next batch.",
  }, {
    status: 202,
    headers: { "Cache-Control": "no-store" },
  });
}
