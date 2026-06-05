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

// NIA_JAMAICA_DAYPART_V1
function jamaicaDayPart() {
  try {
    const hourText = new Intl.DateTimeFormat("en-JM", {
      timeZone: "America/Jamaica",
      hour: "numeric",
      hour12: false,
    }).format(new Date());

    const hour = Number(hourText);
    if (hour >= 5 && hour < 11) return "morning";
    if (hour >= 11 && hour < 15) return "midday";
    if (hour >= 15 && hour < 19) return "evening";
    return "late-night";
  } catch {
    return "day";
  }
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
    "jamaica-morning-update",
    "song-link",
    "time-check",
    "jamaica-road-safe",
    "lane-vibe",
    "jamaica-entertainment-lite",
    "sports-lite",
    "station-vibe",
    "next-music-tease",
  ];

  return types[Math.abs(breakCount - 1) % types.length] || "song-link";
}


// NIA_NEXT_TITLE_SANITY_GUARD_V1
// Stop Nia from saying weak/generated titles like "coming up next, free".
function cleanNiaNextTitleForSpeech(value: unknown) {
  const raw = cleanText(value, "").slice(0, 180)
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!raw) return "";

  const lower = raw.toLowerCase();
  const weakExact = new Set([
    "free",
    "test",
    "audio",
    "mp3",
    "clean",
    "unknown",
    "track",
    "song",
    "music",
    "next",
    "none",
  ]);

  const weakWords = new Set([
    "mp3",
    "clean",
    "lyrics",
    "lyric",
    "official",
    "audio",
    "video",
    "visualizer",
    "free",
    "test",
    "unknown",
  ]);

  const normalized = lower.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  if (weakExact.has(normalized)) return "";

  const meaningfulWords = normalized
    .split(/\s+/)
    .filter((word) => word && !weakWords.has(word) && !/^\d+$/.test(word));

  if (meaningfulWords.length < 2) return "";

  return raw.slice(0, 100);
}

// NIA_FEATURE_COMMENT_60_90_V1
// Longer Nia feature comments: 60-90 seconds, separate from short links and full news blocks.
function buildNiaFeatureComment(body: AnyRecord, lane: string) {
  const topic = cleanText(body.featureTopic || body.topic || "station energy", "").slice(0, 120);
  const suppliedText = cleanText(body.featureText || body.commentText || "", "").slice(0, 1600);

  if (suppliedText) {
    return suppliedText.replace(/\s+/g, " ").trim().slice(0, 1600);
  }

  const lowerTopic = topic.toLowerCase();

  if (lowerTopic.includes("jamaica") || lowerTopic.includes("morning")) {
    return "You are inside Tha Core. Clean vibes, clean energy. Quick thought for Jamaica today. Some days move fast, some days test your patience, but we still have to keep the mind steady and the mission clear. Whether you are at work, on the road, in the shop, at school, or handling business from home, keep moving with sense. Tha Core is here to keep the sound clean, the energy focused, and the day feeling a little lighter. No long lecture, just a reminder: protect your peace, make smart moves, and stay locked in.";
  }

  if (lowerTopic.includes("sports")) {
    return "You are inside Tha Core. Clean vibes, clean energy. Sports teaches one thing over and over. Talent matters, but discipline decides who lasts. You can have skill, hype, and a big moment, but the people who keep showing up are the ones who build real wins. Same thing in life, same thing in business, same thing on this station. Big up every sports fan locked in. Win or lose, keep the energy clean and the mindset strong.";
  }

  if (lowerTopic.includes("entertainment")) {
    return "You are inside Tha Core. Clean vibes, clean energy. Entertainment moves fast, but not every rumor deserves your attention. Some stories are real, some are noise, and some are just people trying to trend before lunch. Around here, we keep it light, clean, and respectful. If it is verified, we can talk about it. If it is messy, we do not need to carry it like luggage. The music stays in front, the vibe stays easy, and Tha Core keeps moving.";
  }

  return `You are inside Tha Core. Clean vibes, clean energy. Quick thought while the ${lane || "music"} keeps moving. A real station is not just songs back to back. It is timing, feeling, voice, safety, and connection. SmartZJ keeps the clean music flowing, and Nia is here to add the human touch without taking over the whole room. Short when it needs to be short, deeper when the moment calls for it, and always clean enough for everybody listening. Stay close. The music continues right here.`;
}
function buildNiaScript(body: AnyRecord, state: AnyRecord) {
  const nextCount = Math.max(1, Number(state.breakCount || 0) + 1);
  const featureMode = body.featureMode === true || body.longComment === true || cleanText(body.commentMode || "", "") === "feature";
  const talkType = featureMode ? "feature-comment" : pickTalkType(nextCount);

  const previousTitle = cleanSongTitle(body.previousTitle || body.currentTitle || "");
  const previousArtist = cleanText(body.previousArtist || body.currentArtist || "");
  const lane = cleanText(body.lane || body.genreLane || "the clean rotation", "the clean rotation");
  const nextTitle = cleanNiaNextTitleForSpeech(body.nextTitle);
  const timeText = jamaicaTimeText();
  const dayPart = jamaicaDayPart();

  const sayName = nextCount === 1 || nextCount % 6 === 0;
  const intro = sayName ? "This is Nia from Tha Core. " : "";

  let script = "";

  if (talkType === "jamaica-morning-update") {
    if (dayPart === "morning") {
      script = `${intro}Good morning Jamaica. Quick check, clean vibes are up on Tha Core. Move safe today, music continues.`;
    } else if (dayPart === "midday") {
      script = `${intro}Midday check Jamaica. Keep your pace steady and your energy clean. Music continues.`;
    } else if (dayPart === "evening") {
      script = `${intro}Evening energy Jamaica. Big up everybody heading home or holding the work. Clean music continues.`;
    } else {
      script = `${intro}Late-night check Jamaica. Keep it smooth, keep it safe. Tha Core stays with you.`;
    }
  } else if (talkType === "jamaica-road-safe") {
    script = `${intro}Jamaica, move safe on the road and keep your head clear. Good music stays close.`;
  } else if (talkType === "jamaica-entertainment-lite") {
    script = `${intro}Entertainment scene always moving, but right now the clean music is the headline. Stay close.`;
  } else if (talkType === "song-link" && previousTitle) {
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
    script = `${intro}You are inside Tha Core. Clean vibes, good frequency, and more music right now.`;
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
      durationSeconds: built.talkType === "feature-comment" ? 75 : 8,
      estimatedSeconds: built.talkType === "feature-comment" ? 75 : 8,
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
