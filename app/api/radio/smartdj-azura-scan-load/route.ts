import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type R = Record<string, any>;

const DATA = path.join(process.cwd(), ".data");
const STATE = path.join(DATA, "smartdj-state.json");
const SCAN = path.join(DATA, "smartdj-azura-scan-load-state.json");
const SCAN_MEMORY = path.join(DATA, "smartzj-scan-memory.json");
const MEDIA = process.env.AZURACAST_MEDIA_DIR || "/var/lib/docker/volumes/azuracast_station_data/_data/tha-core-online/media";
const EXTS = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"]);

function read(file: string, fallback: R) {
  try {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
  } catch {
    return fallback;
  }
}

function write(file: string, data: R) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function clean(s: any) {
  return String(s || "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function title(file: string) {
  return path.basename(file, path.extname(file)).replace(/[_-]+/g, " ").trim();
}

function walk(root: string, max = 2000) {
  const out: string[] = [];
  const stack = [root];

  while (stack.length && out.length < max) {
    const dir = stack.pop()!;
    let items: fs.Dirent[] = [];
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const item of items) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) stack.push(full);
      if (item.isFile() && EXTS.has(path.extname(item.name).toLowerCase())) out.push(full);
      if (out.length >= max) break;
    }
  }

  return out.sort();
}

function match(file: string, media: string, target: string) {
  const t = clean(target);
  if (!t || t === "all") return true;

  const rel = clean(path.relative(media, file));
  const full = clean(file);

  if (t === "hip hop") {
    return rel.includes("hip hop") || rel.includes("hiphop") || full.includes("hip hop") || full.includes("hiphop");
  }

  return t.split(" ").filter(Boolean).every((x) => rel.includes(x) || full.includes(x));
}

function id(row: R) {
  return String(row.id || row.trackId || "").trim();
}

function ensure(state: R) {
  if (!Array.isArray(state.playlist)) state.playlist = [];
  if (!Array.isArray(state.lastPlaylist)) state.lastPlaylist = [];
  if (!state.lastResult || typeof state.lastResult !== "object") state.lastResult = {};
  if (!Array.isArray(state.lastResult.playlist)) state.lastResult.playlist = [];
}

function upsert(list: R[], row: R) {
  const i = list.findIndex((x) => id(x) === id(row));

  if (i < 0) {
    list.push(row);
    return "inserted";
  }

  const old = list[i];
  list[i] = {
    ...old,
    source: "SMARTZJ_AZURA_SCAN",
    sourceFilePath: row.sourceFilePath,
    localAudioPath: row.localAudioPath,
    azuraRelativePath: row.azuraRelativePath,
    rawAudioBlocked: true,
    updatedAt: row.updatedAt,
  };

  if (String(old.cleanStatus || "") !== "PROCESSED_AUDIO_READY") {
    list[i] = {
      ...list[i],
      status: "HELD",
      safetyStatus: "HELD",
      cleanStatus: "LOCAL_SOURCE_ATTACHED",
      held: true,
      needsBleep: true,
      audioUrl: "",
      cleanAudioUrl: "",
      processedAudioUrl: "",
      statusText: "HELD - Azura source attached for SmartZJ background clean.",
    };
  }

  return "updated";
}

export async function GET() {
  return NextResponse.json(read(SCAN, {
    ok: true,
    action: "SMARTZJ_AZURA_SCAN_LOAD",
    message: "No scan/load has run yet.",
  }), { headers: { "Cache-Control": "no-store" } });
}


// SMARTZJ_SCAN_MEMORY_V1
function fileKey(file: string, mediaDir: string) {
  return path.relative(mediaDir, file).replace(/\\/g, "/");
}

function fileFingerprint(file: string) {
  try {
    const stat = fs.statSync(file);
    return `${stat.size}:${Math.floor(stat.mtimeMs)}`;
  } catch {
    return "";
  }
}

function readScanMemory() {
  return read(SCAN_MEMORY, { ok: true, cursor: 0, files: {}, updatedAt: "" });
}

function writeScanMemory(memory: R) {
  memory.ok = true;
  memory.updatedAt = new Date().toISOString();
  write(SCAN_MEMORY, memory);
}

function isAlreadyKnownCleanOrHeld(memory: R, key: string, fingerprint: string) {
  const record = memory.files?.[key];
  if (!record) return false;
  if (record.fingerprint !== fingerprint) return false;

  const status = String(record.status || "").toUpperCase();

  return (
    status === "READY" ||
    status === "PROCESSED_AUDIO_READY" ||
    status === "HELD" ||
    status === "FAILED" ||
    status === "BLOCKED"
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const mediaDir = String(body.mediaDir || MEDIA);
  const target = String(body.target || "hip hop");
  const limit = Math.max(1, Math.min(Number(body.limit || 25), 500));
  const maxScan = Math.max(1, Math.min(Number(body.maxScan || 2000), 20000));

  if (!fs.existsSync(mediaDir)) {
    return NextResponse.json({ ok: false, status: "AZURA_MEDIA_DIR_NOT_FOUND", mediaDir }, { status: 404 });
  }

  const scanned = walk(mediaDir, maxScan);
    const memory = readScanMemory();
  const allMatched = scanned
    .filter((file) => match(file, mediaDir, target))
    .sort();

  const startCursor = Math.max(0, Number(memory.cursor || 0));
  const rotated = [...allMatched.slice(startCursor), ...allMatched.slice(0, startCursor)];

  const matched = [];

  for (const file of rotated) {
    const key = fileKey(file, mediaDir);
    const fingerprint = fileFingerprint(file);

    if (isAlreadyKnownCleanOrHeld(memory, key, fingerprint)) continue;

    matched.push(file);

    if (matched.length >= limit) break;
  }

  memory.cursor = allMatched.length > 0 ? (startCursor + Math.max(1, matched.length)) % allMatched.length : 0;
  const state = read(STATE, {});
  ensure(state);

  let inserted = 0;
  let updated = 0;
  const now = new Date().toISOString();

  const rows = matched.map((file) => {
    const rel = fileKey(file, mediaDir);
      const fingerprint = fileFingerprint(file);
    return {
      id: rel,
      trackId: rel,
      title: title(file),
      artist: "AzuraCast",
      source: "SMARTZJ_AZURA_SCAN",
      sourceFilePath: file,
      localAudioPath: file,
      azuraRelativePath: rel,
      rawAudioBlocked: true,
      status: "HELD",
      safetyStatus: "HELD",
      cleanStatus: "LOCAL_SOURCE_ATTACHED",
      held: true,
      needsBleep: true,
      audioUrl: "",
      cleanAudioUrl: "",
      processedAudioUrl: "",
      statusText: "HELD - Azura source attached for SmartZJ background clean.",
      createdAt: now,
      updatedAt: now,
      fingerprint,
    };
  });

  for (const row of rows) {
    const result = upsert(state.playlist, row);
    if (result === "inserted") inserted++;
    if (result === "updated") updated++;
    upsert(state.lastPlaylist, row);
    upsert(state.lastResult.playlist, row);
  }

  state.playlistTitle = `SmartZJ ${target} Azura clean batch`;
  state.target = target;
  state.updatedAt = now;
  state.message = `SmartZJ loaded ${rows.length} Azura track(s). Raw Azura remains blocked until cleaned.`;

  write(STATE, state);

  const result = {
    ok: true,
    action: "SMARTZJ_AZURA_SCAN_LOAD",
    target,
    mediaDir,
    scannedAudioCount: scanned.length,
    loadedCount: rows.length,
    inserted,
    updated,
    message: target.toLowerCase() === "hip hop"
      ? "SmartZJ loaded Hip Hop first. Next target can be all."
      : "SmartZJ loaded Azura tracks for background cleaning.",
    rows: rows.map((r) => ({ id: r.id, title: r.title, sourceFilePath: r.sourceFilePath, cleanStatus: r.cleanStatus })),
  };

    if (!memory.files || typeof memory.files !== "object") memory.files = {};

  for (const row of rows) {
    memory.files[row.id] = {
      id: row.id,
      title: row.title,
      fingerprint: row.fingerprint,
      status: "HELD",
      reason: "Loaded for SmartZJ clean/bleep scan.",
      updatedAt: now,
    };
  }

  writeScanMemory(memory);

  write(SCAN, result);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}

