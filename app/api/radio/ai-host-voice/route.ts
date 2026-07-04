import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// LOCAL_OWNER_AI_HOST_PIPER_VOICE_BRIDGE_V1
// Live radio AI-host voice route now bridges to Owner AI Studio local Piper voice engine.
// No OpenAI when provider is local. No ElevenLabs. No external voice API calls.

type AiHostVoiceBody = {
  provider?: string;
  script?: string;
  voice?: string;
  voiceId?: string;
  title?: string;
  hostName?: string;
  segmentType?: string;
};

const LOCAL_VOICE_IDS = new Set(["lessac", "amy", "ryan", "alan", "libritts"]);

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

function safeText(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  return normalizeScriptText(value).slice(0, 3000);
}

function pickLocalVoiceId(body: AiHostVoiceBody) {
  const requested = safeText(body.voiceId || body.voice || "", "").toLowerCase();
  const hostName = safeText(body.hostName, "").toLowerCase();

  const aliasMap: Record<string, string> = {
    nia: "amy",
    amy: "amy",
    nova: "amy",
    shimmer: "libritts",
    diamond: "libritts",
    libritts: "libritts",
    prodigy: "ryan",
    onyx: "ryan",
    ryan: "ryan",
    male: "ryan",
    alan: "alan",
    lessac: "lessac",
    female: "amy",
  };

  const mapped = aliasMap[requested] || "";
  if (mapped && LOCAL_VOICE_IDS.has(mapped)) return mapped;

  if (hostName.includes("prodigy")) return "ryan";
  if (hostName.includes("diamond")) return "libritts";
  if (hostName.includes("nia")) return "amy";

  return "amy";
}

async function callOwnerLocalVoiceEngine(script: string, voiceId: string) {
  const upstream = await fetch(`${internalBaseUrl()}/api/owner/ai-voice-generator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: script,
      voiceId,
      source: "radio-ai-host-local-bridge",
      provider: "local",
    }),
  });

  const data = await upstream.json().catch(() => null);

  return {
    ok: upstream.ok && Boolean(data?.ok),
    status: upstream.status,
    data,
  };
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: "/api/radio/ai-host-voice",
    phase: "LOCAL_OWNER_AI_HOST_PIPER_VOICE_BRIDGE_V1",
    provider: "local-owner-piper",
    externalProvidersEnabled: false,
    keyPresent: false,
    defaultVoiceId: "amy",
    defaultVoiceLabel: "Nia Energy Voice",
    voiceEnabled: true,
    broadcastEnabled: false,
    outputFolder: "/audio/ai-studio",
    ownerSource: "/api/owner/ai-voice-generator",
    note: "Live radio voice route is bridged to the existing Owner AI Studio local Piper voice generator. Preview only before broadcast wiring.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AiHostVoiceBody;
    const provider = safeText(body.provider, "local").toLowerCase();

    if (provider !== "local") {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_EXTERNAL_VOICE_PROVIDER_DISABLED",
          message: "This route is locked to the local Owner Piper provider. No OpenAI or ElevenLabs call was made.",
          allowedProvider: "local",
        },
        { status: 400 }
      );
    }

    const script = safeText(body.script, "");
    const title = safeText(body.title, "Tha Core AI Host Voice");
    const hostName = safeText(body.hostName, "Nia from Tha Core");
    const segmentType = safeText(body.segmentType, "general-talk");
    const voiceId = pickLocalVoiceId(body);

    if (!script || script.length < 8) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_SCRIPT_REQUIRED",
          message: "Paste an approved clean script before generating voice.",
        },
        { status: 400 }
      );
    }

    if (script.length > 3000) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_SCRIPT_TOO_LONG",
          message: "Script must be 3000 characters or less for Phase 1 local voice preview.",
        },
        { status: 400 }
      );
    }

    const unsafeHits = script.match(UNSAFE_SCRIPT_PATTERN) || [];
    if (unsafeHits.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_SCRIPT_UNSAFE_FOR_VOICE",
          message: "Script contains unsafe words. Clean/approve it before voice generation.",
          reviewRequired: true,
        },
        { status: 400 }
      );
    }

    const localResult = await callOwnerLocalVoiceEngine(script, voiceId);

    if (!localResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "OWNER_LOCAL_PIPER_VOICE_FAILED",
          status: localResult.status,
          detail: localResult.data?.error || localResult.data?.message || "Owner local voice engine did not return ok.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      route: "/api/radio/ai-host-voice",
      phase: "LOCAL_OWNER_AI_HOST_PIPER_VOICE_BRIDGE_V1",
      provider: "local-owner-piper",
      safety: "CLEAN_AI_HOST_VOICE_READY_FOR_PREVIEW",
      voiceEnabled: true,
      broadcastEnabled: false,
      aiGeneratedVoice: true,
      disclosure: "AI-generated local Piper voice. Preview and approve before broadcast use.",
      model: localResult.data?.model || "local-piper",
      voice: voiceId,
      voiceId,
      voiceLabel: localResult.data?.voiceLabel || "",
      hostName,
      segmentType,
      title,
      audioUrl: localResult.data?.audioUrl,
      storageUrl: localResult.data?.audioUrl,
      fileName: localResult.data?.filename,
      bytes: localResult.data?.bytes || null,
      reviewRequired: false,
      externalCallMade: false,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "LOCAL_AI_HOST_VOICE_ROUTE_FAILED",
        detail: error?.message || "Failed to generate local AI host voice.",
      },
      { status: 500 }
    );
  }
}
