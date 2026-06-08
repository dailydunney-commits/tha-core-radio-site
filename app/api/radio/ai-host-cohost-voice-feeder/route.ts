import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";

type AnyRecord = Record<string, any>;

const VERSION = "AI_HOST_COHOST_VOICE_FEEDER_V1_DRAFT_ONLY";

const DEFAULT_TTS_MODEL = process.env.OPENAI_AI_HOST_TTS_MODEL || "gpt-4o-mini-tts";
const PRODIGY_VOICE = process.env.OPENAI_AI_HOST_PRODIGY_VOICE || "onyx";
const DIAMOND_VOICE = process.env.OPENAI_AI_HOST_DIAMOND_VOICE || "coral";

const DATA_DIR = join(process.cwd(), ".data");
const COHOST_SCRIPT_DIR = join(DATA_DIR, "ai-host-cohost-show-feeder");
const PROGRAM_DIR = join(DATA_DIR, "ai-host-programs");
const PUBLIC_AI_HOST_DIR = join(process.cwd(), "public", "audio", "ai-host");

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

function cleanText(value: unknown, fallback = "", max = 5000) {
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function slugify(value: string) {
  return cleanText(value, "cohost", 180)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "cohost";
}

function safeFileName(value: unknown) {
  const file = cleanText(value, "", 260);
  if (!/^[a-zA-Z0-9._-]+\.json$/.test(file)) return "";
  if (file.includes("..")) return "";
  return file;
}

function estimateSeconds(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(5, Math.round((words / 145) * 60));
}

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

    const n = Number(out);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 10) / 10 : 0;
  } catch {
    return 0;
  }
}

function normalizeForTts(text: string) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSpeakerTurns(fullScript: string) {
  const lines = String(fullScript || "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const turns: { speaker: "PRODIGY" | "DIAMOND"; text: string }[] = [];
  let currentSpeaker: "PRODIGY" | "DIAMOND" | null = null;
  let buffer: string[] = [];

  function flush() {
    if (!currentSpeaker) return;
    const text = normalizeForTts(buffer.join(" "));
    if (text) turns.push({ speaker: currentSpeaker, text });
    buffer = [];
  }

  for (const line of lines) {
    const prodigy = line.match(/^PRODIGY:\s*(.*)$/i);
    const diamond = line.match(/^DIAMOND:\s*(.*)$/i);

    if (prodigy) {
      flush();
      currentSpeaker = "PRODIGY";
      buffer.push(prodigy[1] || "");
      continue;
    }

    if (diamond) {
      flush();
      currentSpeaker = "DIAMOND";
      buffer.push(diamond[1] || "");
      continue;
    }

    if (currentSpeaker) buffer.push(line);
  }

  flush();
  return turns.filter((turn) => turn.text.length >= 3);
}

function cohostVoiceInstructions(speaker: "PRODIGY" | "DIAMOND") {
  if (speaker === "PRODIGY") {
    return [
      "COHOST_VOICE_PERSONALITY_V3",
      "Voice direction for Prodigy:",
      "Give Prodigy more energy, more attitude, and more presence than the calm proof.",
      "He should sound street-smart, confident, sharp, intelligent, witty, and controlled.",
      "Think clean urban radio edge: bold, clever, grounded, and real, but never reckless.",
      "Do not glorify crime, threats, violence, drugs, gangs, or illegal behavior.",
      "He should sound like a man with life experience, business sense, and quick comebacks.",
      "Keep the delivery lively, masculine, smart, and broadcast-safe.",
    ].join(" ");
  }

  return [
    "COHOST_VOICE_PERSONALITY_V3",
    "Voice direction for Diamond:",
    "Do not sound like Nia.",
    "Do not sound cartoonish, overly animated, or too bubbly.",
    "Diamond should sound smooth, stylish, confident, grown, witty, sassy-but-controlled, and polished.",
    "Give her early-2000s urban music television host energy, but do not copy any exact real person's voice.",
    "Her delivery should feel cool, fashionable, slightly sultry, classy, and quick with attitude.",
    "She should have presence and flavor, not loudness.",
    "Keep her clean, charismatic, community-radio safe, and entertaining.",
  ].join(" ");
}
async function generateSpeechMp3(input: {
  apiKey: string;
  model: string;
  voice: string;
  text: string;
  speaker: "PRODIGY" | "DIAMOND";
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
      instructions: cohostVoiceInstructions(input.speaker),
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
    route: "/api/radio/ai-host-cohost-voice-feeder",
    phase: VERSION,
    purpose:
      "Generates separate Prodigy and Diamond voice parts from a saved co-host script. Draft-only. Does not broadcast.",
    defaultVoices: {
      prodigy: PRODIGY_VOICE,
      diamond: DIAMOND_VOICE,
    },
    draftOnly: true,
    voiceStarted: false,
    broadcastStarted: false,
    doesNotTouchNewsRunner: true,
    doesNotTouchCurrentBroadcast: true,
    doesNotTouchSmartZJ: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, phase: VERSION, error: "OPENAI_API_KEY_MISSING" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as AnyRecord;

    const savedFile = safeFileName(body.savedFile);
    if (!savedFile) {
      return NextResponse.json(
        { ok: false, phase: VERSION, error: "SAFE_SAVED_FILE_REQUIRED" },
        { status: 400 }
      );
    }

    const scriptPath = join(COHOST_SCRIPT_DIR, savedFile);
    if (!existsSync(scriptPath)) {
      return NextResponse.json(
        { ok: false, phase: VERSION, error: "COHOST_SCRIPT_NOT_FOUND", savedFile },
        { status: 404 }
      );
    }

    const source = JSON.parse(await readFile(scriptPath, "utf8")) as AnyRecord;
    const fullScript = String(source.fullScript || "");
    const allTurns = splitSpeakerTurns(fullScript);

    if (!allTurns.length) {
      return NextResponse.json(
        { ok: false, phase: VERSION, error: "NO_PRODIGY_DIAMOND_TURNS_FOUND" },
        { status: 422 }
      );
    }

    const proofOnly = body.proofOnly !== false;
    const maxTurns = proofOnly
      ? Math.max(2, Math.min(8, Number(body.maxTurns || 6)))
      : Math.max(2, Math.min(240, Number(body.maxTurns || allTurns.length)));

    const turns = allTurns.slice(0, maxTurns);

    const prodigyVoiceCandidate = cleanText(body.prodigyVoice, PRODIGY_VOICE, 40).toLowerCase();
    const diamondVoiceCandidate = cleanText(body.diamondVoice, DIAMOND_VOICE, 40).toLowerCase();

    const prodigyVoice = ALLOWED_VOICES.has(prodigyVoiceCandidate)
      ? prodigyVoiceCandidate
      : PRODIGY_VOICE;

    const diamondVoice = ALLOWED_VOICES.has(diamondVoiceCandidate)
      ? diamondVoiceCandidate
      : DIAMOND_VOICE;

    const model = cleanText(body.model, DEFAULT_TTS_MODEL, 80);

    await mkdir(PUBLIC_AI_HOST_DIR, { recursive: true });
    await mkdir(PROGRAM_DIR, { recursive: true });

    const now = new Date();
    const stamp = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    const programId = `prodigy-diamond-${proofOnly ? "voice-proof" : "full-show"}-${stamp}-${crypto
      .randomUUID()
      .slice(0, 8)}`;

    const audioParts = [];

    for (let i = 0; i < turns.length; i++) {
      const turn = turns[i];
      const speaker = turn.speaker;
      const voice = speaker === "PRODIGY" ? prodigyVoice : diamondVoice;
      const hostName = speaker === "PRODIGY" ? "Prodigy from Tha Core" : "Diamond from Tha Core";

      const mp3 = await generateSpeechMp3({
        apiKey,
        model,
        voice,
        text: turn.text,
        
        speaker,
      });

      const partNumber = i + 1;
      const fileName = `ai-host-cohost-${slugify(speaker)}-part-${String(partNumber).padStart(
        3,
        "0"
      )}-${stamp}-${crypto.randomUUID().slice(0, 8)}.mp3`;
      const filePath = join(PUBLIC_AI_HOST_DIR, fileName);

      await writeFile(filePath, mp3);

      const audioUrl = `/api/listener/ai-host-audio?file=${encodeURIComponent(fileName)}`;
      const actualSeconds = getMp3DurationSeconds(filePath);
      const seconds = actualSeconds || estimateSeconds(turn.text);

      audioParts.push({
        partNumber,
        totalParts: turns.length,
        speaker,
        hostName,
        voice,
        fileName,
        audioUrl,
        storageUrl: `/audio/ai-host/${fileName}`,
        bytes: mp3.length,
        script: turn.text,
        estimatedSeconds: seconds,
        actualSeconds,
        durationSeconds: seconds,
        track: {
          id: `AI-Host-Cohost/${programId}/part-${partNumber}`,
          trackId: `AI-Host-Cohost/${programId}/part-${partNumber}`,
          title: `Prodigy & Diamond ${proofOnly ? "Voice Proof" : "AI Future Show"} Part ${partNumber} of ${turns.length}`,
          artist: hostName,
          source: "AI_HOST_COHOST_PROGRAM",
          genreLane: "AI-Host",
          lane: "AI-Host",
          folder: "AI-Host-Cohost",
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
          cohostProgramBlock: true,
          fullProgramBlock: true,
          programId,
          programName: proofOnly
            ? "Prodigy & Diamond Voice Proof"
            : "Prodigy & Diamond - AI and the Future",
          programSlot: proofOnly ? "voice-proof" : "test-broadcast",
          blockType: "cohost-show",
          speaker,
          partNumber,
          totalParts: turns.length,
          estimatedSeconds: seconds,
        },
      });
    }

    const totalEstimatedSeconds = audioParts.reduce(
      (sum, part) => sum + Number(part.durationSeconds || part.estimatedSeconds || 0),
      0
    );

    const manifest = {
      ok: true,
      phase: VERSION,
      programId,
      hostName: "Prodigy & Diamond",
      programName: proofOnly
        ? "Prodigy & Diamond Voice Proof"
        : "Prodigy & Diamond - AI and the Future",
      programSlot: proofOnly ? "voice-proof" : "test-broadcast",
      blockType: "cohost-show",
      model,
      voices: {
        prodigy: prodigyVoice,
        diamond: diamondVoice,
      },
      sourceScriptFile: savedFile,
      proofOnly,
      partCount: audioParts.length,
      totalEstimatedSeconds,
      totalEstimatedMinutes: Math.round((totalEstimatedSeconds / 60) * 10) / 10,
      audioParts,
      createdAt: now.toISOString(),
      draftOnly: true,
      voiceStarted: true,
      broadcastStarted: false,
      broadcastEnabled: false,
      doesNotTouchNewsRunner: true,
      doesNotTouchCurrentBroadcast: true,
      doesNotTouchSmartZJ: true,
      nextStep: proofOnly
        ? "Preview the proof voices. If approved, run again with proofOnly:false for the full show."
        : "Preview full audio parts. If approved, use program broadcast route to play parts in order.",
    };

    await writeFile(join(PROGRAM_DIR, `${programId}.json`), JSON.stringify(manifest, null, 2), "utf8");

    return NextResponse.json(manifest);
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        phase: VERSION,
        error: "AI_HOST_COHOST_VOICE_FEEDER_ERROR",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}



