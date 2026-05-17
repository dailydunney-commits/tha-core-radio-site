import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SmartDJTrack = {
  id?: string;
  title?: string;
  artist?: string;
  source?: string;
  reason?: string;
  audioUrl?: string;
  url?: string;
  streamUrl?: string;
  rawUrl?: string;
  path?: string;
};

const DEFAULT_EXPLICIT_WORDS = [
  "explicit",
  "uncensored",
  "dirty",
  "dirty version",
  "raw version",
  "raw edit",
  "parental advisory",
  "fuck",
  "shit",
  "bitch",
  "pussy",
  "bloodclaat",
  "bumboclaat",
  "raasclaat"
];

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getExplicitWords() {
  const custom = process.env.SMARTDJ_EXPLICIT_WORDS || "";

  if (custom.trim()) {
    return custom
      .split(",")
      .map((word) => normalize(word))
      .filter(Boolean);
  }

  return DEFAULT_EXPLICIT_WORDS.map((word) => normalize(word));
}

function detectExplicit(track: SmartDJTrack) {
  const text = normalize(
    [
      track.title,
      track.artist,
      track.source,
      track.reason,
      track.path,
      track.rawUrl,
      track.url,
      track.streamUrl,
      track.audioUrl,
    ].join(" ")
  );

  const found = getExplicitWords().filter((word) => word && text.includes(word));
  return Array.from(new Set(found));
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      route: "/api/smartdj/bleep",
      message: "SmartDJ bleep checker online.",
      mode: "metadata_filename_scan",
      wordCount: getExplicitWords().length,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const track = (body?.track ?? body ?? {}) as SmartDJTrack;

    const explicitWords = detectExplicit(track);
    const needsBleep = explicitWords.length > 0;

    return NextResponse.json(
      {
        ok: true,
        safe: !needsBleep,
        needsBleep,
        explicitWords,
        message: needsBleep
          ? `BLEEP REQUIRED before broadcast. Found: ${explicitWords.join(", ")}`
          : "Track passed SmartDJ bleep check.",
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
        safe: false,
        needsBleep: true,
        message:
          error instanceof Error
            ? error.message
            : "SmartDJ bleep check failed.",
      },
      { status: 500 }
    );
  }
}
