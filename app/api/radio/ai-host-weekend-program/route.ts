import { NextRequest, NextResponse } from "next/server";

type AnyRecord = Record<string, any>;

const DEFAULT_MODEL = process.env.OPENAI_AI_HOST_MODEL || "gpt-4.1";
const WEEKEND_PROGRAM_VERSION = "AI_HOST_WEEKEND_PROGRAM_BRAIN_V4_CLEAN_TEXT";

type AiHostId = "nia" | "prodigy" | "diamond";

type AiHostProfile = {
  hostId: AiHostId;
  hostName: string;
  role: string;
};

const AI_HOST_PROFILES: Record<AiHostId, AiHostProfile> = {
  nia: {
    hostId: "nia",
    hostName: "Nia from Tha Core",
    role: "main-24-7-host-news-personality-and-weekend-programs",
  },
  prodigy: {
    hostId: "prodigy",
    hostName: "Prodigy from Tha Core",
    role: "future-talk-host",
  },
  diamond: {
    hostId: "diamond",
    hostName: "Diamond from Tha Core",
    role: "future-entertainment-and-lifestyle-host",
  },
};

function cleanText(value: unknown, fallback = "", max = 5000) {
  if (typeof value !== "string") return fallback;
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function normalizeHostId(value: unknown): AiHostId {
  const raw = cleanText(value, "nia", 80).toLowerCase();
  if (raw === "prodigy") return "prodigy";
  if (raw === "diamond") return "diamond";
  return "nia";
}

function getHost(value: unknown) {
  return AI_HOST_PROFILES[normalizeHostId(value)];
}

function normalizeProgramId(value: unknown) {
  const raw = cleanText(value, "", 120).toLowerCase();

  if (
    raw.includes("world") ||
    raw.includes("sunday") ||
    raw.includes("look-around") ||
    raw.includes("look_around")
  ) {
    return "look-around-the-world";
  }

  if (
    raw.includes("saturday") ||
    raw.includes("weekend") ||
    raw.includes("link")
  ) {
    return "weekend-link-up";
  }

  return "look-around-the-world";
}

function programProfile(programId: string) {
  if (programId === "weekend-link-up") {
    return {
      programId,
      programName: "The Weekend Link-Up",
      programSlot: "Saturday Evening",
      blockType: "weekend-non-news-program",
      targetMinutes: 30,
      tone:
        "warm Jamaican-Caribbean radio host, natural, lightly funny, practical, reflective, never robotic",
      purpose:
        "A lifestyle and personality weekend program. Talk about weekend energy, money habits, relationships, community, music culture, business, family, and real-life choices without turning it into news.",
      shape: [
        "Open with a relaxed Saturday evening welcome.",
        "Set the weekend mood without sounding like a safety announcement.",
        "Include 4 to 6 short segments with smooth radio transitions.",
        "Include one light joke or playful observation.",
        "Include one money/life thought.",
        "Include one relationship or family-life thought.",
        "Include one music/community/culture reflection.",
        "Include one peaceful closer that hands listeners back to music.",
      ],
    };
  }

  return {
    programId: "look-around-the-world",
    programName: "A Look Around the World",
    programSlot: "Sunday Evening",
    blockType: "weekend-non-news-world-culture-program",
    targetMinutes: 30,
    tone:
      "calm, thoughtful Jamaican-Caribbean radio documentary host, warm, curious, respectful, not newsy",
    purpose:
      "A non-news world culture program. Explore different places in the world, their culture, food, music, people, growth, decline, challenges, opportunities, and reasons behind change.",
    shape: [
      "Open with a calm Sunday evening welcome.",
      "Make clear this is not a news bulletin.",
      "Explore 3 to 5 places or regions.",
      "For each place, discuss culture, people, food, music, growth, decline, and why changes may be happening.",
      "Avoid claiming fresh statistics unless the owner provided them.",
      "Use careful language such as 'one reason may be' or 'some communities have seen' when discussing causes.",
      "Connect the lesson back to Caribbean listeners naturally.",
      "Close peacefully and hand listeners back to music.",
    ],
  };
}

function buildPrompt(input: {
  host: AiHostProfile;
  program: ReturnType<typeof programProfile>;
  ownerNotes: string;
  places: string;
}) {
  const { host, program, ownerNotes, places } = input;

  return [
    `Write a 30-minute radio program script for ${host.hostName} on Tha Core Online Radio.`,
    "",
    "HOST SYSTEM:",
    `- Host ID: ${host.hostId}`,
    `- Host name: ${host.hostName}`,
    `- Host role: ${host.role}`,
    "- Nia is active now, but this route must stay multi-host ready for future AI hosts.",
    "",
    "PROGRAM:",
    `- Program name: ${program.programName}`,
    `- Program slot: ${program.programSlot}`,
    `- Block type: ${program.blockType}`,
    `- Target length: about ${program.targetMinutes} minutes`,
    `- Tone: ${program.tone}`,
    `- Purpose: ${program.purpose}`,
    "",
    "IMPORTANT RULES:",
    "- This is NOT a news bulletin.",
    "- Do not present unverified claims as breaking news.",
    "- Do not invent current events, statistics, crime details, death counts, quotes, or official claims.",
    "- You may discuss culture, common social patterns, history, lifestyle, music, food, community, money, relationships, and human behavior in a general way.",
    "- Use careful wording when discussing growth, decline, or reasons behind change.",
    "- Do not overuse the word clean. Sound like a natural radio host, not a safety-warning machine.",
    "- Keep it safe for family/community radio: no profanity, slurs, explicit sexual content, or cruel jokes.",
    "- Light jokes are allowed, but do not mock tragedy, sickness, poverty, disasters, children, victims, or crime.",
    "- Keep the written brand as Tha Core.",
    "- Do not mention OpenAI, AI model, prompt, route, backend, or code.",
    "",
    "PROGRAM SHAPE:",
    ...program.shape.map((line) => `- ${line}`),
    "",
    places
      ? `OWNER-PROVIDED PLACES/THEMES TO INCLUDE:\n${places}`
      : "OWNER-PROVIDED PLACES/THEMES TO INCLUDE: none. Choose broad, safe, culturally rich examples without pretending they are live news.",
    "",
    ownerNotes ? `OWNER NOTES:\n${ownerNotes}` : "OWNER NOTES: none",
    "",
    "OUTPUT:",
    "- Return only the finished radio script.",
    "- Use spoken-radio formatting with short paragraphs.",
    "- Include natural transitions.",
    "- Make it long enough to become about 30 minutes when voiced.",
  ].join("\n");
}

function extractScriptText(data: AnyRecord) {
  const pieces: string[] = [];

  function add(value: unknown, depth = 0) {
    if (depth > 12 || value == null) return;

    if (typeof value === "string") {
      const cleaned = value.trim();
      if (
        cleaned &&
        cleaned !== "[object Object]" &&
        cleaned.length > 80 &&
        !cleaned.includes('"prompt_tokens"') &&
        !cleaned.includes('"completion_tokens"')
      ) {
        pieces.push(cleaned);
      }
      return;
    }

    if (typeof value === "number" || typeof value === "boolean") return;

    if (Array.isArray(value)) {
      for (const item of value) add(item, depth + 1);
      return;
    }

    if (typeof value === "object") {
      const obj = value as AnyRecord;

      if (typeof obj.output_text === "string") add(obj.output_text, depth + 1);
      if (typeof obj.text === "string") add(obj.text, depth + 1);
      if (typeof obj.value === "string") add(obj.value, depth + 1);

      if (Array.isArray(obj.output)) add(obj.output, depth + 1);
      if (Array.isArray(obj.content)) add(obj.content, depth + 1);
      if (Array.isArray(obj.message?.content)) add(obj.message.content, depth + 1);

      for (const [key, child] of Object.entries(obj)) {
        if (
          [
            "id",
            "object",
            "created",
            "created_at",
            "model",
            "status",
            "role",
            "type",
            "usage",
            "error",
            "metadata",
            "incomplete_details",
          ].includes(key)
        ) {
          continue;
        }

        add(child, depth + 1);
      }
    }
  }

  add(data);

  const unique = Array.from(new Set(pieces.map((piece) => piece.trim()).filter(Boolean)));
  unique.sort((a, b) => b.length - a.length);

  return unique[0] || "";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-weekend-program",
    phase: WEEKEND_PROGRAM_VERSION,
    extractorVersion: WEEKEND_PROGRAM_VERSION,
    activeHostDefault: "nia",
    availableHosts: Object.keys(AI_HOST_PROFILES),
    programs: [
      {
        programId: "weekend-link-up",
        programName: "The Weekend Link-Up",
        slot: "Saturday Evening",
        targetMinutes: 30,
        type: "non-news lifestyle/personality",
      },
      {
        programId: "look-around-the-world",
        programName: "A Look Around the World",
        slot: "Sunday Evening",
        targetMinutes: 30,
        type: "non-news world culture/documentary",
      },
    ],
    broadcastStarted: false,
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY_MISSING", phase: WEEKEND_PROGRAM_VERSION },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const host = getHost(body.hostId || body.host || "nia");
    const program = programProfile(normalizeProgramId(body.programId || body.programName || body.slot));
    const ownerNotes = cleanText(body.ownerNotes || body.notes || "", "", 3000);
    const places = cleanText(body.places || body.themes || "", "", 4000);

    const prompt = buildPrompt({
      host,
      program,
      ownerNotes,
      places,
    });

    const model = cleanText(body.model, DEFAULT_MODEL, 80);

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        instructions:
          "You write safe, natural, non-news weekend radio program scripts for Tha Core Online Radio. Return only plain script text. Do not return JSON.",
        input: prompt,
        max_output_tokens: 9000,
      }),
    });

    const data = (await upstream.json().catch(() => null)) as AnyRecord | null;

    if (!upstream.ok || !data) {
      return NextResponse.json(
        {
          ok: false,
          phase: WEEKEND_PROGRAM_VERSION,
          error: "OPENAI_WEEKEND_PROGRAM_FAILED",
          status: upstream.status,
          details: data,
        },
        { status: 502 }
      );
    }

    const script = extractScriptText(data);

    if (!script || script === "[object Object]") {
      return NextResponse.json(
        {
          ok: false,
          phase: WEEKEND_PROGRAM_VERSION,
          error: "EMPTY_WEEKEND_PROGRAM_SCRIPT",
          message: "Weekend program route could not extract plain script text from OpenAI response.",
          responseKeys: Object.keys(data || {}),
          outputType: typeof data?.output,
          outputTextType: typeof data?.output_text,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      route: "/api/radio/ai-host-weekend-program",
      phase: WEEKEND_PROGRAM_VERSION,
      extractorVersion: WEEKEND_PROGRAM_VERSION,
      safety: "NON_NEWS_WEEKEND_PROGRAM_SCRIPT_READY",
      broadcastStarted: false,
      voiceStarted: false,
      hostId: host.hostId,
      hostName: host.hostName,
      programId: program.programId,
      programName: program.programName,
      programSlot: program.programSlot,
      blockType: program.blockType,
      targetMinutes: program.targetMinutes,
      script,
      nextStep:
        "Send this script to /api/radio/ai-host-program-voice for chunked voice generation, then approve before broadcast.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        phase: WEEKEND_PROGRAM_VERSION,
        error: "AI_HOST_WEEKEND_PROGRAM_ERROR",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}
