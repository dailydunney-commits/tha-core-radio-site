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
const PROGRAM_DIR = path.join(DATA_DIR, "ai-host-long-show-programs");
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
    if (!safeName) return { file: null, reason: "UNSAFE_AI_HOST_AUDIO_FILE" };
    return { file: path.join(AI_HOST_DIR, safeName), reason: "OWNER_AI_HOST_AUDIO_ROUTE" };
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
    if (!file.startsWith(publicRoot)) return { file: null, reason: "AUDIO_PATH_OUTSIDE_PUBLIC" };
    return { file, reason: "OWNER_PUBLIC_AUDIO_PATH" };
  }

  return { file: null, reason: "UNSUPPORTED_OWNER_AUDIO_URL" };
}

async function existingAudioFile(audioUrl: string) {
  const resolved = resolveAudioFile(audioUrl);
  if (!resolved.file) return null;

  try {
    const stat = await fs.stat(resolved.file);
    if (!stat.isFile() || stat.size < 1000) return null;
    return {
      file: resolved.file,
      size: stat.size,
      reason: resolved.reason,
    };
  } catch {
    return null;
  }
}

async function collectCurrentProgramFiles(current: AnyObj) {
  const programId = String(current.programId || current.track?.programId || "").trim();
  const currentPart = Number(current.sequence?.itemNumber || current.track?.partNumber || 1);

  if (!programId) return [];

  const manifest = await readJson(path.join(PROGRAM_DIR, `${programId}.json`));
  if (!manifest || !Array.isArray(manifest.audioParts)) return [];

  const parts = [...manifest.audioParts]
    .filter((part: AnyObj) => Number(part.partNumber || 0) >= currentPart)
    .sort((a: AnyObj, b: AnyObj) => Number(a.partNumber || 0) - Number(b.partNumber || 0));

  const files: { file: string; size: number; reason: string; partNumber: number; title: string }[] = [];

  for (const part of parts) {
    const audioUrl = String(
      part.audioUrl ||
        part.streamUrl ||
        part.listen_url ||
        part.cleanAudioUrl ||
        part.track?.audioUrl ||
        part.track?.streamUrl ||
        part.track?.listen_url ||
        part.storageUrl ||
        ""
    );

    const found = await existingAudioFile(audioUrl);
    if (found) {
      files.push({
        ...found,
        partNumber: Number(part.partNumber || files.length + 1),
        title: String(part.track?.title || part.segmentTitle || `Part ${part.partNumber || files.length + 1}`),
      });
    }
  }

  return files;
}

async function* chainFiles(files: { file: string }[]) {
  for (const item of files) {
    const stream = createReadStream(item.file);
    for await (const chunk of stream) {
      yield typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    }
  }
}

function iteratorToStream(iterator: AsyncGenerator<Buffer>) {
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const result = await iterator.next();
      if (result.done) {
        controller.close();
        return;
      }
      controller.enqueue(new Uint8Array(result.value));
    },
    async cancel() {
      if (iterator.return) await iterator.return(undefined);
    },
  });
}

async function handle(req: NextRequest) {
  const current = await readJson(CURRENT_BROADCAST_FILE);

  if (!current) {
    await writeDebug({ at: new Date().toISOString(), method: req.method, ok: false, reason: "NO_CURRENT_BROADCAST" });
    return new Response("No current broadcast.", { status: 404 });
  }

  const directAudioUrl = getCurrentAudioUrl(current);
  const direct = await existingAudioFile(directAudioUrl);
  const preferDirect =
    current.track?.stitchedAudio === true ||
    current.sequence?.stitchedAudio === true ||
    directAudioUrl.includes("stitched");

  let files: { file: string; size: number; reason: string; partNumber: number; title: string }[] = [];

  if (preferDirect && direct) {
    files = [{
      ...direct,
      partNumber: 1,
      title: String(current.title || "Current Broadcast Stitched Audio"),
    }];
  } else {
    files = await collectCurrentProgramFiles(current);

    if (files.length < 1 && direct) {
      files = [{
        ...direct,
        partNumber: Number(current.track?.partNumber || 1),
        title: String(current.title || "Current Broadcast"),
      }];
    }
  }

  if (files.length < 1) {
    await writeDebug({
      at: new Date().toISOString(),
      method: req.method,
      ok: false,
      reason: "NO_PLAYABLE_OWNER_AUDIO_FILES",
      programId: current.programId || null,
      programName: current.programName || null,
      currentAudio: getCurrentAudioUrl(current),
    });

    return new Response("No playable owner current broadcast audio. No old fallback used.", {
      status: 404,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Tha-Core-No-Old-Fallback": "true",
      },
    });
  }

  const totalSize = files.reduce((sum, item) => sum + item.size, 0);
  const range = req.headers.get("range");

  await writeDebug({
    at: new Date().toISOString(),
    method: req.method,
    ok: true,
    mode: "OWNER_CURRENT_PROGRAM_CHAIN",
    reason: files.length > 1 ? "CURRENT_PROGRAM_AUDIO_CHAIN" : files[0].reason,
    programId: current.programId || null,
    programName: current.programName || null,
    chainCount: files.length,
    totalSize,
    parts: files.map((item) => ({
      partNumber: item.partNumber,
      file: path.basename(item.file),
      size: item.size,
      title: item.title,
    })),
    range: range || null,
  });

  const baseHeaders: Record<string, string> = {
    "Content-Type": "audio/mpeg",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Tha-Core-Current-Broadcast": "true",
    "X-Tha-Core-No-Old-Fallback": "true",
    "X-Tha-Core-Audio-Mode": "OWNER_CURRENT_PROGRAM_CHAIN",
    "X-Tha-Core-Chain-Count": String(files.length),
  };

  if (req.method === "HEAD") {
    return new Response(null, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": String(totalSize),
      },
    });
  }

  if (files.length === 1 && range) {
    const file = files[0].file;
    const size = files[0].size;
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
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Range": `bytes ${safeStart}-${safeEnd}/${size}`,
      },
    });
  }

  return new Response(iteratorToStream(chainFiles(files)), {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(totalSize),
    },
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function HEAD(req: NextRequest) {
  return handle(req);
}

