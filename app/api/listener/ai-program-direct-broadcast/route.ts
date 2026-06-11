import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DirectBroadcastBody = {
  programId?: string;
  programName?: string;
  title?: string;
  artist?: string;
  forceAnyAiAudio?: boolean;
};

const ROOT = process.cwd();
const AUDIO_EXTS = new Set([".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"]);

function slugify(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function walkFiles(dir: string, out: string[] = [], max = 8000): string[] {
  if (out.length >= max) return out;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (out.length >= max) break;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
        walkFiles(full, out, max);
      } else if (entry.isFile() && AUDIO_EXTS.has(path.extname(entry.name).toLowerCase())) {
        out.push(full);
      }
    }
  } catch {}
  return out;
}

function programNeedles(programId: string, programName: string): string[] {
  const needles = new Set<string>();

  const idSlug = slugify(programId);
  const nameSlug = slugify(programName);

  if (idSlug) needles.add(idSlug);
  if (nameSlug) needles.add(nameSlug);

  const longShowPrefix = idSlug.match(/^(.*?)-20\d{12}/)?.[1];
  if (longShowPrefix) needles.add(longShowPrefix);

  if (idSlug.includes("night-talk-show")) needles.add("long-show-night-talk-show");
  if (nameSlug.includes("late-night")) needles.add("long-show-night-talk-show");
  if (nameSlug.includes("late-night")) needles.add("late-night");

  return [...needles].filter(Boolean);
}

function findPlayableAudio(programId: string, programName: string, forceAnyAiAudio: boolean) {
  const roots = [
    ".data/ai-host-audio",
    ".data/ai-host-long-show-voice-packages",
    ".data/ai-host-programs",
    ".data/ai-host-cohost-show-feeder",
    ".data/ai-host-long-show-scripts",
    "public/audio/ai-hosts",
    "public/audio/programs",
    "public/audio/ai-direct",
    "public/audio"
  ].map((p) => path.join(ROOT, p));

  const needles = programNeedles(programId, programName);
  const allFiles = roots.flatMap((root) => walkFiles(root));

  const scored = allFiles
    .map((file) => {
      const base = path.basename(file);
      const hay = slugify(base + " " + file.replace(ROOT, ""));
      const stat = fs.statSync(file);
      const matched = needles.some((needle) => hay.includes(needle));

      let score = 0;
      if (matched) score += 1000;
      if (hay.includes("long-show")) score += 50;
      if (hay.includes("ai-host")) score += 50;
      if (hay.includes("part-")) score += 20;
      score += Math.min(100, Math.floor(stat.size / 100000));

      return { file, base, size: stat.size, matched, score };
    })
    .filter((x) => x.size > 1000)
    .filter((x) => x.matched || forceAnyAiAudio)
    .sort((a, b) => b.score - a.score || a.base.localeCompare(b.base));

  return scored[0] || null;
}

function writeCurrentBroadcast(payload: Record<string, unknown>) {
  const dataDir = path.join(ROOT, ".data");
  fs.mkdirSync(dataDir, { recursive: true });

  const currentPath = path.join(dataDir, "current-broadcast.json");
  const directStatePath = path.join(dataDir, "direct-ai-broadcast-state.json");

  fs.writeFileSync(currentPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(directStatePath, JSON.stringify(payload, null, 2));
}

async function readBody(req: NextRequest): Promise<DirectBroadcastBody> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  const internalKey = req.headers.get("x-tha-core-internal-broadcast");
  if (internalKey !== "DIRECT_AI_PROGRAM") {
    return NextResponse.json(
      { ok: false, status: "INTERNAL_BROADCAST_HEADER_REQUIRED" },
      { status: 403 }
    );
  }
  const body = await readBody(req);

  const programId = String(body.programId || "");
  const programName = String(body.programName || "AI Program");
  const title = String(body.title || programName || "AI Program Direct Broadcast");
  const artist = String(body.artist || "Tha Core AI Host");
  const forceAnyAiAudio = Boolean(body.forceAnyAiAudio);

  const playable = findPlayableAudio(programId, programName, forceAnyAiAudio);

  if (!playable) {
    const state = {
      ok: false,
      status: "NO_PLAYABLE_AI_AUDIO",
      source: "AI_HOST_LONG_SHOW",
      programId,
      programName,
      title,
      artist,
      smartZJRequired: false,
      smartZJUsed: false,
      message:
        "No playable AI program audio file was found. Direct broadcast did not publish fake metadata."
    };

    writeCurrentBroadcast({
      ...state,
      mode: "CURRENT_BROADCAST",
      safety: "NO_FAKE_AUDIO_METADATA",
      audioUrl: "",
      streamUrl: "",
      listen_url: "",
      is_online: false,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json(state, { status: 404 });
  }

  const directDir = path.join(ROOT, ".data", "ai-host-audio");
  fs.mkdirSync(directDir, { recursive: true });

  const safeBase = playable.base.replace(/[^a-zA-Z0-9._-]/g, "_");
  const directPath = path.join(directDir, safeBase);
  fs.copyFileSync(playable.file, directPath);

  const audioUrl = `/api/listener/ai-host-audio?file=${encodeURIComponent(safeBase)}`;
  const now = new Date().toISOString();

  const currentBroadcast = {
    ok: true,
    status: "AI_HOST_LONG_SHOW_BROADCASTING",
    mode: "CURRENT_BROADCAST",
    safety: "DIRECT_AI_PLAYABLE_AUDIO_CONFIRMED",
    source: "AI_HOST_LONG_SHOW",
    type: "AI_HOST_LONG_SHOW",
    programId,
    programName,
    title,
    artist,
    audioUrl,
    streamUrl: audioUrl,
    listen_url: audioUrl,
    cleanAudioUrl: audioUrl,
    protectedBroadcast: true,
    smartZJRequired: false,
    smartZJUsed: false,
    rawAzuraBlocked: true,
    startedAt: now,
    updatedAt: now,
    selectedAudioFile: playable.file.replace(ROOT, ""),
    selectedAudioBytes: playable.size,
    message:
      "AI program is broadcasting directly through Tha Core. SmartZJ is not required."
  };

  writeCurrentBroadcast(currentBroadcast);

  return NextResponse.json({
    ok: true,
    route: "/api/listener/ai-program-direct-broadcast",
    action: "AI_PROGRAM_DIRECT_BROADCAST",
    currentBroadcast
  });
}

export async function GET() {
  try {
    const p = path.join(ROOT, ".data", "direct-ai-broadcast-state.json");
    return NextResponse.json(JSON.parse(fs.readFileSync(p, "utf8")));
  } catch {
    return NextResponse.json({
      ok: false,
      status: "NO_DIRECT_AI_BROADCAST_STATE"
    });
  }
}

