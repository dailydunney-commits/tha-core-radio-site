import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HostProfile = {
  id: string;
  temporaryName: string;
  role: string;
  mission: string;
  tone: string;
  energy: string;
  styleRules: string[];
  allowedTopics: string[];
};

type ProfileFile = {
  version: string;
  protectedCheckpoint: string;
  dryTestOnly: boolean;
  broadcastEnabled: boolean;
  voiceEnabled: boolean;
  scheduleTakeoverEnabled: boolean;
  hosts: HostProfile[];
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const ROUTE_VERSION = "AI_HOST_TWO_HOSTS_PHASE_1B_DRY_SCRIPT_GENERATOR";
const PROFILE_DIR = path.join(process.cwd(), ".data", "ai-hosts");
const PROFILE_PATH = path.join(PROFILE_DIR, "host-profiles.json");

const DEFAULT_PROFILES: ProfileFile = {
  version: "AI_HOST_TWO_HOSTS_PHASE_1A_PROFILES_ONLY",
  protectedCheckpoint: "ThaCoreRadio_NIA_6AM_NEWS_MASTER_FEEDER_WORKING_20260606-082812-139a301",
  dryTestOnly: true,
  broadcastEnabled: false,
  voiceEnabled: false,
  scheduleTakeoverEnabled: false,
  hosts: [
    {
      id: "coretalk",
      temporaryName: "CoreTalk Host",
      role: "Serious/professional talk host",
      mission:
        "Handle interviews, business topics, social issues, community topics, sponsor reads, and calm intelligent talk segments.",
      tone: "calm, professional, thoughtful, respectful, intelligent",
      energy: "medium-low",
      styleRules: [
        "Speak like a calm professional radio host.",
        "Use clear Jamaican-friendly language without forcing slang.",
        "Keep sponsor reads polished and trustworthy.",
        "Ask strong interview-style questions when requested.",
        "Do not sound like Nia the news anchor.",
        "Do not sound like SmartZJ the music automation DJ."
      ],
      allowedTopics: [
        "business",
        "community",
        "social issues",
        "interviews",
        "sponsor reads",
        "professional announcements",
        "motivation",
        "public service talk"
      ]
    },
    {
      id: "corevibe",
      temporaryName: "CoreVibe Host",
      role: "Entertainment/personality host",
      mission:
        "Handle music talk, clean jokes, celebrity and entertainment talk, sports, fashion, audience banter, and high-energy station personality segments.",
      tone: "fun, witty, clean, energetic, charismatic",
      energy: "medium-high",
      styleRules: [
        "Bring vibes without profanity or explicit content.",
        "Keep jokes clean, playful, and not cruel.",
        "Do not make unverified claims about celebrities or current events.",
        "Keep audience banter friendly and radio-safe.",
        "Do not sound like Nia the news anchor.",
        "Do not control SmartZJ or claim to choose the next song."
      ],
      allowedTopics: [
        "music talk",
        "entertainment",
        "clean jokes",
        "sports",
        "fashion",
        "celebrity culture",
        "audience banter",
        "event hype"
      ]
    }
  ]
};

function safeString(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLength);
}

function safeNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

async function ensureProfiles(): Promise<ProfileFile> {
  await mkdir(PROFILE_DIR, { recursive: true });

  try {
    const raw = await readFile(PROFILE_PATH, "utf8");
    const parsed = JSON.parse(raw) as ProfileFile;

    if (!Array.isArray(parsed.hosts) || parsed.hosts.length < 2) {
      throw new Error("Host profile file is missing required hosts.");
    }

    return parsed;
  } catch {
    await writeFile(PROFILE_PATH, JSON.stringify(DEFAULT_PROFILES, null, 2) + "\n", "utf8");
    return DEFAULT_PROFILES;
  }
}

function fallbackScript(profile: HostProfile, topic: string, durationSeconds: number): string {
  if (profile.id === "coretalk") {
    return [
      `${profile.temporaryName} dry test only.`,
      `Today’s topic is ${topic}.`,
      "The focus is clear thinking, discipline, and useful conversation for the Tha Core audience.",
      "This segment is not going live yet. It is only checking the host brain, tone, structure, and safety.",
      "When this host is activated in a future phase, the goal will be calm, professional talk that can support interviews, business, sponsor reads, and community issues.",
      `Target length: about ${durationSeconds} seconds.`
    ].join(" ");
  }

  return [
    `${profile.temporaryName} dry test only.`,
    `Today’s vibe topic is ${topic}.`,
    "We are testing clean energy, audience banter, entertainment style, and radio-safe personality.",
    "This segment is not going live yet. It is only checking the host brain, tone, structure, and safety.",
    "When this host is activated in a future phase, the goal will be fun, clean, stylish, and full of vibes without taking over SmartZJ.",
    `Target length: about ${durationSeconds} seconds.`
  ].join(" ");
}

function buildPrompt(profile: HostProfile, body: Record<string, unknown>) {
  const topic = safeString(body.topic, "Tha Core audience engagement", 180);
  const audience = safeString(body.audience, "Tha Core online radio listeners in Jamaica and worldwide", 160);
  const segmentType = safeString(body.segmentType, "general talk segment", 100);
  const sponsorName = safeString(body.sponsorName, "", 100);
  const extraNotes = safeString(body.extraNotes, "", 500);
  const durationSeconds = safeNumber(body.durationSeconds, 90, 30, 600);
  const targetWords = Math.max(80, Math.min(1200, Math.round(durationSeconds * 2.1)));

  const systemPrompt = [
    "You write clean, radio-safe dry-run scripts for Tha Core Online Radio.",
    "This is Phase 1 dry testing only.",
    "Do not write anything that claims the segment is live.",
    "Do not trigger broadcast, voice, scheduling, SmartZJ, Nia, music playback, or now-playing behavior.",
    "Do not act as Nia. Nia is the separate news anchor.",
    "Do not act as SmartZJ. SmartZJ is the separate music and broadcast automation DJ.",
    "Avoid profanity, explicit sexual content, slurs, hate, dangerous instructions, and defamatory claims.",
    "For current events, celebrities, sports, or news, do not invent facts. Only speak generally unless the user supplied details.",
    "Return the script only. No JSON. No markdown headings."
  ].join("\n");

  const userPrompt = [
    `Host name: ${profile.temporaryName}`,
    `Host role: ${profile.role}`,
    `Host mission: ${profile.mission}`,
    `Tone: ${profile.tone}`,
    `Energy: ${profile.energy}`,
    `Style rules: ${profile.styleRules.join(" ")}`,
    `Allowed topics: ${profile.allowedTopics.join(", ")}`,
    `Audience: ${audience}`,
    `Segment type: ${segmentType}`,
    `Topic: ${topic}`,
    sponsorName ? `Sponsor name: ${sponsorName}` : "Sponsor name: none",
    extraNotes ? `Extra notes: ${extraNotes}` : "Extra notes: none",
    `Target duration: about ${durationSeconds} seconds.`,
    `Target word count: about ${targetWords} words.`,
    "Write a clean, natural radio script for this host."
  ].join("\n");

  return {
    topic,
    durationSeconds,
    targetWords,
    systemPrompt,
    userPrompt
  };
}

async function generateDryScript(profile: HostProfile, body: Record<string, unknown>) {
  const prompt = buildPrompt(profile, body);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_AI_HOST_MODEL || "gpt-4.1";

  if (!apiKey) {
    return {
      hostId: profile.id,
      hostName: profile.temporaryName,
      openAiUsed: false,
      fallbackUsed: true,
      model,
      topic: prompt.topic,
      durationSeconds: prompt.durationSeconds,
      targetWords: prompt.targetWords,
      script: fallbackScript(profile, prompt.topic, prompt.durationSeconds)
    };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      temperature: profile.id === "corevibe" ? 0.85 : 0.55,
      max_tokens: Math.min(1600, Math.max(500, prompt.targetWords * 3)),
      messages: [
        { role: "system", content: prompt.systemPrompt },
        { role: "user", content: prompt.userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      hostId: profile.id,
      hostName: profile.temporaryName,
      openAiUsed: true,
      openAiOk: false,
      fallbackUsed: true,
      model,
      topic: prompt.topic,
      durationSeconds: prompt.durationSeconds,
      targetWords: prompt.targetWords,
      openAiError: errorText.slice(0, 800),
      script: fallbackScript(profile, prompt.topic, prompt.durationSeconds)
    };
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const script = data.choices?.[0]?.message?.content?.trim();

  return {
    hostId: profile.id,
    hostName: profile.temporaryName,
    openAiUsed: true,
    openAiOk: true,
    fallbackUsed: false,
    model,
    topic: prompt.topic,
    durationSeconds: prompt.durationSeconds,
    targetWords: prompt.targetWords,
    script: script || fallbackScript(profile, prompt.topic, prompt.durationSeconds)
  };
}

export async function GET() {
  const profiles = await ensureProfiles();

  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-two-hosts",
    version: ROUTE_VERSION,
    protectedCheckpoint: profiles.protectedCheckpoint,
    dryTestOnly: true,
    broadcastStarted: false,
    broadcastEnabled: false,
    voiceEnabled: false,
    scheduleTakeoverEnabled: false,
    profilePath: ".data/ai-hosts/host-profiles.json",
    protectedSystemsUntouched: [
      "Nia 6 AM feeder",
      "SmartZJ clean music",
      "now-playing route",
      "clean-next route"
    ],
    hosts: profiles.hosts.map((host) => ({
      id: host.id,
      temporaryName: host.temporaryName,
      role: host.role,
      mission: host.mission,
      tone: host.tone,
      energy: host.energy,
      allowedTopics: host.allowedTopics
    }))
  });
}

export async function POST(req: NextRequest) {
  try {
    const profiles = await ensureProfiles();
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const requestedHostId = safeString(body.hostId, "both", 40).toLowerCase();

    const selectedHosts =
      requestedHostId === "both"
        ? profiles.hosts
        : profiles.hosts.filter((host) => host.id === requestedHostId);

    if (selectedHosts.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "UNKNOWN_HOST_ID",
          allowedHostIds: ["coretalk", "corevibe", "both"],
          broadcastStarted: false,
          voiceEnabled: false
        },
        { status: 400 }
      );
    }

    const scripts = await Promise.all(
      selectedHosts.map((profile) => generateDryScript(profile, body))
    );

    return NextResponse.json({
      ok: true,
      route: "/api/radio/ai-host-two-hosts",
      version: ROUTE_VERSION,
      dryTestOnly: true,
      broadcastStarted: false,
      broadcastEnabled: false,
      voiceEnabled: false,
      scheduleTakeoverEnabled: false,
      protectedCheckpoint: profiles.protectedCheckpoint,
      scripts
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        ok: false,
        error: "AI_HOST_TWO_HOSTS_DRY_SCRIPT_FAILED",
        message,
        dryTestOnly: true,
        broadcastStarted: false,
        voiceEnabled: false
      },
      { status: 500 }
    );
  }
}
