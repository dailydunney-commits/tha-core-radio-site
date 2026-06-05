import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const AI_HOST_DROP_STATE_FILE = join(DATA_DIR, "ai-host-between-song-state.json");

function internalBaseUrl() {
  return String(process.env.SMARTZJ_INTERNAL_BASE_URL || "http://127.0.0.1:3101").replace(/\/+$/, "");
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

function cleanText(value: unknown, fallback = "") {
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .replace(/\bmp3\b/gi, "")
    .replace(/\b\d{3,}\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function cleanSongTitle(value: unknown) {
  return cleanText(value, "")
    .replace(/[_-]+/g, " ")
    .replace(/\bofficial\b/gi, "")
    .replace(/\baudio\b/gi, "")
    .replace(/\bvideo\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function jamaicaTimeText() {
  try {
    return new Intl.DateTimeFormat("en-JM", {
      timeZone: "America/Jamaica",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date());
  } catch {
    return "";
  }
}

function pickTalkType(breakCount: number) {
  const types = [
    "song-link",
    "lane-vibe",
    "time-check",
    "weather-safe",
    "entertainment-lite",
    "sports-lite",
    "station-vibe",
    "next-music-tease",
  ];

  return types[Math.abs(breakCount - 1) % types.length] || "song-link";
}

function buildNiaScript(body: AnyRecord, state: AnyRecord) {
  const nextCount = Math.max(1, Number(state.breakCount || 0) + 1);
  const talkType = pickTalkType(nextCount);

  const previousTitle = cleanSongTitle(body.previousTitle || body.currentTitle || "");
  const previousArtist = cleanText(body.previousArtist || body.currentArtist || "");
  const lane = cleanText(body.lane || body.genreLane || "the clean rotation", "the clean rotation");
  const nextTitle = cleanSongTitle(body.nextTitle || "");
  const timeText = jamaicaTimeText();

  const sayName = nextCount === 1 || nextCount % 6 === 0;
  const intro = sayName ? "This is Nia from Tha Core. " : "";

  let script = "";

  if (talkType === "song-link" && previousTitle) {
    script = `${intro}That was ${previousTitle}. Smooth one. More clean ${lane} next.`;
  } else if (talkType === "lane-vibe") {
    script = `${intro}${lane} vibes rolling. Clean music, good frequency. Stay close.`;
  } else if (talkType === "time-check" && timeText) {
    script = `${intro}Quick time check, ${timeText} in Jamaica. Clean music continues.`;
  } else if (talkType === "weather-safe") {
    script = `${intro}Quick weather reminder. Move safe out there. Music continues now.`;
  } else if (talkType === "entertainment-lite") {
    script = `${intro}Entertainment always moving, but the music is the story right now.`;
  } else if (talkType === "sports-lite") {
    script = `${intro}Sports fans, big up yourself. Clean energy, clean music.`;
  } else if (talkType === "next-music-tease" && nextTitle) {
    script = `${intro}Coming up next, ${nextTitle}. Keep it locked.`;
  } else {
    script = `${intro}Clean vibes, good frequency, no long talking. Back to the music.`;
  }

  return {
    script: script.replace(/\s+/g, " ").trim().slice(0, 260),
    talkType,
    breakCount: nextCount,
  };
}

export async function GET() {
  const state = await readJson<AnyRecord>(AI_HOST_DROP_STATE_FILE, {});
  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-next-drop",
    phase: "AI_HOST_BETWEEN_SONG_BRAIN_V1",
    enabled: process.env.AI_HOST_BETWEEN_SONG_ENABLED !== "false",
    hostName: "Nia from Tha Core",
    state,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.AI_HOST_BETWEEN_SONG_ENABLED === "false") {
      return NextResponse.json({ ok: false, error: "AI_HOST_BETWEEN_SONG_DISABLED" }, { status: 423 });
    }

    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const state = await readJson<AnyRecord>(AI_HOST_DROP_STATE_FILE, { breakCount: 0 });

    const built = buildNiaScript(body, state);

    const voiceRes = await fetch(`${internalBaseUrl()}/api/radio/ai-host-voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostName: "Nia from Tha Core",
        segmentType: "jingle-link",
        title: `Nia ${built.talkType} ${built.breakCount}`,
        voice: process.env.OPENAI_AI_HOST_VOICE || "nova",
        script: built.script,
      }),
    });

    const voiceData = await voiceRes.json().catch(() => null);

    if (!voiceRes.ok || !voiceData?.ok || !voiceData?.audioUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_NEXT_DROP_VOICE_FAILED",
          status: voiceRes.status,
          detail: voiceData,
        },
        { status: 502 }
      );
    }

    const track = {
      id: `AI-Host/${voiceData.fileName || Date.now()}`,
      trackId: `AI-Host/${voiceData.fileName || Date.now()}`,
      title: "Nia from Tha Core",
      artist: "Nia from Tha Core",
      source: "AI_HOST",
      genreLane: "Jingles",
      lane: "Jingles",
      folder: "AI-Host",
      audioUrl: voiceData.audioUrl,
      streamUrl: voiceData.audioUrl,
      listen_url: voiceData.audioUrl,
      cleanAudioUrl: voiceData.audioUrl,
      returnedToSmartDj: true,
      held: false,
      cleanStatus: "PROCESSED_AUDIO_READY",
      bleepJobStatus: "PROCESSED_AUDIO_READY",
      aiHost: true,
      aiGeneratedVoice: true,
      talkType: built.talkType,
      script: built.script,
      durationSeconds: 8,
      estimatedSeconds: 8,
      aiHostAutoReturn: true,
      quickDrop: true,
    };

    const nextState = {
      ok: true,
      breakCount: built.breakCount,
      lastTalkType: built.talkType,
      lastScript: built.script,
      lastAudioUrl: voiceData.audioUrl,
      lastFileName: voiceData.fileName,
      updatedAt: new Date().toISOString(),
    };

    await writeJson(AI_HOST_DROP_STATE_FILE, nextState);

    return NextResponse.json({
      ok: true,
      route: "/api/radio/ai-host-next-drop",
      phase: "AI_HOST_BETWEEN_SONG_BRAIN_V1",
      safety: "CLEAN_AI_HOST_BETWEEN_SONG_DROP_READY",
      hostName: "Nia from Tha Core",
      talkType: built.talkType,
      script: built.script,
      audioUrl: voiceData.audioUrl,
      track,
      state: nextState,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI_HOST_NEXT_DROP_ROUTE_ERROR",
        message: error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}
