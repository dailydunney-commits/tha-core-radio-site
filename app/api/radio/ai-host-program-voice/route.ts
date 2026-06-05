import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProgramVoiceBody = {
  hostName?: string;
  programName?: string;
  programSlot?: string;
  blockType?: string;
  voice?: string;
  script?: string;
  maxChunkChars?: number;
  maxChunks?: number;
  approved?: boolean;
  brandSpeechName?: string;
  targetDurationSeconds?: number;
  minDurationSeconds?: number;
};

const DEFAULT_TTS_MODEL = process.env.OPENAI_AI_HOST_TTS_MODEL || "gpt-4o-mini-tts";
const DEFAULT_VOICE = process.env.OPENAI_AI_HOST_VOICE || "nova";
const PUBLIC_AI_HOST_DIR = join(process.cwd(), "public", "audio", "ai-host");
const DATA_PROGRAM_DIR = join(process.cwd(), ".data", "ai-host-programs");

const ALLOWED_VOICES = new Set([
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "onyx",
  "nova",
  "sage",
  "shimmer",
]);

const UNSAFE_SCRIPT_PATTERN =
  /\b(f+u+c+k+|s+h+i+t+|b+i+t+c+h+|p+u+s+s+y+|d+i+c+k+|c+o+c+k+|c+u+n+t+|n+i+g+g+a+|n+i+g+g+e+r+)\b/gi;

function cleanText(value: unknown, fallback = "", max = 2000) {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function slugify(value: string) {
  return cleanText(value, "nia-program", 160)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "nia-program";
}

function splitScriptIntoChunks(script: string, maxChunkChars: number, maxChunks: number) {
  const cleaned = script.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const paragraphs = cleaned
    .split(/\n\s*\n|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph;
      continue;
    }

    if ((current + " " + paragraph).length <= maxChunkChars) {
      current += " " + paragraph;
    } else {
      chunks.push(current);
      current = paragraph;
      if (chunks.length >= maxChunks) break;
    }
  }

  if (current && chunks.length < maxChunks) chunks.push(current);

  return chunks
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length >= 10)
    .slice(0, maxChunks);
}

function estimateSeconds(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(8, Math.round((words / 145) * 60));
}

// NIA_REAL_AUDIO_DURATION_V1
function getMp3DurationSeconds(filePath: string) {
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=nw=1:nk=1",
        filePath,
      ],
      { encoding: "utf8" }
    ).trim();

    const seconds = Number(out);
    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds);
    }
  } catch {}

  return 0;
}

// NIA_TTS_BRAND_PRONUNCIATION_V1
// Keep the written brand as "Tha Core", but guide TTS to pronounce it naturally.
function normalizeSpeechForTts(text: string, brandSpeechName: string) {
  const spokenBrand = cleanText(brandSpeechName, "Tha Core", 80);
  return String(text || "")
    .replace(/\bTha Core\b/g, spokenBrand)
    .replace(/\bTHA CORE\b/g, spokenBrand.toUpperCase())
    .replace(/\btha core\b/g, spokenBrand.toLowerCase());
}

async function generateSpeechMp3(input: {
  apiKey: string;
  model: string;
  voice: string;
  text: string;
}) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      voice: input.voice,
      input: input.text,
      format: "mp3",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OPENAI_TTS_FAILED_${res.status}: ${detail.slice(0, 500)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-program-voice",
    phase: "NIA_PROGRAM_VOICE_CHUNKS_V1",
    purpose:
      "Converts an approved Nia news/program script into multiple listener-safe MP3 chunks. Does not broadcast by itself.",
    model: DEFAULT_TTS_MODEL,
    defaultVoice: DEFAULT_VOICE,
    broadcastEnabled: false,
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY_MISSING" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as ProgramVoiceBody;

    const hostName = cleanText(body.hostName, "Nia from Tha Core", 120);
    const programName = cleanText(body.programName, "Tha Core News", 160);
    const programSlot = cleanText(body.programSlot, "unscheduled", 80);
    const blockType = cleanText(body.blockType, "news-program", 120);
    const voiceCandidate = cleanText(body.voice, DEFAULT_VOICE, 40).toLowerCase();
    const voice = ALLOWED_VOICES.has(voiceCandidate) ? voiceCandidate : DEFAULT_VOICE;
    const brandSpeechName = cleanText(
      body.brandSpeechName,
      process.env.AI_HOST_BRAND_SPEECH_NAME || "Tha Core",
      80
    );
    const script = cleanText(body.script, "", 30000);

    if (!body.approved) {
      return NextResponse.json(
        {
          ok: false,
          error: "SCRIPT_NOT_APPROVED",
          message:
            "Full program voice generation requires approved:true after reviewing the rundown script.",
        },
        { status: 423 }
      );
    }

    if (!script || script.length < 80) {
      return NextResponse.json(
        { ok: false, error: "SCRIPT_TOO_SHORT" },
        { status: 422 }
      );
    }

    const unsafeHits = script.match(UNSAFE_SCRIPT_PATTERN) || [];
    if (unsafeHits.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "SCRIPT_NEEDS_REVIEW_UNSAFE_WORDS",
          safety: "PROGRAM_SCRIPT_BLOCKED_FOR_REVIEW",
          unsafeHitCount: unsafeHits.length,
        },
        { status: 422 }
      );
    }

    const maxChunkChars = Math.max(700, Math.min(1500, Number(body.maxChunkChars || 1000)));
    const maxChunks = Math.max(1, Math.min(16, Number(body.maxChunks || 12)));
    const chunks = splitScriptIntoChunks(script, maxChunkChars, maxChunks);

    if (!chunks.length) {
      return NextResponse.json(
        { ok: false, error: "NO_CHUNKS_CREATED" },
        { status: 422 }
      );
    }

    // NIA_PROGRAM_DURATION_GUARD_V1
    const minDurationSeconds = Math.max(
      0,
      Math.min(
        3600,
        Number(body.minDurationSeconds || body.targetDurationSeconds || 0)
      )
    );
    const estimatedScriptSeconds = chunks.reduce(
      (sum, chunk) => sum + estimateSeconds(chunk),
      0
    );

    if (minDurationSeconds && estimatedScriptSeconds < Math.round(minDurationSeconds * 0.9)) {
      return NextResponse.json(
        {
          ok: false,
          error: "SCRIPT_TOO_SHORT_FOR_TARGET_DURATION",
          message: "The script is too short for the requested program length. Add more verified content or lower the target duration.",
          estimatedScriptSeconds,
          requestedMinimumSeconds: minDurationSeconds,
          estimatedMinutes: Math.round((estimatedScriptSeconds / 60) * 10) / 10,
          requestedMinutes: Math.round((minDurationSeconds / 60) * 10) / 10,
        },
        { status: 422 }
      );
    }

    await mkdir(PUBLIC_AI_HOST_DIR, { recursive: true });
    await mkdir(DATA_PROGRAM_DIR, { recursive: true });

    const now = new Date();
    const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const programId = `${slugify(programSlot)}-${slugify(programName)}-${stamp}-${crypto
      .randomUUID()
      .slice(0, 8)}`;

    const audioParts = [];

    for (let i = 0; i < chunks.length; i++) {
      const partNumber = i + 1;
      const chunkText = chunks[i];
      const mp3 = await generateSpeechMp3({
        apiKey,
        model: DEFAULT_TTS_MODEL,
        voice,
        text: normalizeSpeechForTts(chunkText, brandSpeechName),
      });

      const fileName = `ai-host-program-${slugify(programName)}-part-${String(partNumber).padStart(
        2,
        "0"
      )}-${stamp}-${crypto.randomUUID().slice(0, 8)}.mp3`;

      const filePath = join(PUBLIC_AI_HOST_DIR, fileName);
      await writeFile(filePath, mp3);

      const audioUrl = `/api/listener/ai-host-audio?file=${encodeURIComponent(fileName)}`;
      const actualSeconds = getMp3DurationSeconds(filePath);
      const seconds = actualSeconds || estimateSeconds(chunkText);

      audioParts.push({
        partNumber,
        totalParts: chunks.length,
        fileName,
        audioUrl,
        storageUrl: `/audio/ai-host/${fileName}`,
        bytes: mp3.length,
        estimatedSeconds: seconds,
        actualSeconds,
        durationSeconds: seconds,
        script: chunkText,
        track: {
          id: `AI-Host-Program/${programId}/part-${partNumber}`,
          trackId: `AI-Host-Program/${programId}/part-${partNumber}`,
          title: `${programName} Part ${partNumber} of ${chunks.length}`,
          artist: hostName,
          source: "AI_HOST_PROGRAM",
          genreLane: "News",
          lane: "News",
          folder: "AI-Host-News",
          audioUrl,
          streamUrl: audioUrl,
          listen_url: audioUrl,
          cleanAudioUrl: audioUrl,
          returnedToSmartDj: true,
          held: false,
          cleanStatus: "PROCESSED_AUDIO_READY",
          bleepJobStatus: "PROCESSED_AUDIO_READY",
          aiHost: true,
          aiGeneratedVoice: true,
          programId,
          programName,
          programSlot,
          blockType,
          partNumber,
          totalParts: chunks.length,
          estimatedSeconds: seconds,
          fullProgramBlock: true,
        },
      });
    }

    const totalEstimatedSeconds = audioParts.reduce(
      (sum, part) => sum + Number(part.estimatedSeconds || 0),
      0
    );

    // NIA_POST_TTS_DURATION_GUARD_V1
    if (minDurationSeconds && totalEstimatedSeconds < Math.round(minDurationSeconds * 0.9)) {
      return NextResponse.json(
        {
          ok: false,
          error: "GENERATED_AUDIO_TOO_SHORT_FOR_TARGET_DURATION",
          message: "Generated Nia audio is too short for the requested program length. Do not broadcast as a timed block.",
          totalEstimatedSeconds,
          requestedMinimumSeconds: minDurationSeconds,
          estimatedMinutes: Math.round((totalEstimatedSeconds / 60) * 10) / 10,
          requestedMinutes: Math.round((minDurationSeconds / 60) * 10) / 10,
          audioParts,
        },
        { status: 422 }
      );
    }

    const manifest = {
      ok: true,
      phase: "NIA_PROGRAM_VOICE_CHUNKS_V1",
      programId,
      hostName,
      programName,
      programSlot,
      blockType,
      model: DEFAULT_TTS_MODEL,
      voice,
      partCount: audioParts.length,
      totalEstimatedSeconds,
      totalEstimatedMinutes: Math.round((totalEstimatedSeconds / 60) * 10) / 10,
      audioParts,
      createdAt: now.toISOString(),
      broadcastEnabled: false,
      nextStep: "Use program broadcast route to play these parts in order.",
    };

    await writeFile(
      join(DATA_PROGRAM_DIR, `${programId}.json`),
      JSON.stringify(manifest, null, 2),
      "utf8"
    );

    return NextResponse.json(manifest);
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI_HOST_PROGRAM_VOICE_ROUTE_ERROR",
        message: error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}
