import { NextRequest, NextResponse } from "next/server";

type AnyRecord = Record<string, any>;

const VERSION = "AI_HOST_PROFILES_V1_DRY_ONLY";

type HostId = "nia" | "prodigy" | "diamond";

type HostProfile = {
  hostId: HostId;
  hostName: string;
  displayName: string;
  role: string;
  personality: string;
  mainTopics: string[];
  safeUse: string[];
  voiceEnv: string;
  defaultVoice: string;
  status: string;
};

const HOSTS: Record<HostId, HostProfile> = {
  nia: {
    hostId: "nia",
    hostName: "Nia from Tha Core",
    displayName: "Nia",
    role: "Main 24/7 host, news host, weekend program host, and personality voice",
    personality:
      "Warm Jamaican-Caribbean radio host. Natural, caring, lightly funny, peaceful, intelligent, never robotic, does not overuse the word clean.",
    mainTopics: [
      "news bulletins",
      "between-song hosting",
      "weekend programs",
      "regional big-ups",
      "life advice",
      "music handoffs",
    ],
    safeUse: [
      "active now",
      "can generate scripts",
      "can voice only after owner-approved route",
      "can broadcast only through approved program/broadcast flow",
    ],
    voiceEnv: "OPENAI_AI_HOST_NIA_VOICE",
    defaultVoice: "nova",
    status: "ACTIVE_MAIN_HOST",
  },
  prodigy: {
    hostId: "prodigy",
    hostName: "Prodigy from Tha Core",
    displayName: "Prodigy",
    role: "Male half of the Prodigy and Diamond co-host team; fun talk, listener questions, business/life comments, sports-energy, and smart everyday reasoning",
    personality:
      "Calm, sharp, confident male radio personality. Speaks with wisdom, street sense, business focus, and professional control. Gives practical advice without sounding stiff.",
    mainTopics: [
      "business mindset",
      "money discipline",
      "sports lessons",
      "technology",
      "world observations",
      "youth motivation",
      "community progress",
    ],
    safeUse: [
      "draft-only until voice is approved",
      "must not interrupt Nia news",
      "must not interrupt SmartZJ",
      "must not broadcast without owner approval",
    ],
    voiceEnv: "OPENAI_AI_HOST_PRODIGY_VOICE",
    defaultVoice: "onyx",
    status: "COHOST_PROFILE_READY_DRAFT_ONLY",
  },
  diamond: {
    hostId: "diamond",
    hostName: "Diamond from Tha Core",
    displayName: "Diamond",
    role: "Female half of the Prodigy and Diamond co-host team; entertainment, lifestyle, relationships, listener questions, fashion, culture, and fun audience engagement",
    personality:
      "Bright, classy, warm female radio personality. Stylish, funny, confident, respectful, and relatable. Brings sparkle without gossiping or getting messy.",
    mainTopics: [
      "entertainment culture",
      "fashion",
      "relationships",
      "women in business",
      "events",
      "community highlights",
      "music lifestyle",
    ],
    safeUse: [
      "draft-only until voice is approved",
      "must not spread rumors",
      "must not interrupt Nia news",
      "must not broadcast without owner approval",
    ],
    voiceEnv: "OPENAI_AI_HOST_DIAMOND_VOICE",
    defaultVoice: "shimmer",
    status: "COHOST_PROFILE_READY_DRAFT_ONLY",
  },
};

function cleanText(value: unknown, fallback = "", max = 2000) {
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function normalizeHostId(value: unknown): HostId {
  const raw = cleanText(value, "nia", 80).toLowerCase();
  if (raw === "prodigy") return "prodigy";
  if (raw === "diamond") return "diamond";
  return "nia";
}

function buildDryScript(host: HostProfile, body: AnyRecord) {
  const topic = cleanText(body.topic || body.dropType || "station-intro", "station-intro", 160);
  const durationSeconds = Math.max(20, Math.min(120, Number(body.durationSeconds || 45)));
  const ownerNotes = cleanText(body.ownerNotes || body.notes || "", "", 1000);

  if (host.hostId === "prodigy") {
    return [
      `This is Prodigy from Tha Core. Quick thought for the people locked in right now.`,
      `Whatever you are building, build it with patience. Fast moves can look good for a minute, but discipline is what keeps the door open.`,
      `Do not let pressure trick you into rushing the mission. Watch your money, protect your name, learn the game, and keep your circle honest.`,
      `Tha Core is still with you. Stay focused, stay steady, and let the music move you forward.`,
      ownerNotes ? `Owner note direction: ${ownerNotes}` : "",
    ].filter(Boolean).join(" ");
  }

  if (host.hostId === "diamond") {
    return [
      `Hey family, this is Diamond from Tha Core, sliding in with a little sparkle for your day.`,
      `Quick reminder: style is not only what you wear. It is how you carry yourself, how you speak, how you treat people, and how you recover when life tests you.`,
      `Keep your standards high, your energy graceful, and your heart protected. No need to be loud when your presence already says enough.`,
      `You are logged on and locked in to Tha Core. More music is on the way.`,
      ownerNotes ? `Owner note direction: ${ownerNotes}` : "",
    ].filter(Boolean).join(" ");
  }

  return [
    `This is Nia from Tha Core. You are logged on and locked in.`,
    `Keep the vibes steady, keep your mind clear, and stay close. More music is on the way.`,
  ].join(" ");
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-profiles",
    phase: VERSION,
    purpose:
      "Returns multi-host profiles for Nia plus the Prodigy and Diamond co-host team. Dry-only. Does not voice or broadcast.",
    activeHostNow: "nia",
    availableHosts: Object.values(HOSTS),
    broadcastStarted: false,
    voiceStarted: false,
    doesNotTouchNewsRunner: true,
    doesNotTouchCurrentBroadcast: true,
    doesNotTouchSmartZJ: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const host = HOSTS[normalizeHostId(body.hostId || body.host)];
    const script = buildDryScript(host, body);

    return NextResponse.json({
      ok: true,
      route: "/api/radio/ai-host-profiles",
      phase: VERSION,
      hostId: host.hostId,
      hostName: host.hostName,
      displayName: host.displayName,
      role: host.role,
      status: host.status,
      draftOnly: true,
      voiceStarted: false,
      broadcastStarted: false,
      doesNotTouchNewsRunner: true,
      doesNotTouchCurrentBroadcast: true,
      doesNotTouchSmartZJ: true,
      script,
      nextStep:
        "Review and approve the profile/script before connecting this host to voice or broadcast routes.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        phase: VERSION,
        error: "AI_HOST_PROFILE_ERROR",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

