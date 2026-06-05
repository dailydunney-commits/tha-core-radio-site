import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

type AnyRecord = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const NEWS_RUNNER_DIR = join(DATA_DIR, "nia-news-runner");
const VERIFIED_ITEMS_FILE = join(NEWS_RUNNER_DIR, "verified-news-items.json");
const LAST_RUN_FILE = join(NEWS_RUNNER_DIR, "last-run.json");

const INTERNAL_BASE_URL = `http://127.0.0.1:${process.env.PORT || "3101"}`;

function nowIso() {
  return new Date().toISOString();
}

function cleanText(value: unknown, fallback = "", max = 5000) {
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function jamaicaTimeParts() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Jamaica",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatToParts(new Date());

  const pick = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return {
    weekday: pick("weekday"),
    month: pick("month"),
    day: pick("day"),
    year: pick("year"),
    hour: pick("hour"),
    minute: pick("minute"),
    dayPeriod: pick("dayPeriod"),
  };
}

function defaultTimeLabel() {
  const t = jamaicaTimeParts();
  return `${t.weekday}, ${t.month} ${t.day}, ${t.year}, ${t.hour}:${t.minute} ${t.dayPeriod} Jamaica time`;
}

function durationForSlot(programSlot: string) {
  const slot = programSlot.toLowerCase();
  if (slot.includes("5:30") || slot.includes("drive")) return 1800;
  if (slot.includes("8") || slot.includes("wrap")) return 420;
  if (slot.includes("6") || slot.includes("morning")) return 420;
  if (slot.includes("10")) return 300;
  if (slot.includes("1") || slot.includes("3")) return 420;
  return 420;
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
    id: cleanText(item.id || item.url || item.headline || `item-${index + 1}`, `item-${index + 1}`, 300),
    category: cleanText(item.category || "jamaica", "jamaica", 80),
    headline: cleanText(item.headline || item.title || "", "", 500),
    summary: cleanText(item.summary || item.description || item.body || "", "", 2000),
    sourceName: cleanText(item.sourceName || item.source || "Verified source", "Verified source", 200),
    sourceUrl: cleanText(item.sourceUrl || item.url || "", "", 1000),
    publishedAt: cleanText(item.publishedAt || "", "", 120),
    verifiedAt: cleanText(item.verifiedAt || nowIso(), nowIso(), 120),
  };
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(await readFile(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(join(path, ".."), { recursive: true }).catch(async () => {
    await mkdir(NEWS_RUNNER_DIR, { recursive: true });
  });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

async function postJson(path: string, body: AnyRecord) {
  const res = await fetch(`${INTERNAL_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: AnyRecord;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data };
}

function pickRunnableItems(items: AnyRecord[]) {
  return items
    .map(normalizeItem)
    .filter((item) => item.headline && item.summary && item.sourceName)
    .slice(0, 12);
}

export async function GET() {
  const items = await readJson<AnyRecord[]>(VERIFIED_ITEMS_FILE, []);
  const lastRun = await readJson<AnyRecord>(LAST_RUN_FILE, {});

  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-news-runner",
    phase: "NIA_NEWS_SOURCE_RUNNER_V1",
    purpose:
      "Loads verified news items, asks Nia to generate a rundown, creates program voice chunks, and can start broadcast.",
    verifiedItemCount: Array.isArray(items) ? items.length : 0,
    runnableItemCount: pickRunnableItems(Array.isArray(items) ? items : []).length,
    lastRun,
    requiredFlow: [
      "verified items",
      "news rundown generation",
      "voice chunk generation",
      "program broadcast",
      "return to SmartZJ clean music",
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const action = cleanText(body.action || "run", "run", 80);
    const programSlot = cleanText(body.programSlot || "3:00 PM", "3:00 PM", 80);
    const programName = cleanText(
      body.programName || `Tha Core ${programSlot} Jamaica News`,
      `Tha Core ${programSlot} Jamaica News`,
      180
    );
    const blockType = cleanText(body.blockType || blockTypeForSlot(programSlot), blockTypeForSlot(programSlot), 120);
    const targetDurationSeconds = Math.max(
      180,
      Math.min(1800, Number(body.targetDurationSeconds || durationForSlot(programSlot)))
    );

    await mkdir(NEWS_RUNNER_DIR, { recursive: true });

    if (action === "save-items") {
      const rawItems = Array.isArray(body.items) ? body.items : [];
      const normalized = rawItems.map(normalizeItem).filter((item) => item.headline && item.summary);
      await writeFile(VERIFIED_ITEMS_FILE, JSON.stringify(normalized, null, 2), "utf8");

      return NextResponse.json({
        ok: true,
        phase: "NIA_NEWS_SOURCE_RUNNER_V1",
        action: "save-items",
        savedItemCount: normalized.length,
        file: VERIFIED_ITEMS_FILE,
      });
    }

    const storedItems = await readJson<AnyRecord[]>(VERIFIED_ITEMS_FILE, []);
    const suppliedItems = Array.isArray(body.items) ? body.items : [];
    const items = pickRunnableItems(suppliedItems.length ? suppliedItems : storedItems);

    if (!items.length) {
      return NextResponse.json(
        {
          ok: false,
          phase: "NIA_NEWS_SOURCE_RUNNER_V1",
          error: "NO_VERIFIED_NEWS_ITEMS",
          message:
            "Nia News Runner needs verified items before it can generate a news block. Use action save-items or send items in the request.",
        },
        { status: 422 }
      );
    }

    const timeText = cleanText(body.timeText || defaultTimeLabel(), defaultTimeLabel(), 200);
    const weatherText = cleanText(
      body.weatherText ||
        "No exact fresh forecast was supplied by the runner. Keep any weather note general unless verified weather text is provided.",
      "",
      600
    );

    const rundownBody = {
      hostName: "Nia from Tha Core",
      programName,
      programSlot,
      blockType,
      recapMode: body.recapMode ?? true,
      timeText,
      weatherText,
      includeWeather: Boolean(weatherText),
      instruction:
        "Nia is the scheduled news host for Tha Core until more AI hosts are added. Use only verified items. Cover the available categories: Jamaica/local, Caribbean, world, entertainment/culture, Dancehall, Reggae, Hip-Hop, R&B, Hollywood, Bollywood, finance/business, sports, weather, and station/community notes. Recap without repeating the same words every block. Do not invent news.",
      items,
    };

    const rundown = await postJson("/api/radio/ai-host-news-rundown", rundownBody);
    if (!rundown.ok) {
      return NextResponse.json(
        {
          ok: false,
          phase: "NIA_NEWS_SOURCE_RUNNER_V1",
          error: "RUNDOWN_GENERATION_FAILED",
          status: rundown.status,
          rundown: rundown.data,
        },
        { status: 502 }
      );
    }

    const script = cleanText(
      rundown.data.script || rundown.data.rundownScript || rundown.data.text || rundown.data.programScript || "",
      "",
      40000
    );

    if (!script || script.length < 500) {
      return NextResponse.json(
        {
          ok: false,
          phase: "NIA_NEWS_SOURCE_RUNNER_V1",
          error: "RUNDOWN_SCRIPT_EMPTY_OR_TOO_SHORT",
          scriptLength: script.length,
          rundown: rundown.data,
        },
        { status: 422 }
      );
    }

    const voiceBody = {
      programName,
      programSlot,
      blockType,
      voice: cleanText(body.voice || "nova", "nova", 40),
      brandSpeechName: "Tha Core",
      approved: true,
      targetDurationSeconds,
      minDurationSeconds: targetDurationSeconds,
      maxChunkChars: Number(body.maxChunkChars || 850),
      maxChunks: Number(body.maxChunks || 24),
      script,
    };

    const voice = await postJson("/api/radio/ai-host-program-voice", voiceBody);
    if (!voice.ok) {
      return NextResponse.json(
        {
          ok: false,
          phase: "NIA_NEWS_SOURCE_RUNNER_V1",
          error: "VOICE_GENERATION_FAILED",
          status: voice.status,
          voice: voice.data,
          scriptLength: script.length,
        },
        { status: 502 }
      );
    }

    const programId = cleanText(voice.data.programId || "", "", 240);
    if (!programId) {
      return NextResponse.json(
        {
          ok: false,
          phase: "NIA_NEWS_SOURCE_RUNNER_V1",
          error: "VOICE_PROGRAM_ID_MISSING",
          voice: voice.data,
        },
        { status: 502 }
      );
    }

    let broadcast: AnyRecord | null = null;
    if (body.broadcastNow === true || action === "run-and-broadcast") {
      broadcast = await postJson("/api/radio/ai-host-program-broadcast", {
        action: "start",
        programId,
        reason: `NIA_NEWS_RUNNER_${blockType.toUpperCase()}`,
      });
    }

    const lastRun = {
      ok: true,
      phase: "NIA_NEWS_SOURCE_RUNNER_V1",
      action,
      programName,
      programSlot,
      blockType,
      itemCount: items.length,
      targetDurationSeconds,
      scriptLength: script.length,
      programId,
      partCount: voice.data.partCount,
      totalEstimatedSeconds: voice.data.totalEstimatedSeconds,
      broadcastStarted: Boolean(broadcast?.ok),
      createdAt: nowIso(),
    };

    await writeFile(LAST_RUN_FILE, JSON.stringify(lastRun, null, 2), "utf8");

    return NextResponse.json({
      ...lastRun,
      safety: "NIA_NEWS_READY",
      rundown: {
        safety: rundown.data.safety,
        programSlot: rundown.data.programSlot,
      },
      voice: {
        programId: voice.data.programId,
        partCount: voice.data.partCount,
        totalEstimatedSeconds: voice.data.totalEstimatedSeconds,
        firstAudioUrl: voice.data.firstAudioUrl,
      },
      broadcast,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        phase: "NIA_NEWS_SOURCE_RUNNER_V1",
        error: "NIA_NEWS_SOURCE_RUNNER_ERROR",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
