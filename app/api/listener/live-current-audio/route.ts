import { NextRequest } from "next/server";
import fs from "fs/promises";
import path from "path";
import { createReadStream } from "fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const DATA_DIR = path.join(ROOT_DIR, ".data");
const AI_HOST_DIR = path.join(PUBLIC_DIR, "audio", "ai-host");
const LONG_SHOW_DIR = path.join(DATA_DIR, "ai-host-long-show-programs");
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

async function existsFile(file: string): Promise<boolean> {
  try {
    const stat = await fs.stat(file);
    return stat.isFile();
  } catch {
    return false;
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

function basename(fileOrUrl: string): string {
  return path.basename(fileOrUrl.split("?")[0].split("#")[0]);
}

function getPartNumber(name: string): number {
  const match = basename(name).match(/part-(\d+)/i);
  return match ? Number.parseInt(match[1], 10) || 0 : 0;
}

function getLongShowPrefix(name: string): string | null {
  const base = basename(name);
  const match = base.match(/^(.*?)-part-\d{1,4}-/i);
  return match?.[1] || null;
}

function collectAudioUrls(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    if (value.includes("/audio/ai-host/") && value.toLowerCase().includes(".mp3")) {
      out.push(value);
    }
    return out;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectAudioUrls(item, out);
    return out;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value as AnyObj)) collectAudioUrls(item, out);
  }

  return out;
}

async function walkJsonFiles(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await walkJsonFiles(full)));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".json")) {
        files.push(full);
      }
    }

    return files;
  } catch {
    return [];
  }
}

async function fromLongShowManifest(current: AnyObj): Promise<string[]> {
  const programId = String(current.programId || current.track?.programId || "");
  const programName = String(current.programName || current.track?.programName || "");
  const currentAudio = String(current.audioUrl || current.track?.audioUrl || "");
  const prefix = getLongShowPrefix(currentAudio);

  const jsonFiles = await walkJsonFiles(LONG_SHOW_DIR);
  const selected: string[] = [];

  for (const jsonFile of jsonFiles) {
    let parsed: AnyObj | null = null;
    try {
      const raw = await fs.readFile(jsonFile, "utf8");
      if (
        (programId && !raw.includes(programId)) &&
        (programName && !raw.includes(programName)) &&
        (prefix && !raw.includes(prefix))
      ) {
        continue;
      }
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const urls = collectAudioUrls(parsed);
    for (const url of urls) {
      if (prefix && !basename(url).startsWith(`${prefix}-part-`)) continue;
      const file = safePublicAudioPath(url);
      if (file && await existsFile(file)) selected.push(file);
    }
  }

  return Array.from(new Set(selected)).sort((a, b) => getPartNumber(a) - getPartNumber(b));
}

async function fromAiHostPrefix(currentAudio: string): Promise<string[]> {
  const prefix = getLongShowPrefix(currentAudio);
  if (!prefix) return [];

  try {
    const entries = await fs.readdir(AI_HOST_DIR, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => name.startsWith(`${prefix}-part-`) && name.toLowerCase().endsWith(".mp3"))
      .map((name) => path.join(AI_HOST_DIR, name))
      .sort((a, b) => getPartNumber(a) - getPartNumber(b));

    const existing: string[] = [];
    for (const file of files) {
      if (await existsFile(file)) existing.push(file);
    }
    return existing;
  } catch {
    return [];
  }
}

async function selectCurrentBroadcastFiles(current: AnyObj): Promise<{ reason: string; files: string[]; currentAudio: string }> {
  const currentAudio = String(
    current.audioUrl ||
      current.streamUrl ||
      current.listen_url ||
      current.cleanAudioUrl ||
      current.track?.audioUrl ||
      current.track?.streamUrl ||
      current.track?.listen_url ||
      ""
  );

  const manifestFiles = await fromLongShowManifest(current);
  if (manifestFiles.length > 0) {
    return { reason: "CURRENT_LONG_SHOW_MANIFEST", files: manifestFiles, currentAudio };
  }

  const prefixFiles = await fromAiHostPrefix(currentAudio);
  if (prefixFiles.length > 0) {
    return { reason: "CURRENT_LONG_SHOW_PREFIX", files: prefixFiles, currentAudio };
  }

  const direct = safePublicAudioPath(currentAudio);
  if (direct && await existsFile(direct)) {
    return { reason: "CURRENT_DIRECT_AUDIO", files: [direct], currentAudio };
  }

  return { reason: "CURRENT_AUDIO_NOT_FOUND_NO_FALLBACK", files: [], currentAudio };
}

async function writeDebug(payload: AnyObj) {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DEBUG_FILE, JSON.stringify(payload, null, 2));
  } catch {
    // ignore debug write failure
  }
}

async function* fileChunks(files: string[]) {
  for (const file of files) {
    const stream = createReadStream(file);
    for await (const chunk of stream) {
      if (typeof chunk === "string") {
        yield Buffer.from(chunk);
      } else {
        yield chunk;
      }
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
    await writeDebug({
      at: new Date().toISOString(),
      method: req.method,
      ok: false,
      reason: "NO_CURRENT_BROADCAST_FILE",
    });

    return new Response("No owner current broadcast.", {
      status: 404,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  const selected = await selectCurrentBroadcastFiles(current);

  await writeDebug({
    at: new Date().toISOString(),
    method: req.method,
    ok: selected.files.length > 0,
    reason: selected.reason,
    currentAudio: selected.currentAudio,
    programId: current.programId || current.track?.programId || null,
    programName: current.programName || current.track?.programName || null,
    fileCount: selected.files.length,
    files: selected.files.map((file) => path.basename(file)),
  });

  if (selected.files.length < 1) {
    return new Response("Owner current broadcast audio was not found. No old AI/Nia fallback was used.", {
      status: 404,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Tha-Core-Current-Broadcast": "true",
        "X-Tha-Core-No-Old-Fallback": "true",
        "X-Tha-Core-Reason": selected.reason,
      },
    });
  }

  const headers = {
    "Content-Type": "audio/mpeg",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Tha-Core-Current-Broadcast": "true",
    "X-Tha-Core-No-Old-Fallback": "true",
    "X-Tha-Core-Continuous-Chain": selected.files.length > 1 ? "true" : "false",
    "X-Tha-Core-Chain-Count": String(selected.files.length),
    "X-Tha-Core-Chain-Reason": selected.reason,
  };

  if (req.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }

  return new Response(iteratorToStream(fileChunks(selected.files)), {
    status: 200,
    headers,
  });
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function HEAD(req: NextRequest) {
  return handle(req);
}
