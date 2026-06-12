import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, ".data");
const CURRENT_BROADCAST_FILE = path.join(DATA_DIR, "current-broadcast.json");
const DEBUG_FILE = path.join(DATA_DIR, "live-current-audio-debug.json");

type AnyObj = Record<string, any>;

async function readJson(file: string): Promise<AnyObj | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function safePublicAudioPath(url: unknown): string | null {
  if (typeof url !== "string" || !url.trim()) return null;

  let clean = url.split("?")[0].split("#")[0].trim();

  try {
    clean = decodeURIComponent(clean);
  } catch {
    return null;
  }

  if (!clean.startsWith("/audio/")) return null;

  const file = path.normalize(path.join(PUBLIC_DIR, clean.replace(/^\/+/, "")));
  const publicRoot = path.normalize(PUBLIC_DIR + path.sep);

  if (!file.startsWith(publicRoot)) return null;
  return file;
}

async function writeDebug(payload: AnyObj) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DEBUG_FILE, JSON.stringify(payload, null, 2));
  } catch {}
}

function getCurrentAudioUrl(current: AnyObj): string {
  return String(
    current.audioUrl ||
      current.streamUrl ||
      current.listen_url ||
      current.cleanAudioUrl ||
      current.track?.audioUrl ||
      current.track?.streamUrl ||
      current.track?.listen_url ||
      current.track?.cleanAudioUrl ||
      ""
  );
}

async function handle(req: NextRequest) {
  const current = await readJson(CURRENT_BROADCAST_FILE);
  const currentAudio = current ? getCurrentAudioUrl(current) : "";
  const file = safePublicAudioPath(currentAudio);

  if (!current || !file) {
    await writeDebug({
      at: new Date().toISOString(),
      method: req.method,
      ok: false,
      reason: "NO_VALID_OWNER_CURRENT_AUDIO",
      currentAudio,
      programName: current?.programName || null,
      title: current?.title || null,
    });

    return new Response("No valid owner current audio.", {
      status: 404,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Tha-Core-No-Old-Fallback": "true",
      },
    });
  }

  let stat;
  try {
    stat = await fs.stat(file);
    if (!stat.isFile()) throw new Error("not file");
  } catch {
    await writeDebug({
      at: new Date().toISOString(),
      method: req.method,
      ok: false,
      reason: "OWNER_CURRENT_AUDIO_FILE_MISSING",
      currentAudio,
      file,
      programName: current.programName || null,
      title: current.title || null,
    });

    return new Response("Owner current audio file missing. No old fallback used.", {
      status: 404,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Tha-Core-No-Old-Fallback": "true",
      },
    });
  }

  const size = stat.size;
  const range = req.headers.get("range");

  await writeDebug({
    at: new Date().toISOString(),
    method: req.method,
    ok: true,
    reason: "OWNER_CURRENT_DIRECT_AUDIO_ONLY",
    currentAudio,
    file: path.basename(file),
    size,
    range: range || null,
    programName: current.programName || current.track?.programName || null,
    title: current.title || current.track?.title || null,
  });

  const baseHeaders: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Tha-Core-Current-Broadcast": "true",
    "X-Tha-Core-No-Old-Fallback": "true",
    "X-Tha-Core-Audio-Mode": "OWNER_CURRENT_DIRECT_AUDIO_ONLY",
  };

  if (req.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": String(size),
      },
    });
  }

  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    const start = match?.[1] ? Number.parseInt(match[1], 10) : 0;
    const end = match?.[2] ? Number.parseInt(match[2], 10) : size - 1;
    const safeStart = Math.max(0, Math.min(start, size - 1));
    const safeEnd = Math.max(safeStart, Math.min(end, size - 1));
    const chunkSize = safeEnd - safeStart + 1;

    return new Response(createReadStream(file, { start: safeStart, end: safeEnd }) as any, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${safeStart}-${safeEnd}/${size}`,
      },
    });
  }

  return new Response(createReadStream(file) as any, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(size),
    },
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function HEAD(req: NextRequest) {
  return handle(req);
}
