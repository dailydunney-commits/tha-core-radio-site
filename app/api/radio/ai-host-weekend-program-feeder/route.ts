import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

type AnyRecord = Record<string, any>;

const VERSION = "AI_HOST_WEEKEND_SCRIPT_FEEDER_V1";

// WEEKEND_SCRIPT_FEEDER_DRAFT_ONLY_SAFETY_V1
// This feeder creates saved weekend program scripts only.
// It must NOT trigger Nia news runner, Nia news feeder, SmartZJ, current broadcast,
// voice generation, or live broadcast by itself.
// Required flow: draft script -> owner approval -> voice generation -> program lock -> broadcast.
const DEFAULT_MODEL = process.env.OPENAI_AI_HOST_MODEL || "gpt-4.1";

const DATA_DIR = join(process.cwd(), ".data");
const FEEDER_DIR = join(DATA_DIR, "ai-host-weekend-program-feeder");

type AiHostId = "nia" | "prodigy" | "diamond";

const HOSTS: Record<AiHostId, { hostId: AiHostId; hostName: string; role: string }> = {
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
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function hostId(value: unknown): AiHostId {
  const raw = cleanText(value, "nia", 80).toLowerCase();
  if (raw === "prodigy") return "prodigy";
  if (raw === "diamond") return "diamond";
  return "nia";
}

function programId(value: unknown) {
  const raw = cleanText(value, "look-around-the-world", 160).toLowerCase();

  if (raw.includes("saturday") || raw.includes("weekend") || raw.includes("link")) {
    return "weekend-link-up";
  }

  return "look-around-the-world";
}

function programConfig(id: string) {
  if (id === "weekend-link-up") {
    return {
      programId: "weekend-link-up",
      programName: "The Weekend Link-Up",
      programSlot: "Saturday Evening",
      targetMinutes: 30,
      segmentThemes: [
        "Opening welcome and weekend mood",
        "Weekend reset, home, family, and community",
        "Money and discipline without sounding like a lecture",
        "Relationship and family-life check with one light joke",
        "Music culture, Caribbean lifestyle, and real people",
        "Community encouragement and peaceful closing",
      ],
    };
  }

  return {
    programId: "look-around-the-world",
    programName: "A Look Around the World",
    programSlot: "Sunday Evening",
    targetMinutes: 30,
    segmentThemes: [
      "Opening welcome, explain this is not news",
      "Jamaica culture, people, growth, pressure, and identity",
      "Haiti, Africa, and Caribbean roots with respectful reflection",
      "Trinidad, British Virgin Islands, and U.S. Virgin Islands culture and movement",
      "New York, Miami, and diaspora life, growth, pressure, and opportunity",
      "Life lessons for Core listeners and peaceful closing",
    ],
  };
}

function normalizeSpokenScript(script: string) {
  return script
    .replace(/\r\n/g, "\n")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replaceAll("â€™", "'")
    .replaceAll("â€˜", "'")
    .replaceAll("â€œ", '"')
    .replaceAll("â€", '"')
    .replaceAll("â€�", '"')
    .replaceAll("â€”", "-")
    .replaceAll("â€“", "-")
    .replaceAll("â€¦", "...")
    .replaceAll("â", "'")
    .replace(/\[[^\]]*(MUSIC|SFX|FADE|INTRO|OUTRO|UNDERLAY|BED)[^\]]*\]/gi, "")
    .replace(/^\s*(NIA|HOST|MUSIC|SFX|INTRO|OUTRO|FADE)\s*:\s*/gim, "")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function countWords(script: string) {
  return script.split(/\s+/).map((w) => w.trim()).filter(Boolean).length;
}

function extractText(data: AnyRecord) {
  const pieces: string[] = [];

  function add(value: unknown, depth = 0) {
    if (depth > 12 || value == null) return;

    if (typeof value === "string") {
      const v = value.trim();
      if (v && v !== "[object Object]" && v.length > 50) pieces.push(v);
      return;
    }

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
        if (["id", "object", "model", "status", "role", "type", "usage", "error"].includes(key)) continue;
        add(child, depth + 1);
      }
    }
  }

  add(data);

  const unique = Array.from(new Set(pieces));
  unique.sort((a, b) => b.length - a.length);

  return normalizeSpokenScript(unique[0] || "");
}

function buildSegmentPrompt(input: {
  hostName: string;
  hostRole: string;
  programName: string;
  programSlot: string;
  segmentNumber: number;
  segmentTotal: number;
  segmentTheme: string;
  places: string;
  ownerNotes: string;
  previousSummary: string;
}) {
  return [
    `Write segment ${input.segmentNumber} of ${input.segmentTotal} for ${input.programName} on Tha Core Online Radio.`,
    "",
    "HOST:",
    `- Host name: ${input.hostName}`,
    `- Host role: ${input.hostRole}`,
    `- Program slot: ${input.programSlot}`,
    "",
    "SEGMENT:",
    `- Segment theme: ${input.segmentTheme}`,
    "- Length target: 550 to 750 spoken words.",
    "- This is one part of a full 30-minute program.",
    "",
    "STRICT RULES:",
    "- Return only words the host should say on air.",
    "- Do not include stage directions, music cues, labels, brackets, SFX, intro notes, outro notes, or producer notes.",
    "- Use plain ASCII punctuation only.",
    "- Do not use curly quotes, em dashes, or decorative symbols.",
    "- This is not a news bulletin.",
    "- Do not invent breaking news, statistics, crime details, deaths, quotes, or official claims.",
    "- Use careful language when discussing growth, decline, culture, money, relationships, or community issues.",
    "- Do not overuse the word clean. Sound like a natural radio host.",
    "- Safe jokes are allowed, but do not mock tragedy, poverty, sickness, children, victims, disasters, or crime.",
    "- Keep the brand written as Tha Core.",
    "- Do not mention OpenAI, AI model, backend, route, or code.",
    "",
    input.places ? `PLACES/THEMES TO INCLUDE WHERE NATURAL:\n${input.places}` : "PLACES/THEMES: none supplied.",
    "",
    input.ownerNotes ? `OWNER NOTES:\n${input.ownerNotes}` : "OWNER NOTES: none.",
    "",
    input.previousSummary ? `WHAT WAS ALREADY COVERED:\n${input.previousSummary}` : "WHAT WAS ALREADY COVERED: none.",
  ].join("\n");
}

async function callOpenAi(apiKey: string, prompt: string, model: string) {
  const upstream = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      instructions:
        "You write safe, natural, spoken radio program segments for Tha Core Online Radio. Return only plain spoken script text.",
      input: prompt,
      max_output_tokens: 2600,
    }),
  });

  const data = (await upstream.json().catch(() => null)) as AnyRecord | null;

  if (!upstream.ok || !data) {
    throw new Error(`OPENAI_SEGMENT_FAILED_${upstream.status}`);
  }

  const text = extractText(data);

  if (!text || text === "[object Object]") {
    throw new Error("EMPTY_SEGMENT_TEXT");
  }

  return text;
}

export async function GET() {
  await mkdir(FEEDER_DIR, { recursive: true });

  const files = (await readdir(FEEDER_DIR).catch(() => []))
    .filter((name) => name.endsWith(".json"))
    .sort()
    .slice(-10);

  const recent = [];
  for (const name of files) {
    try {
      const data = JSON.parse(await readFile(join(FEEDER_DIR, name), "utf8"));
      recent.push({
        file: name,
        programName: data.programName,
        hostName: data.hostName,
        wordCount: data.wordCount,
        estimatedMinutes: data.estimatedMinutes,
        approvalStatus: data.approvalStatus,
        broadcastStarted: data.broadcastStarted,
      });
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-weekend-program-feeder",
    phase: VERSION,
    purpose: "Creates saved non-news weekend program scripts in segments. Does not voice or broadcast.",
    activeHostDefault: "nia",
    availableHosts: Object.keys(HOSTS),
    recent,
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, error: "OPENAI_API_KEY_MISSING", phase: VERSION },
        { status: 500 }
      );
    }

    await mkdir(FEEDER_DIR, { recursive: true });

    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const host = HOSTS[hostId(body.hostId || body.host || "nia")];
    const program = programConfig(programId(body.programId || body.programName || body.slot));
    const model = cleanText(body.model, DEFAULT_MODEL, 80);
    const places = cleanText(body.places || body.themes || "", "", 4000);
    const ownerNotes = cleanText(body.ownerNotes || body.notes || "", "", 4000);

    const segmentLimit = Math.max(4, Math.min(8, Number(body.segmentLimit || program.segmentThemes.length || 6)));
    const themes = program.segmentThemes.slice(0, segmentLimit);

    const segments: { segmentNumber: number; theme: string; script: string; wordCount: number }[] = [];
    let previousSummary = "";

    for (let i = 0; i < themes.length; i++) {
      const prompt = buildSegmentPrompt({
        hostName: host.hostName,
        hostRole: host.role,
        programName: program.programName,
        programSlot: program.programSlot,
        segmentNumber: i + 1,
        segmentTotal: themes.length,
        segmentTheme: themes[i],
        places,
        ownerNotes,
        previousSummary,
      });

      const script = await callOpenAi(apiKey, prompt, model);
      const wc = countWords(script);

      segments.push({
        segmentNumber: i + 1,
        theme: themes[i],
        script,
        wordCount: wc,
      });

      previousSummary = segments
        .map((segment) => `Segment ${segment.segmentNumber}: ${segment.theme}`)
        .join("\n");
    }

    const fullScript = normalizeSpokenScript(segments.map((s) => s.script).join("\n\n"));
    const wordCount = countWords(fullScript);
    const estimatedMinutes = Math.round((wordCount / 145) * 10) / 10;
    const meetsThirtyMinuteTarget = wordCount >= 3200;

    const now = new Date();
    const safeStamp = now.toISOString().replace(/[:.]/g, "-");
    const fileName = `${program.programId}-${host.hostId}-${safeStamp}.json`;
    const savedPath = join(FEEDER_DIR, fileName);

    const saved = {
      ok: true,
      phase: VERSION,
      createdAt: now.toISOString(),
      hostId: host.hostId,
      hostName: host.hostName,
      programId: program.programId,
      programName: program.programName,
      programSlot: program.programSlot,
      targetMinutes: program.targetMinutes,
      wordCount,
      estimatedMinutes,
      meetsThirtyMinuteTarget,
      segmentCount: segments.length,
      approvalStatus: "DRAFT_NEEDS_OWNER_APPROVAL",
      voiceStarted: false,
      broadcastStarted: false,
      savedFile: savedPath,
      segments,
      fullScript,
    };

    await writeFile(savedPath, JSON.stringify(saved, null, 2), "utf8");

    return NextResponse.json({
      ok: true,
      phase: VERSION,
      hostId: host.hostId,
      hostName: host.hostName,
      programId: program.programId,
      programName: program.programName,
      programSlot: program.programSlot,
      targetMinutes: program.targetMinutes,
      wordCount,
      estimatedMinutes,
      meetsThirtyMinuteTarget,
      segmentCount: segments.length,
      approvalStatus: saved.approvalStatus,
      voiceStarted: false,
      broadcastStarted: false,
      draftOnly: true,
      doesNotTouchNewsRunner: true,
      doesNotTouchCurrentBroadcast: true,
      savedFile: fileName,
      fullScript,
      nextStep: "Review the saved script. After owner approval, send it to program voice generation.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        phase: VERSION,
        error: "AI_HOST_WEEKEND_SCRIPT_FEEDER_ERROR",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

