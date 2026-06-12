import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyObj = Record<string, any>;

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".data");
const CURRENT_PATH = path.join(DATA_DIR, "current-broadcast.json");
const DEBUG_PATH = path.join(DATA_DIR, "live-current-audio-debug.json");
const PROGRAM_DIR = path.join(DATA_DIR, "ai-host-long-show-programs");
const PUBLIC_DIR = path.join(ROOT, "public");

function readJson(filePath: string): AnyObj | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeDebug(payload: AnyObj) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(
      DEBUG_PATH,
      JSON.stringify(
        {
          at: new Date().toISOString(),
          ...payload,
        },
        null,
        2
      )
    );
  } catch {}
}

function insidePublic(filePath: string): boolean {
  const publicRoot = path.resolve(PUBLIC_DIR);
  const target = path.resolve(filePath);
  return target === publicRoot || target.startsWith(publicRoot + path.sep);
}

function normalizeAudioPath(raw: unknown): string {
  const value = String(raw || "").trim();
  if (!value) return "";

  try {
    if (value.startsWith("http://") || value.startsWith("https://")) {
      const parsed = new URL(value);
      return parsed.pathname;
    }
  } catch {}

  return value.split("?")[0].trim();
}

function publicAudioFile(raw: unknown): string | null {
  const audioPath = normalizeAudioPath(raw);

  if (!audioPath.startsWith("/audio/")) return null;
  if (audioPath.includes("/api/listener/live-current-audio")) return null;

  const filePath = path.join(PUBLIC_DIR, audioPath.replace(/^\/+/, ""));

  if (!insidePublic(filePath)) return null;
  if (!fs.existsSync(filePath)) return null;

  const stat = fs.statSync(filePath);
  if (!stat.isFile() || stat.size <= 0) return null;

  return filePath;
}

function uniqueFiles(files: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const file of files) {
    if (!file) continue;
    const full = path.resolve(file);
    if (seen.has(full)) continue;
    if (!fs.existsSync(full)) continue;
    seen.add(full);
    out.push(full);
  }

  return out;
}

function listManifestFiles(): string[] {
  if (!fs.existsSync(PROGRAM_DIR)) return [];

  return fs
    .readdirSync(PROGRAM_DIR)
    .filter((name) => name.toLowerCase().endsWith(".json"))
    .map((name) => path.join(PROGRAM_DIR, name))
    .filter((file) => fs.existsSync(file))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

function audioParts(manifest: AnyObj | null): AnyObj[] {
  if (!manifest) return [];

  const parts = Array.isArray(manifest.audioParts)
    ? manifest.audioParts
    : Array.isArray(manifest.parts)
      ? manifest.parts
      : [];

  return parts
    .filter((part: AnyObj) => part && (part.audioUrl || part.storageUrl))
    .sort((a: AnyObj, b: AnyObj) => Number(a.partNumber || 0) - Number(b.partNumber || 0));
}

function findMatchingManifest(current: AnyObj): AnyObj | null {
  const currentAudio = normalizeAudioPath(current.audioUrl || current.streamUrl || current.listen_url);
  const currentProgramId = String(current.programId || "");
  const currentProgramName = String(current.programName || current.showName || current.playlist || "").toLowerCase();

  for (const file of listManifestFiles()) {
    const manifest = readJson(file);
    if (!manifest) continue;

    const manifestId = String(manifest.programId || "");
    const manifestName = String(manifest.showName || manifest.programName || "").toLowerCase();

    const parts = audioParts(manifest);
    const hasCurrentAudio = parts.some((part) => {
      const partAudio = normalizeAudioPath(part.audioUrl || part.storageUrl);
      return currentAudio && partAudio === currentAudio;
    });

    if (
      (currentProgramId && manifestId === currentProgramId) ||
      (currentProgramName && manifestName === currentProgramName) ||
      hasCurrentAudio
    ) {
      return manifest;
    }
  }

  return null;
}

function collectMp3Files(dirPath: string, max = 40): string[] {
  const found: string[] = [];

  function walk(folder: string) {
    if (!fs.existsSync(folder)) return;

    for (const item of fs.readdirSync(folder)) {
      const full = path.join(folder, item);
      let stat: fs.Stats;

      try {
        stat = fs.statSync(full);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(full);
        continue;
      }

      if (
        stat.isFile() &&
        stat.size > 0 &&
        full.toLowerCase().endsWith(".mp3") &&
        insidePublic(full)
      ) {
        found.push(full);
      }
    }
  }

  walk(dirPath);

  return found
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
    .slice(0, max);
}

function buildSequence(current: AnyObj): { files: string[]; reason: string; currentAudio: string } {
  const currentAudio = normalizeAudioPath(current.audioUrl || current.streamUrl || current.listen_url);

  const directCurrent = publicAudioFile(currentAudio);

  const manifest = findMatchingManifest(current);
  const manifestParts = audioParts(manifest);

  const manifestFiles = manifestParts.map((part) => publicAudioFile(part.audioUrl || part.storageUrl));
  const currentIndex = manifestParts.findIndex((part) => {
    const partAudio = normalizeAudioPath(part.audioUrl || part.storageUrl);
    return currentAudio && partAudio === currentAudio;
  });

  if (manifestFiles.some(Boolean)) {
    const validParts = manifestParts
      .map((part) => ({
        part,
        file: publicAudioFile(part.audioUrl || part.storageUrl),
      }))
      .filter((x) => x.file);

    const start = currentIndex >= 0 ? currentIndex : 0;
    const ordered = [
      ...validParts.slice(start),
      ...validParts.slice(0, start),
    ].map((x) => x.file);

    return {
      files: uniqueFiles([directCurrent, ...ordered]),
      reason: "MATCHED_LONG_SHOW_MANIFEST",
      currentAudio,
    };
  }

  if (directCurrent) {
    const aiHostFallback = collectMp3Files(path.join(PUBLIC_DIR, "audio", "ai-host"), 30);
    return {
      files: uniqueFiles([directCurrent, ...aiHostFallback]),
      reason: "DIRECT_CURRENT_PLUS_AI_HOST_FALLBACK",
      currentAudio,
    };
  }

  const latestManifest: AnyObj | null =
    listManifestFiles()
      .map((file) => readJson(file))
      .find((item): item is AnyObj => Boolean(item && audioParts(item).length > 0)) || null;

  const latestManifestFiles = audioParts(latestManifest).map((part) =>
    publicAudioFile(part.audioUrl || part.storageUrl)
  );

  if (latestManifestFiles.some(Boolean)) {
    return {
      files: uniqueFiles(latestManifestFiles),
      reason: "LATEST_LONG_SHOW_MANIFEST_FALLBACK",
      currentAudio,
    };
  }

  const aiHostOnly = collectMp3Files(path.join(PUBLIC_DIR, "audio", "ai-host"), 40);

  return {
    files: uniqueFiles(aiHostOnly),
    reason: "AI_HOST_FOLDER_FALLBACK",
    currentAudio,
  };
}

function responseHeaders(files: string[], reason: string): HeadersInit {
  return {
    "Content-Type": "audio/mpeg",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "X-Tha-Core-Current-Broadcast": "true",
    "X-Tha-Core-Continuous-Chain": "true",
    "X-Tha-Core-Chain-Count": String(files.length),
    "X-Tha-Core-Chain-Reason": reason,
  };
}

export async function HEAD() {
  const current = readJson(CURRENT_PATH) || {};
  const sequence = buildSequence(current);

  writeDebug({
    method: "HEAD",
    ok: sequence.files.length > 0,
    reason: sequence.reason,
    currentAudio: sequence.currentAudio,
    fileCount: sequence.files.length,
    files: sequence.files.map((file) => path.basename(file)),
  });

  if (!sequence.files.length) {
    return new Response(null, {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "X-Tha-Core-Chain-Reason": sequence.reason,
        "X-Tha-Core-Chain-Count": "0",
      },
    });
  }

  return new Response(null, {
    status: 200,
    headers: responseHeaders(sequence.files, sequence.reason),
  });
}

export async function GET() {
  const current = readJson(CURRENT_PATH) || {};
  const sequence = buildSequence(current);

  writeDebug({
    method: "GET",
    ok: sequence.files.length > 0,
    reason: sequence.reason,
    currentTitle: current.title || "",
    currentProgram: current.programName || current.showName || current.playlist || "",
    currentAudio: sequence.currentAudio,
    fileCount: sequence.files.length,
    files: sequence.files.map((file) => path.basename(file)),
  });

  if (!sequence.files.length) {
    return Response.json(
      {
        ok: false,
        error: "NO_PLAYABLE_APPROVED_AUDIO_FOUND",
        reason: sequence.reason,
        currentTitle: current.title || "",
        currentAudio: sequence.currentAudio,
      },
      { status: 404 }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (let cycle = 0; cycle < 50; cycle += 1) {
          for (const filePath of sequence.files) {
            const bytes = await fs.promises.readFile(filePath);
            controller.enqueue(new Uint8Array(bytes));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: responseHeaders(sequence.files, sequence.reason),
  });
}

