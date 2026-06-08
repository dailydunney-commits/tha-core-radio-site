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

// NIA_NEWS_7_TO_15_MIN_RULE_V1
// Target length and minimum allowed length are separate.
// A slot may aim for 9, 10, or 15 minutes, but normal Nia news must not be rejected
// once it reaches the locked 7-minute minimum.
function durationForSlot(programSlot: string) {
  const slot = programSlot.toLowerCase();
  if (slot.includes("5:30") || slot.includes("drive")) return 900;
  if (slot.includes("8") || slot.includes("wrap")) return 540;
  if (slot.includes("6") || slot.includes("morning")) return 540;
  if (slot.includes("10")) return 540;
  if (slot.includes("1") || slot.includes("3")) return 540;
  return 540;
}

function minDurationForSlot(programSlot: string) {
  const slot = programSlot.toLowerCase();
  if (slot.includes("5:30") || slot.includes("drive")) return 420;
  if (slot.includes("8") || slot.includes("wrap")) return 420;
  if (slot.includes("6") || slot.includes("morning")) return 420;
  if (slot.includes("10")) return 420;
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

// NIA_NEWS_ITEM_SHAPE_NORMALIZER_V1
// One shared normalizer for every Nia news/program slot.
// Accepts arrays and common wrapped shapes so 6 AM, 10 AM, 1 PM, 3 PM,
// 5:30 PM, 8 PM, weekend programs, and future AI-host news flows do not crash on .map().
function isRecord(value: unknown): value is AnyRecord {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function unwrapNewsItems(value: unknown): AnyRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  if (!isRecord(value)) {
    return [];
  }

  const directCandidates = [
    value.items,
    value.newsItems,
    value.verifiedItems,
    value.stories,
    value.articles,
    value.results,
    value.records,
    value.payload,
    value.data,
  ];

  for (const candidate of directCandidates) {
    const unwrapped = unwrapNewsItems(candidate);
    if (unwrapped.length) return unwrapped;
  }

  if (value.headline || value.title || value.summary || value.description || value.body) {
    return [value];
  }

  const flattened = Object.values(value).flatMap((entry) => unwrapNewsItems(entry));
  return flattened.filter(isRecord);
}

function pickRunnableItems(input: unknown) {
  return unwrapNewsItems(input)
    .map(normalizeItem)
    .filter((item) => item.headline && item.summary && item.sourceName)
    .slice(0, 12);
}

export async function GET() {
  const rawItems = await readJson<unknown>(VERIFIED_ITEMS_FILE, []);
  const items = unwrapNewsItems(rawItems);
  const lastRun = await readJson<AnyRecord>(LAST_RUN_FILE, {});

  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-news-runner",
    phase: "NIA_NEWS_SOURCE_RUNNER_V1",
    purpose:
      "Loads verified news items, asks Nia to generate a rundown, creates program voice chunks, and can start broadcast.",
    verifiedItemCount: items.length,
    runnableItemCount: pickRunnableItems(items).length,
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
    const requestedTargetDurationSeconds = Math.max(
      180,
      Math.min(1800, Number(body.targetDurationSeconds || durationForSlot(programSlot)))
    );
    const minDurationSeconds = Math.max(
      420,
      Math.min(1800, Number(body.minDurationSeconds || minDurationForSlot(programSlot)))
    );
    const targetDurationSeconds = Math.max(minDurationSeconds, requestedTargetDurationSeconds);

    await mkdir(NEWS_RUNNER_DIR, { recursive: true });

    if (action === "save-items") {
      const rawItems = unwrapNewsItems(body.items || body.newsItems || body.verifiedItems || body.stories || body.articles || body.results || body.records || body.payload || body.data);
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

    const storedRawItems = await readJson<unknown>(VERIFIED_ITEMS_FILE, []);
    const suppliedItems = unwrapNewsItems(body.items || body.newsItems || body.verifiedItems || body.stories || body.articles || body.results || body.records || body.payload || body.data);
    const storedItems = unwrapNewsItems(storedRawItems);
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

    const timeText = defaultTimeLabel(); // NIA_REAL_JAMAICA_TIME_AT_VOICE_V1
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
        "NIA_BRAND_PRONUNCIATION_LOCK_V1: Always pronounce the station as Tha Core naturally, like the core with attitude. Never say Tah Core. If spelling helps, think Thuh Core, but speak it naturally as Tha Core. NIA_REAL_JAMAICA_TIME_AT_VOICE_V1: Use the supplied current Jamaica time as the live time. Do not use old script time. If unsure, say right now in Jamaica instead of giving an exact minute. NIA_FRESH_NEWS_GUARD_V1: Use only fresh verified items. Do not repeat old stories from last week as if they are new. If a story was already covered before, clearly label it as a follow-up, update, development, or continuing story. NIA_FOLLOWUP_NOT_REPEAT_RULE_V1: Repeated headline or same story angle must be framed as follow-up only. Never present repeats like fresh breaking news. NIA_WIDER_NEWS_AND_HOST_BREAK_POOL_V1: Cover Jamaica/local, Caribbean, Africa, United States, Canada, United Kingdom, Latin America, Europe, Asia, world affairs, sports, entertainment, Dancehall, Reggae, Hip-Hop, R&B, Hollywood, Bollywood, finance/business, technology, community, weather, road/life safety, music culture, and station/community notes when verified items are available. NIA_HOST_PERSONALITY_ROTATION_V1: Nia is not only a news reader. For 10-30 second drops and 60-90 second breaks, rotate quick news, upcoming news tease, social comment, money/financial tip, relationship/life advice, light clean joke, sports/entertainment comment, artist/music culture note, country/city/town big-up, world observation, and motivational advice. Keep jokes clean and short. Keep advice practical and respectful. NIA_PLACE_BIG_UPS_V1: Big up countries, cities, towns, islands, parishes, communities, diaspora places, and listeners around the world including Jamaica, Montego Bay, Kingston, St. James, Hanover, Trelawny, Portmore, Ocho Rios, Negril, Mandeville, Miami, New York, London, Toronto, Atlanta, Brooklyn, Brixton, Trinidad, Barbados, Guyana, Bahamas, Africa, UK, US, Canada, Caribbean, and worldwide listeners. Use only verified news items. Do not invent news. Recap without repeating the same words every block.",
      items,
    };

    // NIA_NEWS_AUTO_EXPAND_TO_7_MIN_V1
    // Shared fix for all Nia news/program slots using this runner.
    // Do not lower the 7-minute minimum. If the script is short, regenerate/expand it first.
    function extractRundownScript(data: AnyRecord) {
      return cleanText(
        data.script || data.rundownScript || data.text || data.programScript || "",
        "",
        40000
      );
    }

    function isShortDurationVoiceFailure(result: {
      ok: boolean;
      status: number;
      data: AnyRecord;
    }) {
      return (
        !result.ok &&
        cleanText(result.data?.error, "", 120) ===
          "SCRIPT_TOO_SHORT_FOR_TARGET_DURATION"
      );
    }

    // NIA_NEWS_DETERMINISTIC_EXPAND_FALLBACK_V1
    // Shared fallback for all Nia news/program slots.
    // If AI retry still returns a short script, expand from verified items only.
    // Do not lower the 7-minute rule and do not invent facts.
    function estimateRunnerScriptSeconds(text: string) {
      const words = text.trim().split(/\s+/).filter(Boolean).length;
      return Math.max(8, Math.round((words / 145) * 60));
    }

    function buildVerifiedExpansionFallback(baseScript: string, minimumSeconds: number) {
      let expanded = cleanText(baseScript, "", 40000);
      const targetSeconds = Math.max(minimumSeconds + 30, 450);

      if (estimateRunnerScriptSeconds(expanded) >= targetSeconds) {
        return expanded;
      }

      const expansionHeader = [
        "",
        "Nia extended context and recap:",
        `This is ${programName} for ${programSlot}.`,
        "Before we close, here is the fuller context from the verified stories we are already carrying.",
        "No unverified claims are being added. This is a careful expansion of the same verified news pool."
      ].join(" ");

      const expansionSections = items.map((item, index) => {
        const category = cleanText(item.category, "news", 80);
        const headline = cleanText(item.headline, "", 500);
        const summary = cleanText(item.summary, "", 2000);
        const sourceName = cleanText(item.sourceName, "verified source", 200);

        return [
          `Extended item ${index + 1}, ${category}.`,
          headline ? `Headline: ${headline}.` : "",
          sourceName ? `Verified source: ${sourceName}.` : "",
          summary ? `Context: ${summary}` : "",
          "Why it matters: listeners should understand the practical impact, the community angle, and what may need follow-up from official or verified sources.",
          "Nia keeps this factual, calm, and clear, without adding rumors or unconfirmed details."
        ]
          .filter(Boolean)
          .join(" ");
      });

      const recapSections = [
        "Nia recap:",
        "The main stories in this update connect back to community safety, public trust, business pressure, weather awareness, culture, sports, and the daily lives of listeners.",
        "The key reminder is simple: stay informed, check verified sources, and do not spread claims that have not been confirmed.",
        "Tha Core will keep the music clean, the information useful, and the station focused on service.",
        "Mission over mood. Peace over pride. Progress over pressure."
      ];

      const candidateBlocks = [expansionHeader, ...expansionSections, ...recapSections];

      for (const block of candidateBlocks) {
        if (estimateRunnerScriptSeconds(expanded) >= targetSeconds) break;
        expanded = cleanText(`${expanded}

${block}`, "", 40000);
      }

      return expanded;
    }

    async function generateRundown(extraInstruction = "", previousScript = "") {
      const minimumMinutes = Math.round((minDurationSeconds / 60) * 10) / 10;
      const targetMinutes = Math.round((targetDurationSeconds / 60) * 10) / 10;

      const durationInstruction = [
        `Locked duration rule: this Nia news/program script must produce at least ${minimumMinutes} minutes of spoken audio.`,
        `Aim for about ${targetMinutes} minutes while staying inside the 7 to 15 minute Nia news/program window.`,
        "Do not write a short bulletin.",
        "Develop each verified item with headline, context, why it matters, what listeners should watch next, and smooth transitions.",
        "Use only verified supplied items. Do not invent facts.",
        "If the available items are many, cover more items. If the items are few, develop each item more deeply while staying factual.",
        "The output must be a full radio script, not notes, not bullets, and not a summary."
      ].join(" ");

      return postJson("/api/radio/ai-host-news-rundown", {
        ...rundownBody,
        targetDurationSeconds,
        minDurationSeconds,
        durationRule: "NIA_NEWS_7_TO_15_MIN_RULE_V1",
        instruction: `${rundownBody.instruction} ${durationInstruction} ${extraInstruction}`.trim(),
        previousScript: previousScript ? previousScript.slice(0, 12000) : undefined,
      });
    }

    let rundown = await generateRundown();
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

    let script = extractRundownScript(rundown.data);

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

    let voiceBody = {
      programName,
      programSlot,
      blockType,
      voice: cleanText(body.voice || "nova", "nova", 40),
      brandSpeechName: "Tha Core",
      approved: true,
      targetDurationSeconds,
      minDurationSeconds,
      maxChunkChars: Number(body.maxChunkChars || 850),
      maxChunks: Number(body.maxChunks || 24),
      script,
    };

    let voice = await postJson("/api/radio/ai-host-program-voice", voiceBody);
    let autoExpandedScript = false;
    let firstVoiceFailure: AnyRecord | null = null;

    if (isShortDurationVoiceFailure(voice)) {
      firstVoiceFailure = voice.data;

      const estimatedScriptSeconds = Number(
        voice.data?.estimatedScriptSeconds || 0
      );
      const requestedMinimumSeconds = Number(
        voice.data?.requestedMinimumSeconds || minDurationSeconds
      );

      const estimatedMinutes =
        Math.round((estimatedScriptSeconds / 60) * 10) / 10;
      const requestedMinutes =
        Math.round((requestedMinimumSeconds / 60) * 10) / 10;

      const expansionInstruction = [
        `The previous script was estimated at only ${estimatedMinutes} minutes.`,
        `That is below the locked ${requestedMinutes}-minute minimum.`,
        "Regenerate a longer version now.",
        "Keep the same verified facts, but expand the explanation, transitions, context, station framing, recap, and listener takeaways.",
        "Do not add fake facts. Do not add filler. Make it a real full-length Nia program script."
      ].join(" ");

      const retryRundown = await generateRundown(expansionInstruction, script);

      if (retryRundown.ok) {
        const retryScript = extractRundownScript(retryRundown.data);

        if (retryScript && retryScript.length > script.length) {
          rundown = retryRundown;
          script = retryScript;
          autoExpandedScript = true;
        }
      }

      if (estimateRunnerScriptSeconds(script) < requestedMinimumSeconds) {
        const fallbackScript = buildVerifiedExpansionFallback(
          script,
          requestedMinimumSeconds
        );

        if (fallbackScript.length > script.length) {
          script = fallbackScript;
          autoExpandedScript = true;
        }
      }

      if (autoExpandedScript) {
        voiceBody = {
          ...voiceBody,
          script,
        };
        voice = await postJson("/api/radio/ai-host-program-voice", voiceBody);
      }
    }

    if (!voice.ok) {
      return NextResponse.json(
        {
          ok: false,
          phase: "NIA_NEWS_SOURCE_RUNNER_V1",
          error: "VOICE_GENERATION_FAILED",
          status: voice.status,
          voice: voice.data,
          scriptLength: script.length,
          autoExpandedScript,
          firstVoiceFailure,
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

