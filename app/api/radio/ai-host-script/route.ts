import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// LOCAL_OWNER_AI_HOST_SCRIPT_BRIDGE_V1
// Live radio AI-host script route now bridges to Owner AI Studio local script engine.
// No OpenAI when provider is local. No ElevenLabs. No external API calls.

type AiHostScriptBody = {
  provider?: string;
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
  "nia-drop",
  "nia-interlude",
]);

const UNSAFE_SCRIPT_PATTERN =
  /\b(f+u+c+k+|s+h+i+t+|b+i+t+c+h+|p+u+s+s+y+|d+i+c+k+|c+o+c+k+|c+u+n+t+|n+i+g+g+a+|n+i+g+g+e+r+)\b/gi;

function internalBaseUrl() {
  return String(process.env.SMARTZJ_INTERNAL_BASE_URL || "http://127.0.0.1:3101").replace(/\/+$/, "");
}

function normalizeScriptText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, " - ")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/Â/g, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function cleanText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return normalizeScriptText(value).replace(/\s+/g, " ").trim().slice(0, 900);
}

function clampDuration(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 25;
  return Math.max(8, Math.min(90, Math.round(n)));
}

function mapDurationToOwnerLength(seconds: number) {
  if (seconds <= 20) return "15 seconds";
  if (seconds <= 45) return "30 seconds";
  if (seconds <= 75) return "60 seconds";
  return "90 seconds";
}

function mapSegmentTypeToOwnerScriptType(segmentType: string) {
  if (segmentType === "station-id" || segmentType === "jingle-link") return "Jingle / Drop";
  if (segmentType === "song-intro" || segmentType === "song-outro") return "Music Intro";
  if (segmentType === "promo") return "Business Promo";
  if (segmentType === "sponsor-read") return "Sponsor Read";
  return "Nia Talk Break";
}

function mapVibeToOwnerTone(vibe: string) {
  const lower = vibe.toLowerCase();
  if (lower.includes("hype") || lower.includes("energy")) return "Hype";
  if (lower.includes("smooth")) return "Smooth";
  if (lower.includes("funny") || lower.includes("joke")) return "Funny";
  if (lower.includes("serious")) return "Serious";
  if (lower.includes("professional")) return "Professional";
  return "Clean Jamaican Radio";
}

function buildLocalDetails(body: AiHostScriptBody) {
  const hostName = cleanText(body.hostName, "Nia from Tha Core");
  const rawSegmentType = cleanText(body.segmentType, "general-talk");
  const segmentType = SEGMENT_TYPES.has(rawSegmentType) ? rawSegmentType : "general-talk";
  const topic = cleanText(body.topic, "clean music, daily life, motivation, and community talk");
  const vibe = cleanText(body.vibe, "warm Jamaican radio energy, professional, clean, confident");
  const lane = cleanText(body.lane, "current clean rotation");
  const sponsorName = cleanText(body.sponsorName, "");
  const callToAction = cleanText(body.callToAction, "Keep it locked to Tha Core Online Radio.");
  const extraNotes = cleanText(body.extraNotes, "");
  const durationSeconds = clampDuration(body.durationSeconds);

  // LOCAL_AI_HOST_SCRIPT_BRIDGE_SPOKEN_DETAILS_V2
  // Owner Nia Talk Break speaks details directly, so details must be listener-ready spoken copy.
  const naturalTopic = topic || "daily life, motivation, money discipline, music, and community energy";
  const topicLine = naturalTopic.replace(/\.$/, "");
  const sponsorLine = sponsorName ? ` Big up ${sponsorName} for supporting clean community radio energy.` : "";

  let details = "";

  if (segmentType === "nia-interlude") {
    details = `Let us reason for a moment about ${topicLine}. Real life can get loud, bills can press, people can test your patience, and the road to progress does not always move fast. But the win is in how you steady yourself. Spend with sense, protect your peace, keep good people close, enjoy the music, and do one thing today that moves your life forward.${sponsorLine}`;
  } else if (segmentType === "nia-drop") {
    details = `Quick reminder before the music rolls again: keep your mind clear, your money disciplined, your energy clean, and your standards high. Small steps still count when you keep moving with purpose.${sponsorLine}`;
  } else if (segmentType === "song-intro" || segmentType === "song-outro") {
    details = `The music is moving through ${lane}, and the vibe stays clean. Stay close, enjoy the next selection, and keep the energy right where it needs to be.${sponsorLine}`;
  } else if (segmentType === "sponsor-read") {
    details = `${sponsorName || "Our sponsor"} supports clean radio, good music, and real community connection. Support the people who support the culture. ${callToAction}`;
  } else if (segmentType === "promo") {
    details = `If you are building a brand, promoting a service, or pushing an event, make the message clear and make the presentation professional. Let the people see it, hear it, and remember it. ${callToAction}${sponsorLine}`;
  } else {
    details = `You are locked in with clean music, real energy, and good conversation. Today we keep the focus on ${topicLine}, while the mission keeps moving and the people stay connected.${sponsorLine}`;
  }

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
    ownerScriptType: mapSegmentTypeToOwnerScriptType(segmentType),
    ownerTone: mapVibeToOwnerTone(vibe),
    ownerLength: mapDurationToOwnerLength(durationSeconds),
    details,
  };
}

function extractOwnerScript(data: any): string {
  const candidates = [
    data?.script,
    data?.text,
    data?.output,
    data?.content,
    data?.result?.script,
    data?.result?.text,
    data?.data?.script,
    data?.data?.text,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return normalizeScriptText(candidate);
    }
  }

  if (Array.isArray(data?.sections)) {
    const joined = data.sections
      .map((section: any) => typeof section === "string" ? section : section?.text || section?.script || "")
      .filter(Boolean)
      .join("\n\n");
    if (joined.trim()) return normalizeScriptText(joined);
  }

  return "";
}

async function callOwnerLocalScriptEngine(built: ReturnType<typeof buildLocalDetails>) {
  const upstream = await fetch(`${internalBaseUrl()}/api/owner/ai-script-generator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scriptType: built.ownerScriptType,
      tone: built.ownerTone,
      length: built.ownerLength,
      details: built.details,
      source: "radio-ai-host-local-bridge",
      provider: "local",
    }),
  });

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok || !data?.ok) {
    return {
      ok: false,
      status: upstream.status,
      data,
      script: "",
    };
  }

  return {
    ok: true,
    status: upstream.status,
    data,
    script: extractOwnerScript(data),
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-script",
    phase: "LOCAL_OWNER_AI_HOST_SCRIPT_BRIDGE_V1",
    provider: "local-owner-ai-studio",
    externalProvidersEnabled: false,
    keyPresent: false,
    voiceEnabled: false,
    ownerSource: "/api/owner/ai-script-generator",
    note: "Live radio script route is bridged to the existing Owner AI Studio local script engine.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AiHostScriptBody;
    const provider = cleanText(body.provider, "local").toLowerCase();

    if (provider !== "local") {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_EXTERNAL_PROVIDER_DISABLED",
          message: "This route is locked to the local Owner AI Studio provider. No OpenAI or ElevenLabs call was made.",
          allowedProvider: "local",
        },
        { status: 400 }
      );
    }

    const built = buildLocalDetails(body);
    const localResult = await callOwnerLocalScriptEngine(built);

    if (!localResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "OWNER_LOCAL_SCRIPT_ENGINE_FAILED",
          status: localResult.status,
          detail: localResult.data?.error || localResult.data?.message || "Owner local script engine did not return ok.",
        },
        { status: 502 }
      );
    }

    const rawScript = normalizeScriptText(localResult.script);

    if (!rawScript) {
      return NextResponse.json(
        {
          ok: false,
          error: "EMPTY_LOCAL_AI_HOST_SCRIPT",
          message: "Owner local script engine returned no usable script text.",
          ownerResponseKeys: Object.keys(localResult.data || {}),
        },
        { status: 502 }
      );
    }

    const unsafeHits = rawScript.match(UNSAFE_SCRIPT_PATTERN) || [];
    const safeScript = rawScript.replace(UNSAFE_SCRIPT_PATTERN, "[BLEEP]");

    return NextResponse.json({
      ok: true,
      route: "/api/radio/ai-host-script",
      phase: "LOCAL_OWNER_AI_HOST_SCRIPT_BRIDGE_V1",
      provider: "local-owner-ai-studio",
      safety: unsafeHits.length ? "SCRIPT_NEEDS_REVIEW_BLEEPED_BY_ROUTE" : "CLEAN_SCRIPT_READY",
      voiceEnabled: false,
      model: "owner-local-script-engine",
      hostName: built.hostName,
      segmentType: built.segmentType,
      lane: built.lane,
      estimatedSeconds: built.durationSeconds,
      ownerScriptType: built.ownerScriptType,
      ownerTone: built.ownerTone,
      ownerLength: built.ownerLength,
      script: safeScript,
      reviewRequired: unsafeHits.length > 0,
      externalCallMade: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "LOCAL_AI_HOST_SCRIPT_ROUTE_FAILED",
        detail: error?.message || "Failed to generate local AI host script.",
      },
      { status: 500 }
    );
  }
}


