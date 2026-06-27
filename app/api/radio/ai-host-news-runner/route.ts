import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { join } from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const NEWS_RUNNER_DIR = join(DATA_DIR, "nia-news-production");
const VERIFIED_ITEMS_FILE = join(NEWS_RUNNER_DIR, "confirmed-news-items.json");
const LAST_RUN_FILE = join(NEWS_RUNNER_DIR, "last-run.json");

const PROGRAM_DIR = join(DATA_DIR, "ai-host-programs");
const PUBLIC_AI_HOST_DIR = join(process.cwd(), "public", "audio", "ai-host");
const PUBLIC_NEWS_DROPS_DIR = join(process.cwd(), "public", "drops", "news");

const NEWS_ALERT_INTRO_JINGLE_PATH = join(PUBLIC_NEWS_DROPS_DIR, "tha_core_news_alert_intro_jingle_v1.mp3");
const NEWS_ALERT_OUTRO_JINGLE_PATH = join(PUBLIC_NEWS_DROPS_DIR, "tha_core_news_alert_outro_jingle_v1.mp3");

const INTERNAL_BASE_URL = `http://127.0.0.1:${process.env.PORT || "3101"}`;

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value: unknown, fallback = "", max = 5000) {
  return String(value ?? fallback)
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function cleanOneLine(value: unknown, fallback = "", max = 1000) {
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function jamaicaDateTimeLabel() {
  return new Intl.DateTimeFormat("en-JM", {
    timeZone: "America/Jamaica",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date());
}

function slugify(value: string) {
  return cleanOneLine(value, "nia-news", 160)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "nia-news";
}

function blockTypeForSlot(programSlot: string) {
  const slot = programSlot.toLowerCase();
  if (slot.includes("6")) return "morning-news";
  if (slot.includes("10")) return "morning-update";
  if (slot.includes("1")) return "midday-news";
  if (slot.includes("3")) return "afternoon-update";
  if (slot.includes("5:30") || slot.includes("drive")) return "drive-time-recap";
  if (slot.includes("8") || slot.includes("wrap")) return "evening-wrap";
  return "scheduled-news";
}

function normalizeItem(item: AnyRecord, index: number) {
  return {
    id: cleanOneLine(item.id || item.guid || `local-news-${index + 1}`, "", 240),
    category: cleanOneLine(item.category || item.newsCategory || item.section || "news", "news", 120),
    headline: cleanOneLine(item.headline || item.title || "", "", 500),
    summary: cleanOneLine(item.summary || item.description || item.body || item.content || "", "", 2000),
    sourceName: cleanOneLine(item.sourceName || item.source || item.publisher || "verified source", "verified source", 200),
    sourceUrl: cleanOneLine(item.sourceUrl || item.url || "", "", 1000),
    publishedAt: cleanOneLine(item.publishedAt || item.date || item.pubDate || "", "", 120),
  };
}

function unwrapNewsItems(value: unknown): AnyRecord[] {
  if (Array.isArray(value)) return value.filter(Boolean) as AnyRecord[];

  if (!value || typeof value !== "object") return [];

  const obj = value as AnyRecord;

  for (const key of ["items", "newsItems", "confirmedItems", "stories", "articles", "results", "records", "data"]) {
    if (Array.isArray(obj[key])) return obj[key].filter(Boolean) as AnyRecord[];
  }

  if (obj.headline || obj.title || obj.summary || obj.description || obj.body) {
    return [obj];
  }

  return [];
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(join(filePath, ".."), { recursive: true }).catch(async () => {
    await mkdir(DATA_DIR, { recursive: true });
  });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function getMp3DurationSeconds(filePath: string) {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", filePath],
      { encoding: "utf8" }
    ).trim();

    const seconds = Number(out);
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);
  } catch {}

  return 0;
}

function localPiperExePath() {
  const root = process.cwd();
  return process.platform === "win32"
    ? join(root, ".venv-voice", "Scripts", "piper.exe")
    : join(root, ".venv-voice", "bin", "piper");
}

function localPiperModelPath() {
  const root = process.cwd();
  const preferred = join(root, "voices", "en_US-amy-medium.onnx");
  const fallback = join(root, "voices", "en_US-lessac-medium.onnx");

  if (existsSync(preferred) && existsSync(preferred + ".json")) return preferred;
  return fallback;
}

function assertLocalToolsReady() {
  const missing: string[] = [];

  const piperExe = localPiperExePath();
  const modelPath = localPiperModelPath();

  if (!existsSync(piperExe)) missing.push(piperExe);
  if (!existsSync(modelPath)) missing.push(modelPath);
  if (!existsSync(modelPath + ".json")) missing.push(modelPath + ".json");
  if (!existsSync(NEWS_ALERT_INTRO_JINGLE_PATH)) missing.push(NEWS_ALERT_INTRO_JINGLE_PATH);
  if (!existsSync(NEWS_ALERT_OUTRO_JINGLE_PATH)) missing.push(NEWS_ALERT_OUTRO_JINGLE_PATH);

  if (missing.length) {
    const error = new Error("THA_CORE_LOCAL_TOOLS_MISSING: " + missing.join(" | "));
    (error as any).missing = missing;
    throw error;
  }

  return { piperExe, modelPath };
}

function splitForPiper(script: string) {
  const paragraphs = cleanText(script, "", 50000)
    .split(/\n\s*\n|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((part) => cleanOneLine(part, "", 1600))
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    if ((current + " " + paragraph).length <= 1100) {
      current += " " + paragraph;
    } else {
      chunks.push(current);
      current = paragraph;
    }
  }

  if (current) chunks.push(current);

  return chunks.filter((chunk) => chunk.length >= 10).slice(0, 24);
}

function speakWithLocalPiper(inputText: string, outputMp3Path: string) {
  const ready = assertLocalToolsReady();

  const safeText = cleanText(inputText, "", 4000)
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, " - ")
    .replace(/…/g, "...");

  if (!safeText) throw new Error("LOCAL_PIPER_TEXT_EMPTY");

  const wavPath = outputMp3Path.replace(/\.mp3$/i, ".wav");

  execFileSync(
    ready.piperExe,
    ["--model", ready.modelPath, "--output_file", wavPath],
    {
      cwd: process.cwd(),
      input: safeText,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["pipe", "ignore", "pipe"],
    }
  );

  execFileSync(
    "ffmpeg",
    ["-y", "-i", wavPath, "-codec:a", "libmp3lame", "-b:a", "192k", outputMp3Path],
    { stdio: "ignore" }
  );

  try { unlinkSync(wavPath); } catch {}
}

function concatListLine(filePath: string) {
  const safe = String(filePath || "").replace(/\\/g, "/").replace(/'/g, "");
  return "file '" + safe + "'";
}

function concatMp3Files(inputPaths: string[], outputPath: string) {
  // THA_CORE_NIA_NEWS_FORCE_REENCODE_JOIN_V1
  // Always re-encode the final Nia news package.
  // MP3 copy-concat can pass ffprobe but fail browser playback after the first jingle.
  const listPath = join(PUBLIC_AI_HOST_DIR, "nia-news-local-concat-" + Date.now() + "-" + crypto.randomUUID().slice(0, 8) + ".txt");

  writeFileSync(listPath, inputPaths.map(concatListLine).join("\n"), "utf8");

  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", listPath,
        "-vn",
        "-ac", "2",
        "-ar", "44100",
        "-codec:a", "libmp3lame",
        "-b:a", "192k",
        outputPath
      ],
      { stdio: "ignore" }
    );
  } finally {
    try { unlinkSync(listPath); } catch {}
  }

  return getMp3DurationSeconds(outputPath);
}

function buildLocalNiaScript(input: {
  programName: string;
  programSlot: string;
  items: AnyRecord[];
  weatherText: string;
  late: boolean;
}) {
  const timeText = jamaicaDateTimeLabel();

  const opening = input.late
    ? `You’re tuned in to Tha Core Online Radio. I’m Nia, and this is a late catch-up Tha Core News Update for ${timeText}. Apologies for the delay, family — let’s get you caught up clean and clear.`
    : `You’re tuned in to Tha Core Online Radio. I’m Nia, and this is your Tha Core News Update for ${timeText}.`;

  const intro = [
    opening,
    "Here are the confirmed updates we are carrying right now. No rumours, no guesswork — just the verified stories available to Tha Core."
  ];

  const usableItems = input.items
    .map(normalizeItem)
    .filter((item) => item.headline || item.summary)
    .slice(0, 12);

  const storyBlocks = usableItems.length
    ? usableItems.map((item, index) => {
        const headline = item.headline || "Confirmed update";
        const summary = item.summary || "Details are still limited, so we are keeping this one brief and clean.";
        const sourceName = item.sourceName || "verified source";

        return [
          `Story ${index + 1} — ${item.category}.`,
          `${headline}.`,
          summary,
          `That update is from ${sourceName}.`
        ].join(" ");
      })
    : [
        "No fresh confirmed public news item was supplied for this local test run, so Nia is keeping this as a safe station news-system check instead of inventing headlines."
      ];

  const weatherLine = input.weatherText
    ? `Weather note: ${input.weatherText}`
    : "Weather note: We will have the full weather and sports update in the next bulletin.";

  const recapItems = usableItems.slice(0, 5).map((item, index) => {
    return `${index + 1}. ${item.headline || "confirmed update"}`;
  });

  const recap = [
    "Before we go, here’s the quick recap.",
    recapItems.length ? recapItems.join(" ") : "The main update is that Tha Core has carried a safe local Nia news-system check without inventing headlines.",
    "That’s your Tha Core News Update. I’m Nia. Keep it locked to Tha Core Online Radio."
  ].join(" ");

  return cleanText([...intro, ...storyBlocks, weatherLine, recap].join("\n\n"), "", 50000);
}

async function postJson(path: string, body: AnyRecord) {
  try {
    const res = await fetch(`${INTERNAL_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    return {
      ok: res.ok,
      status: res.status,
      data,
    };
  } catch (error: any) {
    return {
      ok: false,
      status: 0,
      data: { error: error?.message || "REQUEST_FAILED" },
    };
  }
}

async function buildLocalNewsPackage(input: {
  programName: string;
  programSlot: string;
  blockType: string;
  script: string;
}) {
  assertLocalToolsReady();

  await mkdir(PUBLIC_AI_HOST_DIR, { recursive: true });
  await mkdir(PROGRAM_DIR, { recursive: true });

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const programId = `${slugify(input.programSlot)}-${slugify(input.programName)}-${stamp}-${crypto.randomUUID().slice(0, 8)}`;

  const chunks = splitForPiper(input.script);
  if (!chunks.length) throw new Error("LOCAL_NIA_SCRIPT_HAS_NO_VOICE_CHUNKS");

  const spokenMp3Paths: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const partFileName = `nia-local-spoken-${slugify(input.programName)}-part-${String(i + 1).padStart(2, "0")}-${stamp}-${crypto.randomUUID().slice(0, 8)}.mp3`;
    const partFilePath = join(PUBLIC_AI_HOST_DIR, partFileName);
    speakWithLocalPiper(chunks[i], partFilePath);
    spokenMp3Paths.push(partFilePath);
  }

  const finalFileName = `ai-host-news-package-${slugify(input.programName)}-${stamp}-${crypto.randomUUID().slice(0, 8)}.mp3`;
  const finalFilePath = join(PUBLIC_AI_HOST_DIR, finalFileName);

  const durationSeconds = concatMp3Files(
    [NEWS_ALERT_INTRO_JINGLE_PATH, ...spokenMp3Paths, NEWS_ALERT_OUTRO_JINGLE_PATH],
    finalFilePath
  );

  const finalAudioUrl = `/api/listener/ai-host-audio?file=${encodeURIComponent(finalFileName)}`;
  const safeDuration = durationSeconds || Math.max(30, spokenMp3Paths.length * 45);

  const audioPart = {
    partNumber: 1,
    totalParts: 1,
    fileName: finalFileName,
    audioUrl: finalAudioUrl,
    storageUrl: `/audio/ai-host/${finalFileName}`,
    estimatedSeconds: safeDuration,
    actualSeconds: durationSeconds,
    durationSeconds: safeDuration,
    script: input.script,
    newsAlertJoinedPackage: true,
    wrappedOriginalPartCount: spokenMp3Paths.length,
    track: {
      id: `AI-Host-NewsPackage/${programId}/part-1`,
      trackId: `AI-Host-NewsPackage/${programId}/part-1`,
      title: `${input.programName} News Package`,
      artist: "Nia from Tha Core",
      source: "AI_HOST_PROGRAM",
      genreLane: "News",
      lane: "News",
      folder: "AI-Host-News",
      audioUrl: finalAudioUrl,
      streamUrl: finalAudioUrl,
      listen_url: finalAudioUrl,
      cleanAudioUrl: finalAudioUrl,
      returnedToSmartDj: true,
      held: false,
      cleanStatus: "PROCESSED_AUDIO_READY",
      bleepJobStatus: "PROCESSED_AUDIO_READY",
      aiHost: true,
      aiGeneratedVoice: true,
      localPiperVoice: true,
      newsAlertJoinedPackage: true,
      programId,
      programName: input.programName,
      programSlot: input.programSlot,
      blockType: input.blockType,
      partNumber: 1,
      totalParts: 1,
      estimatedSeconds: safeDuration,
      durationSeconds: safeDuration,
      fullProgramBlock: true,
    },
  };

  const manifest = {
    ok: true,
    phase: "THA_CORE_LOCAL_ONLY_NIA_NEWS_RUNNER_V1",
    programId,
    hostName: "Nia from Tha Core",
    programName: input.programName,
    programSlot: input.programSlot,
    blockType: input.blockType,
    model: "tha-core-local-piper",
    voice: "amy",
    partCount: 1,
    totalEstimatedSeconds: safeDuration,
    totalEstimatedMinutes: Math.round((safeDuration / 60) * 10) / 10,
    audioParts: [audioPart],
    newsJinglePackage: {
      ok: true,
      marker: "THA_CORE_LOCAL_ONLY_NIA_NEWS_JINGLE_PACKAGE_V1",
      introJingle: NEWS_ALERT_INTRO_JINGLE_PATH,
      outroJingle: NEWS_ALERT_OUTRO_JINGLE_PATH,
      originalSpokenPartCount: spokenMp3Paths.length,
      finalFileName,
      finalAudioUrl,
      actualJoinedSeconds: durationSeconds,
      durationSeconds: safeDuration,
    },
    createdAt: now.toISOString(),
    broadcastEnabled: false,
    nextStep: "Use program broadcast route to play this local Nia package.",
  };

  await writeFile(join(PROGRAM_DIR, `${programId}.json`), JSON.stringify(manifest, null, 2), "utf8");

  return manifest;
}

export async function GET() {
  const items = await readJson<unknown>(VERIFIED_ITEMS_FILE, []);
  const storedItems = unwrapNewsItems(items).map(normalizeItem).filter((item) => item.headline || item.summary);

  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-news-runner",
    phase: "THA_CORE_LOCAL_ONLY_NIA_NEWS_RUNNER_V1",
    purpose: "Local-only Nia news script, local Piper voice, intro/outro jingle joined package.",
    confirmedItemCount: storedItems.length,
    localPiperExe: localPiperExePath(),
    localPiperModel: localPiperModelPath(),
    introJingleExists: existsSync(NEWS_ALERT_INTRO_JINGLE_PATH),
    outroJingleExists: existsSync(NEWS_ALERT_OUTRO_JINGLE_PATH),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const action = cleanOneLine(body.action || "run", "run", 80);
    const programSlot = cleanOneLine(body.programSlot || "3:00 PM", "3:00 PM", 80);
    const programName = cleanOneLine(body.programName || `Tha Core ${programSlot} Jamaica News`, `Tha Core ${programSlot} Jamaica News`, 180);
    const blockType = cleanOneLine(body.blockType || blockTypeForSlot(programSlot), blockTypeForSlot(programSlot), 120);

    await mkdir(NEWS_RUNNER_DIR, { recursive: true });
    await mkdir(PROGRAM_DIR, { recursive: true });

    if (action === "save-items") {
      const rawItems = unwrapNewsItems(
        body.items || body.newsItems || body.confirmedItems || body.stories || body.articles || body.results || body.records || body.payload || body.data
      );

      const normalized = rawItems.map(normalizeItem).filter((item) => item.headline || item.summary);
      await writeFile(VERIFIED_ITEMS_FILE, JSON.stringify(normalized, null, 2), "utf8");

      return NextResponse.json({
        ok: true,
        phase: "THA_CORE_LOCAL_ONLY_NIA_NEWS_RUNNER_V1",
        action: "save-items",
        savedItemCount: normalized.length,
        file: VERIFIED_ITEMS_FILE,
      });
    }

    const storedRawItems = await readJson<unknown>(VERIFIED_ITEMS_FILE, []);
    const suppliedItems = unwrapNewsItems(
      body.items || body.newsItems || body.confirmedItems || body.stories || body.articles || body.results || body.records || body.payload || body.data
    );

    const items = (suppliedItems.length ? suppliedItems : unwrapNewsItems(storedRawItems))
      .map(normalizeItem)
      .filter((item) => item.headline || item.summary);

    const weatherText = cleanText(body.weatherText || "", "", 800);
    const late = Boolean(
      body.late === true ||
      body.catchup === true ||
      body.catchUp === true ||
      String(body.source || "").toLowerCase().includes("catchup") ||
      String(body.source || "").toLowerCase().includes("missed")
    );

    const script = buildLocalNiaScript({
      programName,
      programSlot,
      items,
      weatherText,
      late,
    });

    const manifest = await buildLocalNewsPackage({
      programName,
      programSlot,
      blockType,
      script,
    });

    const shouldStartBroadcast =
      body.broadcast === true ||
      body.broadcastNow === true ||
      action === "run-and-broadcast";

    let broadcast: AnyRecord | null = null;

    if (shouldStartBroadcast) {
      broadcast = await postJson("/api/radio/ai-host-program-broadcast", {
        action: "start",
        programId: manifest.programId,
        reason: `THA_CORE_LOCAL_NIA_NEWS_${blockType.toUpperCase()}`,
        broadcast: true,
        force: true,
      });
    }

    const lastRun = {
      ok: true,
      phase: "THA_CORE_LOCAL_ONLY_NIA_NEWS_RUNNER_V1",
      action,
      programName,
      programSlot,
      blockType,
      itemCount: items.length,
      scriptLength: script.length,
      programId: manifest.programId,
      partCount: manifest.partCount,
      totalEstimatedSeconds: manifest.totalEstimatedSeconds,
      newsJinglePackage: manifest.newsJinglePackage,
      broadcastStarted: Boolean(broadcast?.ok),
      broadcastRequired: shouldStartBroadcast,
      broadcastError: shouldStartBroadcast && !broadcast?.ok ? broadcast?.data?.error || "BROADCAST_START_FAILED" : null,
      createdAt: nowIso(),
    };

    await writeFile(LAST_RUN_FILE, JSON.stringify(lastRun, null, 2), "utf8");

    return NextResponse.json({
      ...lastRun,
      safety: "THA_CORE_LOCAL_NIA_NEWS_READY",
      voice: {
        programId: manifest.programId,
        partCount: manifest.partCount,
        totalEstimatedSeconds: manifest.totalEstimatedSeconds,
        firstAudioUrl: manifest.audioParts?.[0]?.audioUrl || null,
      },
      broadcast,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        phase: "THA_CORE_LOCAL_ONLY_NIA_NEWS_RUNNER_V1",
        error: "THA_CORE_LOCAL_NIA_NEWS_RUNNER_ERROR",
        message: error?.message || String(error),
        missing: error?.missing || undefined,
      },
      { status: 500 }
    );
  }
}
