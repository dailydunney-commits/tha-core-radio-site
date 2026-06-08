import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

type AnyRecord = Record<string, any>;

const VERSION = "AI_HOST_COHOST_SHOW_FEEDER_V1_DRAFT_ONLY";
const DEFAULT_MODEL = process.env.OPENAI_AI_HOST_MODEL || "gpt-4.1";

const DATA_DIR = join(process.cwd(), ".data");
const FEEDER_DIR = join(DATA_DIR, "ai-host-cohost-show-feeder");

function cleanText(value: unknown, fallback = "", max = 5000) {
  return String(value ?? fallback)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
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
    .replace(/^\s*(MUSIC|SFX|INTRO|OUTRO|FADE)\s*:\s*/gim, "")
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

function segmentThemes() {
  return [
    "Opening: Prodigy and Diamond welcome listeners and set the lighter-side show vibe",
    "Money talk: discipline, weekend spending, saving, pressure, and real-life choices",
    "Relationship corner: love, communication, respect, red flags, and funny everyday situations",
    "Listener questions: Prodigy and Diamond answer imaginary listener questions and invite real ones",
    "World and lifestyle comments: work, social media, ambition, stress, fashion, music, and culture",
    "Weekend plans and fun: events, family, rest, food, music, laughter, and keeping life balanced",
    "Community suggestions: small business, youth, women in business, men stepping up, and local progress",
    "Closing: recap, invite listener interaction, hand back to music, and stay draft-safe",
  ];
}

function buildSegmentPrompt(input: {
  segmentNumber: number;
  segmentTotal: number;
  theme: string;
  topic: string;
  ownerNotes: string;
  previousSummary: string;
}) {
  return [
    `Write segment ${input.segmentNumber} of ${input.segmentTotal} for a Prodigy and Diamond co-host show on Tha Core Online Radio.`,
    "",
    "SHOW:",
    "- Show name: Prodigy & Diamond",
    "- Type: lighter-side co-host talk entertainment",
    "- Hosts: Prodigy from Tha Core and Diamond from Tha Core",
    "- Prodigy: calm, witty, smart, practical, male co-host.",
    "- Diamond: stylish, funny, warm, engaging, female co-host.",
    "- They must talk to each other, not just read separate monologues.",
    "- They should ask and answer questions, react to each other, make comments, give suggestions, and involve listeners.",
    "",
    "SEGMENT:",
    `- Segment theme: ${input.theme}`,
    `- Overall topic: ${input.topic}`,
    "- Length target: 480 to 620 spoken words.",
    "- COHOST_30_MIN_LANGUAGE_GUARD_V1: This is a 30-minute show, not an hour.",
    "- Never say hour, full hour, next hour, or for the hour.",
    "- Say thirty minutes, this half-hour, this show, or this conversation instead.",
    "- Keep the full show around 4,300 to 4,800 words total, not overlong.",
    "- This is one segment of a full 30-minute show.",
    "",
    "STRICT RULES:",
    "- Return only words Prodigy and Diamond should say on air.",
    "- Use speaker labels exactly like this: PRODIGY: and DIAMOND:",
    "- No stage directions, no music cues, no brackets, no SFX, no producer notes.",
    "- Do not say Owner note direction.",
    "- Do not mention OpenAI, AI model, backend, route, or code.",
    "- Keep it safe for community radio: no profanity, no explicit sexual content, no slurs.",
    "- Jokes are allowed, but do not mock tragedy, sickness, poverty, children, victims, disasters, or crime.",
    "- Make it fun, entertaining, and engaging, but not messy gossip.",
    "- Use plain ASCII punctuation only.",
    "",
    input.previousSummary ? `WHAT WAS ALREADY COVERED:\n${input.previousSummary}` : "WHAT WAS ALREADY COVERED: none.",
    "",
    input.ownerNotes ? `OWNER NOTES FOR STYLE ONLY, DO NOT READ ALOUD:\n${input.ownerNotes}` : "OWNER NOTES: none.",
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
        "You write safe, natural, entertaining spoken radio co-host segments for Tha Core Online Radio. Return only plain script text with PRODIGY: and DIAMOND: speaker labels.",
      input: prompt,
      max_output_tokens: 2600,
    }),
  });

  const data = (await upstream.json().catch(() => null)) as AnyRecord | null;

  if (!upstream.ok || !data) {
    throw new Error(`OPENAI_COHOST_SEGMENT_FAILED_${upstream.status}`);
  }

  const text = extractText(data);

  if (!text || text === "[object Object]") {
    throw new Error("EMPTY_COHOST_SEGMENT_TEXT");
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
        showName: data.showName,
        wordCount: data.wordCount,
        estimatedMinutes: data.estimatedMinutes,
        approvalStatus: data.approvalStatus,
        broadcastStarted: data.broadcastStarted,
      });
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-cohost-show-feeder",
    phase: VERSION,
    purpose: "Creates saved 30-minute Prodigy and Diamond co-host show scripts. Draft-only. Does not voice or broadcast.",
    showName: "Prodigy & Diamond",
    draftOnly: true,
    voiceStarted: false,
    broadcastStarted: false,
    doesNotTouchNewsRunner: true,
    doesNotTouchCurrentBroadcast: true,
    doesNotTouchSmartZJ: true,
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
    const model = cleanText(body.model, DEFAULT_MODEL, 80);
    const topic = cleanText(
      body.topic || "money, relationships, listener questions, weekend plans, and keeping life fun",
      "money, relationships, listener questions, weekend plans, and keeping life fun",
      500
    );
    const ownerNotes = cleanText(body.ownerNotes || body.notes || "", "", 4000);

    const themes = segmentThemes();
    const segmentLimit = Math.max(6, Math.min(8, Number(body.segmentLimit || themes.length || 8)));
    const chosenThemes = themes.slice(0, segmentLimit);

    const segments: { segmentNumber: number; theme: string; script: string; wordCount: number }[] = [];
    let previousSummary = "";

    for (let i = 0; i < chosenThemes.length; i++) {
      const prompt = buildSegmentPrompt({
        segmentNumber: i + 1,
        segmentTotal: chosenThemes.length,
        theme: chosenThemes[i],
        topic,
        ownerNotes,
        previousSummary,
      });

      const script = await callOpenAi(apiKey, prompt, model);
      const wc = countWords(script);

      segments.push({
        segmentNumber: i + 1,
        theme: chosenThemes[i],
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
    const fileName = `prodigy-diamond-cohost-${safeStamp}.json`;
    const savedPath = join(FEEDER_DIR, fileName);

    const saved = {
      ok: true,
      phase: VERSION,
      createdAt: now.toISOString(),
      showName: "Prodigy & Diamond",
      showType: "lighter-side-cohost-talk-entertainment",
      hosts: ["Prodigy from Tha Core", "Diamond from Tha Core"],
      targetMinutes: 30,
      wordCount,
      estimatedMinutes,
      meetsThirtyMinuteTarget,
      segmentCount: segments.length,
      approvalStatus: "DRAFT_NEEDS_OWNER_APPROVAL",
      draftOnly: true,
      voiceStarted: false,
      broadcastStarted: false,
      doesNotTouchNewsRunner: true,
      doesNotTouchCurrentBroadcast: true,
      doesNotTouchSmartZJ: true,
      savedFile: savedPath,
      segments,
      fullScript,
    };

    await writeFile(savedPath, JSON.stringify(saved, null, 2), "utf8");

    return NextResponse.json({
      ok: true,
      phase: VERSION,
      showName: saved.showName,
      showType: saved.showType,
      targetMinutes: saved.targetMinutes,
      wordCount,
      estimatedMinutes,
      meetsThirtyMinuteTarget,
      segmentCount: segments.length,
      approvalStatus: saved.approvalStatus,
      draftOnly: true,
      voiceStarted: false,
      broadcastStarted: false,
      doesNotTouchNewsRunner: true,
      doesNotTouchCurrentBroadcast: true,
      doesNotTouchSmartZJ: true,
      savedFile: fileName,
      fullScript,
      nextStep: "Review and approve. Then generate separate Prodigy/Diamond voice chunks before any live broadcast.",
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        phase: VERSION,
        error: "AI_HOST_COHOST_SHOW_FEEDER_ERROR",
        message: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}


