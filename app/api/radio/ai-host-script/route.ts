import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AiHostScriptBody = {
  hostName?: string;
  segmentType?: string;
  topic?: string;
  vibe?: string;
  lane?: string;
  durationSeconds?: number;
  sponsorName?: string;
  callToAction?: string;
  extraNotes?: string;
};

const DEFAULT_MODEL = "gpt-4.1";

const SEGMENT_TYPES = new Set([
  "station-id",
  "song-intro",
  "song-outro",
  "jingle-link",
  "promo",
  "sponsor-read",
  "schedule-tease",
  "community-message",
  "general-talk",
]);

const UNSAFE_SCRIPT_PATTERN =
  /\b(f+u+c+k+|s+h+i+t+|b+i+t+c+h+|p+u+s+s+y+|d+i+c+k+|c+o+c+k+|c+u+n+t+|n+i+g+g+a+|n+i+g+g+e+r+)\b/gi;

function normalizeScriptText(value: string) {
  // AI_HOST_SCRIPT_ASCII_CLEANUP_V1
  return value
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, " - ")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/â€™|â€˜|â|â/g, "'")
    .replace(/â€œ|â€|â|â/g, '"')
    .replace(/â€”|â€“|â|â/g, " - ")
    .replace(/â€¦|â¦/g, "...")
    .replace(/Â/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}
function cleanText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim().slice(0, 600);
}

function clampDuration(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 25;
  return Math.max(8, Math.min(90, Math.round(n)));
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

function buildPrompt(body: AiHostScriptBody) {
  const hostName = cleanText(body.hostName, "Tha Core AI Host");
  const rawSegmentType = cleanText(body.segmentType, "general-talk");
  const segmentType = SEGMENT_TYPES.has(rawSegmentType) ? rawSegmentType : "general-talk";
  const topic = cleanText(body.topic, "Tha Core Radio clean music link");
  const vibe = cleanText(body.vibe, "warm Jamaican radio energy, professional, clean, confident");
  const lane = cleanText(body.lane, "current clean rotation");
  const sponsorName = cleanText(body.sponsorName, "");
  const callToAction = cleanText(body.callToAction, "Keep it locked to Tha Core Online Radio.");
  const extraNotes = cleanText(body.extraNotes, "");
  const durationSeconds = clampDuration(body.durationSeconds);

  return {
    hostName,
    segmentType,
    topic,
    vibe,
    lane,
    sponsorName,
    callToAction,
    extraNotes,
    durationSeconds,
    prompt: [
      "Write ONE clean radio-ready AI host script for Tha Core Online Radio.",
      "",
      "STRICT RULES:",
      "- Output the script only. No markdown. No bullet list. No explanation.",
      "- Keep it clean enough for public radio: no profanity, no explicit sexual content, no hate, no slurs, no insults.",
      "- Do not invent breaking news, weather, live facts, celebrity claims, legal claims, medical claims, or emergency information.",
      "- If time/weather/news is not provided, speak generally and safely.",
      "- Keep the script natural for voice delivery.",
      "- Use Jamaican-friendly energy, but keep pronunciation readable for text-to-speech.",
      "- Use plain ASCII punctuation only: apostrophe, comma, period, dash. No curly quotes, no em dashes, no special symbols.",
      "- Do not mention OpenAI, AI model, prompt, or backend.",
      "- End with a smooth cue back into music or station programming.",
      "",
      "SCRIPT SETTINGS:",
      `Host name/persona: ${hostName}`,
      `Segment type: ${segmentType}`,
      `Topic: ${topic}`,
      `Music lane/folder: ${lane}`,
      `Target duration: about ${durationSeconds} seconds`,
      `Vibe: ${vibe}`,
      sponsorName ? `Sponsor name: ${sponsorName}` : "Sponsor name: none",
      `Call to action: ${callToAction}`,
      extraNotes ? `Extra notes: ${extraNotes}` : "Extra notes: none",
    ].join("\n"),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-script",
    phase: "OPENAI_AI_HOST_PHASE_1_SCRIPT_ONLY",
    keyPresent: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_AI_HOST_MODEL || DEFAULT_MODEL,
    voiceEnabled: false,
    note: "Script generation only. Voice/audio comes next after script approval.",
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
          message: "Add OPENAI_API_KEY to .env.local or the server environment. Do not paste the key in chat.",
        },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as AiHostScriptBody;
    const built = buildPrompt(body);

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions:
          "You are the clean, radio-safe script writer for Tha Core Online Radio. You write short host links that are ready for broadcast approval.",
        input: built.prompt,
        max_output_tokens: 700,
      }),
    });

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_RESPONSE_FAILED",
          status: upstream.status,
          detail: data?.error?.message || "OpenAI request failed.",
        },
        { status: 502 }
      );
    }

    const rawScript = normalizeScriptText(extractOutputText(data));

    if (!rawScript) {
      return NextResponse.json(
        {
          ok: false,
          error: "EMPTY_AI_HOST_SCRIPT",
          message: "OpenAI returned no usable script text.",
        },
        { status: 502 }
      );
    }

    const unsafeHits = rawScript.match(UNSAFE_SCRIPT_PATTERN) || [];
    const safeScript = rawScript.replace(UNSAFE_SCRIPT_PATTERN, "[BLEEP]");

    return NextResponse.json({
      ok: true,
      route: "/api/radio/ai-host-script",
      phase: "OPENAI_AI_HOST_PHASE_1_SCRIPT_ONLY",
      safety: unsafeHits.length ? "SCRIPT_NEEDS_REVIEW_BLEEPED_BY_ROUTE" : "CLEAN_SCRIPT_READY",
      voiceEnabled: false,
      model,
      hostName: built.hostName,
      segmentType: built.segmentType,
      lane: built.lane,
      estimatedSeconds: built.durationSeconds,
      script: safeScript,
      reviewRequired: unsafeHits.length > 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI_HOST_SCRIPT_ROUTE_ERROR",
        message: error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}

