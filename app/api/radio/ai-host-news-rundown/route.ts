import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type NewsItem = {
  id?: string;
  category?: string;
  headline?: string;
  summary?: string;
  sourceName?: string;
  sourceUrl?: string;
  publishedAt?: string;
  verifiedAt?: string;
  allowCommentary?: boolean;
};

type NewsRundownBody = {
  hostName?: string;
  programName?: string;
  blockType?: string;
  programSlot?: string;
  recapMode?: boolean;
  durationMinutes?: number;
  focus?: string;
  tone?: string;
  location?: string;
  items?: NewsItem[];
  includeWeather?: boolean;
  weatherText?: string;
  includeSports?: boolean;
  includeEntertainment?: boolean;
  extraNotes?: string;
  testMode?: boolean;
};

const DEFAULT_MODEL = "gpt-4.1";
const DATA_DIR = join(process.cwd(), ".data");
const NEWS_HISTORY_FILE = join(DATA_DIR, "ai-host-news-history.json");

const UNSAFE_SCRIPT_PATTERN =
  /\b(f+u+c+k+|s+h+i+t+|b+i+t+c+h+|p+u+s+s+y+|d+i+c+k+|c+o+c+k+|c+u+n+t+|n+i+g+g+a+|n+i+g+g+e+r+)\b/gi;

function cleanText(value: unknown, fallback = "", max = 1000) {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function clampDuration(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 10;
  return Math.max(3, Math.min(15, Math.round(n)));
}

function jamaicaTimeText() {
  try {
    return new Intl.DateTimeFormat("en-JM", {
      timeZone: "America/Jamaica",
      weekday: "long",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  } catch {
    return "";
  }
}

function storyKey(item: NewsItem) {
  const raw = [
    item.id,
    item.sourceName,
    item.headline,
    item.publishedAt,
  ]
    .filter(Boolean)
    .join("|")
    .toLowerCase();

  return raw
    .replace(/[^a-z0-9| ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

function extractOutputText(data: any): string {
  if (typeof data?.output_text === "string") {
    return data.output_text.trim();
  }

  const chunks: string[] = [];

  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function normalizeItems(items: NewsItem[], testMode: boolean) {
  const cleanItems = items
    .map((item) => ({
      id: cleanText(item.id, "", 120),
      category: cleanText(item.category, "general", 80),
      headline: cleanText(item.headline, "", 260),
      summary: cleanText(item.summary, "", 900),
      sourceName: cleanText(item.sourceName, "", 120),
      sourceUrl: cleanText(item.sourceUrl, "", 500),
      publishedAt: cleanText(item.publishedAt, "", 80),
      verifiedAt: cleanText(item.verifiedAt, "", 80),
      allowCommentary: item.allowCommentary !== false,
    }))
    .filter((item) => item.headline && item.summary && item.sourceName);

  if (cleanItems.length || !testMode) return cleanItems;

  return [
    {
      id: "test-jamaica-morning-rundown",
      category: "station-test",
      headline: "Tha Core Nia news rundown system test",
      summary:
        "This is a safe internal test item for building the Nia news program format. It is not a real news headline and must be described as a system test only.",
      sourceName: "Tha Core internal test",
      sourceUrl: "",
      publishedAt: new Date().toISOString(),
      verifiedAt: new Date().toISOString(),
      allowCommentary: false,
    },
  ];
}

function buildPrompt(body: NewsRundownBody, items: NewsItem[], repeats: string[]) {
  const hostName = cleanText(body.hostName, "Nia from Tha Core", 120);
  const programName = cleanText(body.programName, "Tha Core Morning News", 160);
  const blockType = cleanText(body.blockType, "morning-news", 120);
  const programSlot = cleanText(body.programSlot, "6:00 AM", 80);
  const recapMode = Boolean(body.recapMode);
  const durationMinutes = clampDuration(body.durationMinutes);
  const focus = cleanText(body.focus, "Jamaica first, then Caribbean/world if provided", 220);
  const tone = cleanText(
    body.tone,
    "professional Jamaican radio host, warm, clear, clean, lightly witty when appropriate",
    220
  );
  const location = cleanText(body.location, "Jamaica", 120);
  const extraNotes = cleanText(body.extraNotes, "", 500);
  const weatherText = cleanText(body.weatherText, "", 500);
  const timeText = jamaicaTimeText();

  const itemText = items
    .map((item, index) => {
      return [
        `STORY ${index + 1}`,
        `Category: ${item.category || "general"}`,
        `Headline: ${item.headline}`,
        `Summary: ${item.summary}`,
        `Source: ${item.sourceName}`,
        item.sourceUrl ? `Source URL/reference: ${item.sourceUrl}` : "Source URL/reference: not provided",
        item.publishedAt ? `Published: ${item.publishedAt}` : "Published: not provided",
        item.verifiedAt ? `Verified: ${item.verifiedAt}` : "Verified: not provided",
        `Commentary allowed: ${item.allowCommentary === false ? "no" : "yes"}`,
      ].join("\n");
    })
    .join("\n\n");

  return {
    hostName,
    programName,
    blockType,
    durationMinutes,
    prompt: [
      "Write a clean radio-ready news/program script for Tha Core Online Radio.",
      "",
      "IMPORTANT ROLE:",
      `- Host/persona: ${hostName}`,
      `- Program: ${programName}`,
      `- Block type: ${blockType}`,
      `- Program slot: ${programSlot}`,
      `- Recap mode: ${recapMode ? "yes - recap what changed and avoid repeating old stories" : "no - fresh full rundown"}`,
      `- Target duration: about ${durationMinutes} minutes`,
      `- Location focus: ${location}`,
      `- Editorial focus: ${focus}`,
      `- Current Jamaica time label: ${timeText || "not available"}`,
      `- Tone: ${tone}`,
      "",
      "STRICT NEWS RULES:",
      "- Use ONLY the verified story items provided below.",
      "- Do NOT invent breaking news, names, statistics, weather, scores, crimes, deaths, arrests, government claims, celebrity claims, or quotes.",
      "- If a detail is not provided, do not add it.",
      "- NIA_NEWS_FACTUAL_GUARD_V1: Do not describe the day as sunny, rainy, cloudy, hot, stormy, calm, busy, or any other condition unless that exact detail is provided in the verified items or weatherText.",
      "- Nia may use the provided Current Jamaica time label for the weekday and time of day, but must not invent location condition, road condition, public mood, or weather from the clock alone.",
      "- If weatherText says no exact forecast was supplied, say only that no exact forecast was supplied and keep the weather note general.",
      "- Do not say a story is making headlines unless it is a real verified news item from a real source.",
      "- Attribute stories naturally to their source names.",
      "- If the sourceName contains internal test, clearly say it is a system test and not public news.",
      "- Internal system test items are not public news and must not be presented as Jamaica headlines.",
      "- Do not repeat stories marked as recently used unless there is a clear update.",
      "- For recap blocks, explain what changed since the last bulletin and summarize earlier stories briefly only if still important.",
      "- For full news blocks, read the news properly like a real radio bulletin, not just a short update.",
      "- Keep the script clean: no profanity, no slurs, no insults, no explicit content.",
      "- Commentary can be light and human, but must be clearly based on the provided story summary.",
      "- Keep jokes clean, brief, and safe. No mocking tragedy, crime victims, children, sickness, death, or disasters.",
      "- Use Jamaican-friendly radio energy, but keep pronunciation readable for text-to-speech.",
      "- Do not mention OpenAI, AI model, prompt, backend, route, or code.",
      "",
      "PROGRAM SHAPE:",
      "- Open with a short station/host intro appropriate to the program slot.",
      "- Give a clear rundown of the provided stories.",
      "- If this is a 6 AM block, make it a full morning start.",
      "- If this is a 10 AM block, focus on updates since the morning.",
      "- If this is a 1 PM block, make it a midday news recap plus new items.",
      "- If this is a 3 PM block, make it an afternoon update.",
      "- If this is a 5:30 PM block, make it a drive-time news and road-safe recap.",
      "- If this is an 8 PM block, make it an evening wrap-up and day recap.",
      "- Include short transitions between categories.",
      body.includeWeather && weatherText
        ? `- Include this weather text exactly as a general weather note, without adding extra claims: ${weatherText}`
        : "- Do not give weather details unless provided.",
      body.includeSports
        ? "- Include sports only if sports items are provided."
        : "- Do not add sports scores unless provided.",
      body.includeEntertainment
        ? "- Include entertainment only if entertainment items are provided."
        : "- Do not add entertainment claims unless provided.",
      "- End by handing back to clean music on Tha Core.",
      "",
      repeats.length
        ? `RECENTLY USED STORY KEYS TO AVOID REPEATING:\n${repeats.slice(0, 20).join("\n")}`
        : "RECENTLY USED STORY KEYS TO AVOID REPEATING: none",
      "",
      extraNotes ? `OWNER NOTES:\n${extraNotes}` : "OWNER NOTES: none",
      "",
      "VERIFIED STORY ITEMS:",
      itemText,
    ].join("\n"),
  };
}

export async function GET() {
  const history = await readJson<any>(NEWS_HISTORY_FILE, { used: [] });

  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-news-rundown",
    phase: "NIA_NEWS_PROGRAM_BRAIN_V1",
    hostName: "Nia from Tha Core",
    purpose:
      "Builds full Nia news/program scripts from verified story items. Does not fetch or invent news by itself.",
    model: process.env.OPENAI_AI_HOST_MODEL || DEFAULT_MODEL,
    scheduleTargets: [
      "6:00 AM Morning News",
      "10:00 AM News Update",
      "1:00 PM Midday News",
      "3:00 PM Afternoon Update",
      "5:30 PM Drive-Time News Recap",
      "8:00 PM Evening News Wrap-Up"
    ],
    historyCount: Array.isArray(history.used) ? history.used.length : 0,
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_AI_HOST_MODEL || DEFAULT_MODEL;

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_API_KEY_MISSING",
          message: "Do not paste the key in chat. Add it to .env.local/server environment.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as NewsRundownBody;
    const items = normalizeItems(Array.isArray(body.items) ? body.items : [], Boolean(body.testMode));

    if (!items.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "NO_VERIFIED_NEWS_ITEMS",
          message:
            "Nia will not invent news. Send verified items with headline, summary, and sourceName.",
        },
        { status: 422 }
      );
    }

    const history = await readJson<any>(NEWS_HISTORY_FILE, { used: [] });
    const used: string[] = Array.isArray(history.used) ? history.used : [];
    const keys = items.map(storyKey).filter(Boolean);
    const repeatedKeys = keys.filter((key) => used.includes(key));

    const built = buildPrompt(body, items, repeatedKeys);

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions:
          "You are Nia's clean radio news writer for Tha Core Online Radio. You write accurate, source-grounded radio scripts only from provided verified items.",
        input: built.prompt,
        max_output_tokens: Math.max(1800, Math.min(6500, built.durationMinutes * 650)),
      }),
    });

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_NEWS_RUNDOWN_FAILED",
          status: upstream.status,
          detail: data?.error?.message || "OpenAI request failed.",
        },
        { status: 502 }
      );
    }

    const rawScript = extractOutputText(data);

    if (!rawScript) {
      return NextResponse.json(
        {
          ok: false,
          error: "EMPTY_NEWS_RUNDOWN",
          message: "No usable news script returned.",
        },
        { status: 502 }
      );
    }

    const unsafeHits = rawScript.match(UNSAFE_SCRIPT_PATTERN) || [];
    const safeScript = rawScript.replace(UNSAFE_SCRIPT_PATTERN, "[BLEEP]");

    const nextHistory = {
      updatedAt: new Date().toISOString(),
      used: Array.from(new Set([...keys, ...used])).slice(0, 300),
      lastProgram: {
        programName: built.programName,
        blockType: built.blockType,
        programSlot: cleanText(body.programSlot, "6:00 AM", 80),
        recapMode: Boolean(body.recapMode),
        durationMinutes: built.durationMinutes,
        itemCount: items.length,
        repeatedKeys,
        generatedAt: new Date().toISOString(),
      },
    };

    await writeJson(NEWS_HISTORY_FILE, nextHistory);

    return NextResponse.json({
      ok: true,
      route: "/api/radio/ai-host-news-rundown",
      phase: "NIA_NEWS_PROGRAM_BRAIN_V1",
      safety: unsafeHits.length ? "NEWS_RUNDOWN_NEEDS_REVIEW_BLEEPED" : "CLEAN_NEWS_RUNDOWN_READY",
      model,
      hostName: built.hostName,
      programName: built.programName,
      blockType: built.blockType,
      programSlot: cleanText(body.programSlot, "6:00 AM", 80),
      recapMode: Boolean(body.recapMode),
      targetDurationMinutes: built.durationMinutes,
      itemCount: items.length,
      repeatedStoryCount: repeatedKeys.length,
      repeatedKeys,
      script: safeScript,
      reviewRequired: unsafeHits.length > 0,
      nextStep: "Approve script, then send to program voice/chunk generator.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI_HOST_NEWS_RUNDOWN_ROUTE_ERROR",
        message: error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}
