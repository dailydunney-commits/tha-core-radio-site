import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AiHostVoiceBody = {
  script?: string;
  voice?: string;
  title?: string;
  hostName?: string;
  segmentType?: string;
};

const DEFAULT_VOICE_MODEL = "gpt-4o-mini-tts";
const DEFAULT_VOICE = "nova";

const ALLOWED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
]);

const UNSAFE_SCRIPT_PATTERN =
  /\b(f+u+c+k+|s+h+i+t+|b+i+t+c+h+|p+u+s+s+y+|d+i+c+k+|c+o+c+k+|c+u+n+t+|n+i+g+g+a+|n+i+g+g+e+r+)\b/gi;

function normalizeScriptText(value: string) {
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

function safeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return normalizeScriptText(value).slice(0, 3000);
}

function safeFilePart(value: string) {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return cleaned || "ai-host-voice";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-voice",
    phase: "OPENAI_AI_HOST_PHASE_2_VOICE_SAVE_ONLY",
    keyPresent: Boolean(process.env.OPENAI_API_KEY),
    model: process.env.OPENAI_AI_HOST_VOICE_MODEL || DEFAULT_VOICE_MODEL,
    defaultVoice: process.env.OPENAI_AI_HOST_VOICE || DEFAULT_VOICE,
    voiceEnabled: true,
    broadcastEnabled: false,
    outputFolder: "/audio/ai-host",
    note: "Voice generation only. Saved audio must be previewed before any broadcast wiring.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_AI_HOST_VOICE_MODEL || DEFAULT_VOICE_MODEL;

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

    const body = (await req.json().catch(() => ({}))) as AiHostVoiceBody;

    const script = safeText(body.script, "");
    const requestedVoice = safeText(body.voice, process.env.OPENAI_AI_HOST_VOICE || DEFAULT_VOICE);
    const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;
    const title = safeText(body.title, "Tha Core AI Host Voice");
    const hostName = safeText(body.hostName, "Tha Core AI Host");
    const segmentType = safeText(body.segmentType, "general-talk");

    if (!script || script.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_SCRIPT_REQUIRED",
          message: "Paste an approved clean script before generating voice.",
        },
        { status: 400 }
      );
    }

    if (script.length > 3000) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_SCRIPT_TOO_LONG",
          message: "Script must be 3000 characters or less for Phase 2.",
        },
        { status: 400 }
      );
    }

    const unsafeHits = script.match(UNSAFE_SCRIPT_PATTERN) || [];
    if (unsafeHits.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_SCRIPT_UNSAFE_FOR_VOICE",
          message: "Script contains unsafe words. Clean/approve it before voice generation.",
          reviewRequired: true,
        },
        { status: 400 }
      );
    }

    const upstream = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        voice,
        input: script,
        response_format: "mp3",
        instructions:
          "Clean professional Jamaican-friendly radio host delivery. Warm energy, clear pronunciation, no shouting, ready for preview before broadcast.",
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: "OPENAI_VOICE_RESPONSE_FAILED",
          status: upstream.status,
          detail: detail.slice(0, 1200),
        },
        { status: 502 }
      );
    }

    const audioBytes = Buffer.from(await upstream.arrayBuffer());

    if (!audioBytes.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "EMPTY_AI_HOST_AUDIO",
          message: "OpenAI returned no audio bytes.",
        },
        { status: 502 }
      );
    }

    const publicDir = path.join(process.cwd(), "public", "audio", "ai-host");
    await mkdir(publicDir, { recursive: true });

    const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const fileName = `ai-host-${safeFilePart(segmentType)}-${safeFilePart(title)}-${stamp}-${randomUUID().slice(0, 8)}.mp3`;
    const filePath = path.join(publicDir, fileName);

    await writeFile(filePath, audioBytes);

    const audioUrl = `/audio/ai-host/${fileName}`;

    return NextResponse.json({
      ok: true,
      route: "/api/radio/ai-host-voice",
      phase: "OPENAI_AI_HOST_PHASE_2_VOICE_SAVE_ONLY",
      safety: "CLEAN_AI_HOST_VOICE_READY_FOR_PREVIEW",
      voiceEnabled: true,
      broadcastEnabled: false,
      aiGeneratedVoice: true,
      disclosure: "AI-generated voice. Preview and approve before broadcast use.",
      model,
      voice,
      hostName,
      segmentType,
      title,
      audioUrl,
      fileName,
      bytes: audioBytes.length,
      reviewRequired: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI_HOST_VOICE_ROUTE_ERROR",
        message: error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}

