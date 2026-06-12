import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const AI_HOST_DIR = path.join(PUBLIC_DIR, "audio", "ai-host");
const DATA_DIR = path.join(ROOT_DIR, ".data");
const CURRENT_BROADCAST_FILE = path.join(DATA_DIR, "current-broadcast.json");
const DEBUG_FILE = path.join(DATA_DIR, "live-current-audio-debug.json");

type AnyObj = Record<string, any>;

async function readJson(file: string): Promise<AnyObj | null> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function writeDebug(payload: AnyObj) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DEBUG_FILE, JSON.stringify(payload, null, 2));
  } catch {}
}

function safeMp3FileName(value: string | null): string | null {
  const file = String(value || "").trim();
  if (!/^[a-zA-Z0-9._-]+\.mp3$/.test(file)) return null;
  if (file.includes("..") || file.includes("/") || file.includes("\\")) return null;
  return file;
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

function resolveAudioFile(audioUrl: string): { file: string | null; reason: string } {
  const raw = String(audioUrl || "").trim();

  if (raw.startsWith("/api/listener/ai-host-audio")) {
    const url = new URL(raw, "http://127.0.0.1");
    const safeName = safeMp3FileName(url.searchParams.get("file"));

    if (!safeName) {
      return { file: null, reason: "UNSAFE_AI_HOST_AUDIO_FILE" };
    }

    return {
      file: path.join(AI_HOST_DIR, safeName),
      reason: "OWNER_AI_HOST_AUDIO_ROUTE",
    };
  }

  if (raw.startsWith("/audio/")) {
    let clean = raw.split("?")[0].split("#")[0].trim();

    try {
      clean = decodeURIComponent(clean);
    } catch {
      return { file: null, reason: "BAD_AUDIO_URL_ENCODING" };
    }

    const file = path.normalize(path.join(PUBLIC_DIR, clean.replace(/^\/+/, "")));
    const publicRoot = path.normalize(PUBLIC_DIR + path.sep);

    if (!file.startsWith(publicRoot)) {
      return { file: null, reason: "AUDIO_PATH_OUTSIDE_PUBLIC" };
    }

    return { file, reason: "OWNER_PUBLIC_AUDIO_PATH" };
  }

  return { file: null, reason: "UNSUPPORTED_OWNER_AUDIO_URL" };
}

async function handle(req: NextRequest) {
  const current = await readJson(CURRENT_BROADCAST_FILE);
  const currentAudio = current ? getCurrentAudioUrl(current) : "";
  const resolved = resolveAudioFile(currentAudio);

  if (!current || !resolved.file) {
    await writeDebug({
      at: new Date().toISOString(),
      method: req.method,
      ok: false,
      reason: resolved.reason,
      currentAudio,
      programName: current?.programName || null,
      title: current?.title || null,
    });

    return new Response("No valid owner current audio.", {
      status: 404,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Tha-Core-No-Old-Fallback": "true",
        "X-Tha-Core-Reason": resolved.reason,
      },
    });
  }

  let stat;
  try {
    stat = await fs.stat(resolved.file);
    if (!stat.isFile()) throw new Error("not file");
  } catch {
    await writeDebug({
      at: new Date().toISOString(),
      method: req.method,
      ok: false,
      reason: "OWNER_CURRENT_AUDIO_FILE_MISSING",
      currentAudio,
      resolvedReason: resolved.reason,
      file: resolved.file,
      programName: current.programName || null,
      title: current.title || null,
    });

    return new Response("Owner current audio file missing. No old fallback used.", {
      status: 404,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Tha-Core-No-Old-Fallback": "true",
        "X-Tha-Core-Reason": "OWNER_CURRENT_AUDIO_FILE_MISSING",
      },
    });
  }

  const size = stat.size;
  const range = req.headers.get("range");

  await writeDebug({
    at: new Date().toISOString(),
    method: req.method,
    ok: true,
    reason: resolved.reason,
    mode: "OWNER_CURRENT_AUDIO_ROUTE_AWARE",
    currentAudio,
    file: path.basename(resolved.file),
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
    "X-Tha-Core-Audio-Mode": "OWNER_CURRENT_AUDIO_ROUTE_AWARE",
    "X-Tha-Core-Resolved-Reason": resolved.reason,
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

    return new Response(createReadStream(resolved.file, { start: safeStart, end: safeEnd }) as any, {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${safeStart}-${safeEnd}/${size}`,
      },
    });
  }

  return new Response(createReadStream(resolved.file) as any, {
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
