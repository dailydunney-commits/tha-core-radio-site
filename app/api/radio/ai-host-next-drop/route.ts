import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyRecord = Record<string, any>;

const DATA_DIR = join(process.cwd(), ".data");
const AI_HOST_DROP_STATE_FILE = join(DATA_DIR, "ai-host-between-song-state.json");
// NIA_24_7_HOST_PERSONALITY_LAYER_NOTE_V1: normal Nia drops remain between every 2-3 songs; separate personality moments can run every 15-20 minutes without replacing song handoffs.
// AI_HOST_MULTI_HOST_READY_V1
// Nia is the active host now, but this route is shaped for Prodigy, Diamond,
// and future AI hosts without mixing their state, voices, or personality rules.
type AiHostId = "nia" | "prodigy" | "diamond";

type AiHostProfile = {
  hostId: AiHostId;
  hostName: string;
  voiceEnv: string;
  defaultVoice: string;
  role: string;
};

const AI_HOST_PROFILES: Record<AiHostId, AiHostProfile> = {
  nia: {
    hostId: "nia",
    hostName: "Nia from Tha Core",
    voiceEnv: "OPENAI_AI_HOST_NIA_VOICE",
    defaultVoice: "nova",
    role: "main-24-7-host-news-and-personality",
  },
  prodigy: {
    hostId: "prodigy",
    hostName: "Prodigy from Tha Core",
    voiceEnv: "OPENAI_AI_HOST_PRODIGY_VOICE",
    defaultVoice: "onyx",
    role: "professional-talk-host",
  },
  diamond: {
    hostId: "diamond",
    hostName: "Diamond from Tha Core",
    voiceEnv: "OPENAI_AI_HOST_DIAMOND_VOICE",
    defaultVoice: "shimmer",
    role: "entertainment-and-lifestyle-host",
  },
};

function normalizeAiHostId(value: unknown): AiHostId {
  const raw = String(value || "nia").toLowerCase().trim();
  if (raw === "prodigy") return "prodigy";
  if (raw === "diamond") return "diamond";
  return "nia";
}

function getAiHostProfile(value: unknown): AiHostProfile {
  return AI_HOST_PROFILES[normalizeAiHostId(value)];
}

function getAiHostDropState(rootState: AnyRecord, host: AiHostProfile): AnyRecord {
  const hosts = rootState && typeof rootState === "object" ? rootState.hosts : null;
  if (hosts && typeof hosts === "object" && hosts[host.hostId]) {
    return hosts[host.hostId] as AnyRecord;
  }

  // Backward compatibility: old Nia state lived at the root.
  if (host.hostId === "nia" && rootState && typeof rootState === "object") {
    return rootState;
  }

  return { breakCount: 0 };
}

function setAiHostDropState(rootState: AnyRecord, host: AiHostProfile, hostState: AnyRecord): AnyRecord {
  const nextRoot: AnyRecord = rootState && typeof rootState === "object" ? { ...rootState } : {};
  const currentHosts = nextRoot.hosts && typeof nextRoot.hosts === "object" ? nextRoot.hosts : {};

  nextRoot.hosts = {
    ...currentHosts,
    [host.hostId]: {
      ...hostState,
      hostId: host.hostId,
      hostName: host.hostName,
      role: host.role,
    },
  };

  nextRoot.activeHostId = host.hostId;
  nextRoot.activeHostName = host.hostName;
  nextRoot.updatedAt = new Date().toISOString();

  // Keep legacy Nia root fields so old readers do not break.
  if (host.hostId === "nia") {
    nextRoot.ok = hostState.ok;
    nextRoot.breakCount = hostState.breakCount;
    nextRoot.lastTalkType = hostState.lastTalkType;
    nextRoot.lastBlockSegmentName = hostState.lastBlockSegmentName;
    nextRoot.lastBlockSegmentCalloutAt = hostState.lastBlockSegmentCalloutAt;
    nextRoot.lastScript = hostState.lastScript;
    nextRoot.lastAudioUrl = hostState.lastAudioUrl;
    nextRoot.lastFileName = hostState.lastFileName;
  }

  return nextRoot;
}

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

// NIA_SHORT_DROP_PERSONALITY_ROTATION_V1
// 10-30 second Nia drops should rotate more than news/music links.
function pickTalkType(breakCount: number) {
  const types = [
    "jamaica-morning-update",
    "song-link",
    "time-check",
    "global-city-big-up",
    "money-tip",
    "relationship-life-advice",
    "clean-joke",
    "world-observation",
    "music-culture-note",
    "sports-entertainment-lite",
    "social-comment",
    "country-town-big-up",
    "jamaica-road-safe",
    "lane-vibe",
    "next-music-tease",
    "station-vibe",
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


// NIA_BLOCK_SEGMENT_CALLOUT_30_MIN_V1
function cleanNiaBlockSegmentName(value: unknown) {
  return cleanText(value || "", "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function minutesSinceIso(value: unknown) {
  const ms = Date.parse(String(value || ""));
  if (!Number.isFinite(ms)) return 999999;
  return Math.floor((Date.now() - ms) / 60000);
}

function cleanNiaPresetName(value: unknown) {
  return cleanText(value || "", "")
    .replace(/[\s-]+/g, "_")
    .toUpperCase()
    .trim();
}

// NIA_FEATURE_COMMENT_ROTATION_V1
function pickNiaFeatureTopic(breakCount: number, lane: string) {
  const topics = [
    "music world and clean radio culture",
    "Dancehall Reggae Hip-Hop and R&B energy",
    "Hollywood Bollywood and entertainment without gossip",
    "relationships and communication",
    "work money pressure and daily discipline",
    "sports mindset and staying consistent",
    "Jamaica road sense and community life",
    "fun clean joke and light station moment",
    "serious topic with calm respectful tone",
    "general life reminder for listeners"
  ];

  const index = Math.abs(Number(breakCount || 0)) % topics.length;
  const picked = topics[index] || topics[0];
  return `${picked} while the ${lane || "music"} keeps moving`;
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
    return "You are inside Tha Core. Good vibes, steady energy. Quick thought for Jamaica today. Some days move fast, some days test your patience, but we still have to keep the mind steady and the mission clear. Whether you are at work, on the road, in the shop, at school, or handling business from home, keep moving with sense. Tha Core is here to keep the sound clean, the energy focused, and the day feeling a little lighter. No long lecture, just a reminder: protect your peace, make smart moves, and stay locked in.";
  }

  if (lowerTopic.includes("sports")) {
    return "You are inside Tha Core. Good vibes, steady energy. Sports teaches one thing over and over. Talent matters, but discipline decides who lasts. You can have skill, hype, and a big moment, but the people who keep showing up are the ones who build real wins. Same thing in life, same thing in business, same thing on this station. Big up every sports fan locked in. Win or lose, keep the energy clean and the mindset strong.";
  }

  if (lowerTopic.includes("entertainment")) {
    return "You are inside Tha Core. Good vibes, steady energy. Entertainment moves fast, but not every rumor deserves your attention. Some stories are real, some are noise, and some are just people trying to trend before lunch. Around here, we keep it light, clean, and respectful. If it is verified, we can talk about it. If it is messy, we do not need to carry it like luggage. The music stays in front, the vibe stays easy, and Tha Core keeps moving.";
  }

  return `You are inside Tha Core. Good vibes, steady energy. Quick thought while the ${lane || "music"} keeps moving. A real station is not just songs back to back. It is timing, feeling, voice, safety, and connection. SmartZJ keeps the music flowing, and Nia is here to add the human touch without taking over the whole room. Short when it needs to be short, deeper when the moment calls for it, and always safe enough for everybody listening. Stay close. The music continues right here.`;
}
// NIA_SHORT_DROP_BIG_UPS_V1
function pickNiaPlaceBigUp(breakCount: number) {
  const places = [
    "Montego Bay, St. James, Kingston, Portmore, Hanover, Trelawny, Ocho Rios, Negril, and Mandeville",
    "Jamaica, Trinidad and Tobago, Barbados, Guyana, Bahamas, St. Lucia, Grenada, Antigua, and the wider Caribbean",
    "New York, Miami, Atlanta, Toronto, London, Birmingham, Brixton, Brooklyn, and every diaspora listener",
    "Africa, the United States, Canada, the United Kingdom, Latin America, Europe, Asia, and every listener worldwide",
    "the taxi stands, shops, offices, studios, kitchens, school runs, night workers, early risers, and late-night thinkers",
  ];

  return places[Math.abs(Number(breakCount || 0)) % places.length] || places[0];
}

// NIA_SHORT_DROP_LIGHT_JOKES_ADVICE_V1
function pickNiaShortAdvice(breakCount: number) {
  const tips = [
    "Small money tip: before you buy it, ask if future you will thank you or fuss at you.",
    "Relationship reminder: good communication saves more drama than any long paragraph after midnight.",
    "Life advice: protect your peace before your phone battery. Both matter, but peace takes longer to recharge.",
    "Work reminder: pressure is real, but rushing every decision can make the bill bigger.",
    "Clean joke: some people say they are on a budget, then order like the calculator resigned.",
    "World thought: every city has noise, but discipline is still a language everybody understands.",
    "Music note: a good song can lift a room, but a clean station keeps everybody comfortable in that room.",
    "Social reminder: not every post needs a reply. Sometimes silence is the premium feature.",
  ];

  return tips[Math.abs(Number(breakCount || 0)) % tips.length] || tips[0];
}

// NIA_SHORT_DROP_THA_CORE_PRONUNCIATION_LOCK_V1
// NIA_SHORT_DROP_ALWAYS_TAG_THA_CORE_V1
function lockThaCorePronunciation(script: string) {
  const clean = String(script || "")
    .replace(/\bTah Core\b/gi, "Tha Core")
    .replace(/\bTha\s+core\b/g, "Tha Core")
    .replace(/\s+/g, " ")
    .trim();

  if (!/\bTha Core\b/.test(clean)) {
    return (clean + " Tha Core stays with you.").replace(/\s+/g, " ").trim();
  }

  return clean;
}


// AI_HOST_TRACK_ANNOUNCER_LOCK_V1
// All Tha Core AI hosts may announce exact artist/title/year only from locked SmartZJ metadata.
// If upcoming track is not locked, use generic radio hype instead of guessing.
function cleanTrackYear(value: unknown) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/\b(19\d{2}|20\d{2})\b/);
  return match ? match[1] : "";
}

function pickTrackEraLabel(year: string) {
  const y = Number(year);
  const now = new Date().getFullYear();

  if (!Number.isFinite(y)) return "";
  if (y >= now - 1) return "brand new fresh track";
  if (y >= now - 5) return "recent favorite";
  if (y < 2005) return "hit from yesteryear";
  if (y < 2015) return "throwback favorite";
  return "modern classic";
}

function hasLockedTrackIdentity(track: AnyRecord) {
  const title = cleanNiaNextTitleForSpeech(track?.title || track?.name || track?.songTitle);
  const artist = cleanText(track?.artist || track?.artistName || "");
  const audioUrl = cleanText(track?.audioUrl || track?.cleanAudioUrl || track?.streamUrl || track?.listen_url || "");
  const trackId = cleanText(track?.trackId || track?.id || "");

  return Boolean(title && audioUrl && trackId && !audioUrl.includes("azuracast"));
}

function buildTrackAnnouncement(track: AnyRecord, direction: "previous" | "next") {
  const title = cleanSongTitle(track?.title || track?.name || track?.songTitle || "");
  const artist = cleanText(track?.artist || track?.artistName || "");
  const year = cleanTrackYear(track?.year || track?.releaseYear || track?.released || track?.date || "");
  const era = pickTrackEraLabel(year);

  if (!title && !artist) return "";

  const titlePart = title ? `"${title}"` : "that track";
  const artistPart = artist ? `${artist} with ` : "";
  const yearPart = year ? `, from ${year}` : "";
  const eraPart = era ? ` — ${era}` : "";

  if (direction === "previous") {
    return `That was ${artistPart}${titlePart}${yearPart}${eraPart}.`;
  }

  return `Coming up next, ${artistPart}${titlePart}${yearPart}${eraPart}.`;
}

function getLockedNextAnnouncement(body: AnyRecord) {
  const nextTrack = body.nextTrack && typeof body.nextTrack === "object" ? body.nextTrack : {};
  const lockedFlag =
    body.nextTrackLocked === true ||
    body.lockedNextTrack === true ||
    nextTrack.locked === true ||
    nextTrack.nextTrackLocked === true ||
    nextTrack.lockStatus === "LOCKED_FOR_AI_HOST";

  if (!lockedFlag || !hasLockedTrackIdentity(nextTrack)) return "";

  return buildTrackAnnouncement(nextTrack, "next");
}

function getPreviousTrackAnnouncement(body: AnyRecord) {
  const previousTrack =
    body.previousTrack && typeof body.previousTrack === "object"
      ? body.previousTrack
      : {
          title: body.previousTitle || body.currentTitle,
          artist: body.previousArtist || body.currentArtist,
          year: body.previousYear || body.currentYear || body.releaseYear,
          trackId: body.previousTrackId || body.currentTrackId || "previous-track",
          audioUrl: body.previousAudioUrl || body.currentAudioUrl || "/already-played",
        };

  return buildTrackAnnouncement(previousTrack, "previous");
}

function pickGenericMusicHype(breakCount: number, lane: string) {
  const lines = [
    `A fiery ${lane || "track"} coming up next inside Tha Core.`,
    "A hit from yesteryear could be loading next. Stay close.",
    "Brand new fresh energy could be coming up — no guessing, just vibes.",
    "Hot, hot, hot — it is heating up inside Tha Core studio.",
    "Music burning the place down inside Tha Core. Stay locked.",
    "Another big tune is loading. Tha Core keeps the energy moving.",
    "Old school flavor or fresh fire, SmartZJ has the next move ready.",
  ];

  return lines[Math.abs(Number(breakCount || 0)) % lines.length] || lines[0];
}


function buildNiaScript(body: AnyRecord, state: AnyRecord) {
  const nextCount = Math.max(1, Number(state.breakCount || 0) + 1);
    const niaPreset = cleanNiaPresetName(body.niaPreset || body.preset || body.mode || "");
  const featureMode =
    body.featureMode === true ||
    body.longComment === true ||
    cleanText(body.commentMode || "", "") === "feature" ||
    niaPreset === "NIA_FEATURE_COMMENT";

  const blockSegmentName = cleanNiaBlockSegmentName(
    body.blockSegmentName ||
      body.activeBlockName ||
      body.scheduleBlockName ||
      body.programBlockName ||
      ""
  );
  const blockCalloutMinutes = Math.max(
    5,
    Math.min(
      180,
      Number(body.blockSegmentEveryMinutes || process.env.AI_HOST_BLOCK_SEGMENT_CALLOUT_MINUTES || 30)
    )
  );
  const shouldCallBlockSegment =
    Boolean(blockSegmentName) &&
    (
      cleanNiaBlockSegmentName(state.lastBlockSegmentName) !== blockSegmentName ||
      minutesSinceIso(state.lastBlockSegmentCalloutAt) >= blockCalloutMinutes
    );

  const autoFeatureEveryBreaks = Math.max(
    0,
    Number(body.featureCommentEveryBreaks || process.env.AI_HOST_FEATURE_COMMENT_EVERY_BREAKS || 8)
  );
  const shouldAutoFeature =
    !featureMode &&
    !shouldCallBlockSegment &&
    autoFeatureEveryBreaks > 0 &&
    nextCount > 0 &&
    nextCount % autoFeatureEveryBreaks === 0;

  let talkType = featureMode || shouldAutoFeature ? "feature-comment" : pickTalkType(nextCount);
  if (!featureMode && shouldCallBlockSegment) {
    talkType = "block-segment-callout";
  }

  const previousTitle = cleanSongTitle(body.previousTitle || body.currentTitle || "");
  const previousArtist = cleanText(body.previousArtist || body.currentArtist || "");
  const lane = cleanText(body.lane || body.genreLane || "the clean rotation", "the clean rotation");
  const nextTitle =
cleanNiaNextTitleForSpeech(body.nextTitle);
const lockedNextAnnouncement = getLockedNextAnnouncement(body);
const previousTrackAnnouncement = getPreviousTrackAnnouncement(body);
const timeText = jamaicaTimeText();
  const dayPart = jamaicaDayPart();

  const sayName = nextCount === 1 || nextCount % 6 === 0;
  const intro = sayName ? "This is Nia from Tha Core. " : "";

  let script = "";

  if (talkType === "jamaica-morning-update") {
    if (dayPart === "morning") {
      script = `${intro}Good morning Jamaica. Quick check, the vibes are up on Tha Core. Move safe today, music continues.`;
    } else if (dayPart === "midday") {
      script = `${intro}Midday check Jamaica. Keep your pace steady and your energy steady. Music continues.`;
    } else if (dayPart === "evening") {
      script = `${intro}Evening energy Jamaica. Big up everybody heading home or holding the work. The music continues.`;
    } else {
      script = `${intro}Late-night check Jamaica. Keep it smooth, keep it safe. Tha Core stays with you.`;
    }
  } else if (talkType === "jamaica-road-safe") {
    script = `${intro}Jamaica, move safe on the road and keep your head clear. Good music stays close.`;
  } else if (talkType === "jamaica-entertainment-lite") {
    script = `${intro}Entertainment scene always moving, but right now the music is the headline. Stay close.`;
  } else if (talkType === "block-segment-callout") {
    script = `${intro}You are inside Tha Core. This is ${blockSegmentName}. Good vibes, steady energy. Stay close.`;
  } else if (talkType === "global-city-big-up") {
  script = `${intro}Big up ${pickNiaPlaceBigUp(nextCount)}. Wherever you are listening from, Tha Core sees you. Clean music, good energy, worldwide connection.`;
} else if (talkType === "country-town-big-up") {
  script = `${intro}Country to country, town to town, big up the listeners locked in. From Jamaica to the world, Tha Core keeps the sound clean and the energy easy.`;
} else if (talkType === "money-tip") {
  script = `${intro}${pickNiaShortAdvice(nextCount)} Quick money thought, move smart before you move fast. The music continues.`;
} else if (talkType === "relationship-life-advice") {
  script = `${intro}${pickNiaShortAdvice(nextCount)} Keep love respectful, keep your standards clear, and keep the music close.`;
} else if (talkType === "clean-joke") {
  script = `${intro}${pickNiaShortAdvice(nextCount)} Light moment only, no stress. Tha Core keeps it clean and keeps it moving.`;
} else if (talkType === "world-observation") {
  script = `${intro}Quick world thought. Different places, same pressure: bills, goals, family, traffic, dreams. Big up everybody trying to make progress today.`;
} else if (talkType === "music-culture-note") {
  script = `${intro}Music culture is powerful. Dancehall, Reggae, Hip-Hop, R&B, old school and new school all have a story. Tha Core keeps the story clean for everybody.`;
} else if (talkType === "sports-entertainment-lite") {
  script = `${intro}Sports and entertainment move fast, but discipline still wins. Big up the fans, the artists, the players, and everybody building something real.`;
} else if (talkType === "social-comment") {
  script = `${intro}Quick social reminder: not every trending thing deserves your whole mood. Choose peace, choose progress, and let the music breathe.`;
} else if (talkType === "feature-comment") {
    const featureBody = shouldAutoFeature
      ? {
          ...body,
          featureTopic:
            cleanText(body.featureTopic || body.topic || "", "") ||
            pickNiaFeatureTopic(nextCount, lane),
        }
      : body;
    script = buildNiaFeatureComment(featureBody, lane);
  } else if (talkType === "song-link" && (previousTrackAnnouncement || previousTitle)) {
  script = `${intro}${previousTrackAnnouncement || `That was ${previousTitle}.`} ${lockedNextAnnouncement || pickGenericMusicHype(nextCount, lane)}`;
  } else if (talkType === "lane-vibe") {
    script = `${intro}${lane} vibes rolling. Clean music, good frequency. Stay close.`;
  } else if (talkType === "time-check" && timeText) {
    script = `${intro}Quick time check, ${timeText} in Jamaica. The music continues.`;
  } else if (talkType === "weather-safe") {
    script = `${intro}Quick weather reminder. Move safe out there. Music continues now.`;
  } else if (talkType === "entertainment-lite") {
    script = `${intro}Entertainment always moving, but the music is the story right now.`;
  } else if (talkType === "sports-lite") {
    script = `${intro}Sports fans, big up yourself. Good energy, good music.`;
  } else if (talkType === "next-music-tease") {
  script = `${intro}${lockedNextAnnouncement || pickGenericMusicHype(nextCount, lane)}`;
  } else {
    script = `${intro}You are inside Tha Core. Good frequency, steady vibes, and more music right now.`;
  }

  return {
    script: script
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, talkType === "feature-comment" ? 1600 : 420),
    talkType,
    breakCount: nextCount,
    blockSegmentName: talkType === "block-segment-callout" ? blockSegmentName : "",
    blockSegmentCalloutAt: talkType === "block-segment-callout" ? new Date().toISOString() : "",
  };
}

export async function GET() {
  const state = await readJson<AnyRecord>(AI_HOST_DROP_STATE_FILE, {});
  const activeHost = getAiHostProfile(process.env.AI_HOST_ACTIVE_HOST_ID || "nia");

  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-next-drop",
    phase: "AI_HOST_BETWEEN_SONG_BRAIN_V2_MULTI_HOST_READY",
    enabled: process.env.AI_HOST_BETWEEN_SONG_ENABLED !== "false",
    activeHostId: activeHost.hostId,
    hostName: activeHost.hostName,
    availableHosts: Object.keys(AI_HOST_PROFILES),
    state,
  });
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.AI_HOST_BETWEEN_SONG_ENABLED === "false") {
      return NextResponse.json({ ok: false, error: "AI_HOST_BETWEEN_SONG_DISABLED" }, { status: 423 });
    }

    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const hostProfile = getAiHostProfile(
      body.hostId || body.host || process.env.AI_HOST_ACTIVE_HOST_ID || "nia"
    );
    const rootState = await readJson<AnyRecord>(AI_HOST_DROP_STATE_FILE, {
      breakCount: 0,
      hosts: {},
    });
    const state = getAiHostDropState(rootState, hostProfile);

    const builtRaw = buildNiaScript(body, state);
  const built = {
    ...builtRaw,
    script: lockThaCorePronunciation(builtRaw.script),
  };

    const voiceRes = await fetch(`${internalBaseUrl()}/api/radio/ai-host-voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostName: hostProfile.hostName,
        segmentType: "jingle-link",
        title: `${hostProfile.hostName} ${built.talkType} ${built.breakCount}`,
        voice:
          process.env[hostProfile.voiceEnv] ||
          process.env.OPENAI_AI_HOST_VOICE ||
          hostProfile.defaultVoice,
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
      aiHostId: hostProfile.hostId,
      aiHostName: hostProfile.hostName,
      aiGeneratedVoice: true,
      talkType: built.talkType,
      script: built.script,
      durationSeconds: built.talkType === "feature-comment" ? 75 : 18,
      estimatedSeconds: built.talkType === "feature-comment" ? 75 : 18,
      aiHostAutoReturn: true,
      quickDrop: true,
    };

    const nextState = {
      ok: true,
      hostId: hostProfile.hostId,
      hostName: hostProfile.hostName,
      breakCount: built.breakCount,
      lastTalkType: built.talkType,
      lastBlockSegmentName: built.blockSegmentName || state.lastBlockSegmentName || "",
      lastBlockSegmentCalloutAt:
        built.blockSegmentCalloutAt || state.lastBlockSegmentCalloutAt || "",
      lastScript: built.script,
      lastAudioUrl: voiceData.audioUrl,
      lastFileName: voiceData.fileName,
      updatedAt: new Date().toISOString(),
    };

    await writeJson(AI_HOST_DROP_STATE_FILE, setAiHostDropState(rootState, hostProfile, nextState));

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

