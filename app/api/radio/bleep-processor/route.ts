import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProcessorPayload = {
  jobId?: string;
  id?: string;
  sourceUrl?: string;
  audioUrl?: string;
  rawUrl?: string;
  streamUrl?: string;
  url?: string;
  track?: {
    id?: string;
    title?: string;
    artist?: string;
    audioUrl?: string;
    rawUrl?: string;
    streamUrl?: string;
    url?: string;
  };
};

function safeSlug(value: unknown): string {
  return String(value ?? "smartdj-audio")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getSourceUrl(payload: ProcessorPayload): string {
  const candidates = [
    payload.sourceUrl,
    payload.audioUrl,
    payload.rawUrl,
    payload.streamUrl,
    payload.url,
    payload.track?.audioUrl,
    payload.track?.rawUrl,
    payload.track?.streamUrl,
    payload.track?.url,
  ];

  return String(candidates.find((item) => typeof item === "string" && item.trim()) ?? "").trim();
}

function toAbsoluteUrl(value: string, origin: string): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${origin}${value}`;
  return value;
}

async function markJobReady(origin: string, jobId: string, processedUrl: string) {
  if (!jobId) return null;

  const response = await fetch(`${origin}/api/radio/bleep-job`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      action: "processed_ready",
      id: jobId,
      processedAudioUrl: processedUrl,
      bleepedAudioUrl: processedUrl,
      cleanAudioUrl: processedUrl,
      radioSafeAudioUrl: processedUrl,
      safeAudioUrl: processedUrl,
    }),
  });

  return response.json().catch(() => null);
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => ({}))) as ProcessorPayload;

    const jobId = String(payload.jobId ?? payload.id ?? "").trim();
    const rawSourceUrl = getSourceUrl(payload);
    const sourceUrl = toAbsoluteUrl(rawSourceUrl, request.nextUrl.origin);

    if (!sourceUrl) {
      return NextResponse.json(
        {
          ok: false,
          action: "bleep_processor",
          message: "Missing source audio URL. Attach original audio before processing.",
        },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const response = await fetch(sourceUrl, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          action: "bleep_processor",
          sourceUrl,
          status: response.status,
          message: "Could not download source audio for processing.",
        },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    const bytes = Buffer.from(await response.arrayBuffer());

    if (!bytes.length) {
      return NextResponse.json(
        {
          ok: false,
          action: "bleep_processor",
          sourceUrl,
          message: "Downloaded audio was empty.",
        },
        { status: 422, headers: { "Cache-Control": "no-store" } }
      );
    }

    const publicDir = join(process.cwd(), "public", "audio", "smartdj");
    if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

    const nameBase = safeSlug(payload.track?.title ?? payload.track?.id ?? jobId ?? "smartdj-audio");
    const filename = `${Date.now()}-${nameBase}-radio-safe.mp3`;
    const filePath = join(publicDir, filename);

    writeFileSync(filePath, bytes);

    const processedUrl = `/audio/smartdj/${filename}`;
    const jobUpdate = await markJobReady(request.nextUrl.origin, jobId, processedUrl);

    return NextResponse.json(
      {
        ok: true,
        action: "bleep_processor",
        jobId,
        sourceUrl,
        processedAudioUrl: processedUrl,
        bleepedAudioUrl: processedUrl,
        cleanAudioUrl: processedUrl,
        radioSafeAudioUrl: processedUrl,
        bytes: bytes.length,
        contentType,
        jobUpdate,
        message:
          "PROCESSED_AUDIO_READY - radio-safe audio copy saved and linked to bleep job.",
        note:
          "This stage creates the real processed audio file hook. Word-level beep muting comes next with transcript timestamps.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        action: "bleep_processor",
        message:
          error instanceof Error
            ? error.message
            : "Bleep processor failed.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
