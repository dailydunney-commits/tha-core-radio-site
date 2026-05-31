import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SmartDJTrack = {
  id: string;
  title: string;
  artist?: string;
  source?: string;
  reason?: string;
  audioUrl?: string;
  url?: string;
  streamUrl?: string;
  rawUrl?: string;
  isExplicit?: boolean;
  explicitWords?: string[];
};

type SmartDJQueueItem = SmartDJTrack & {
  queuedAt: string;
  queueStatus: string;
  broadcastSafe: boolean;
  needsBleep: boolean;
};

declare global {
  var __THA_CORE_SMARTDJ_QUEUE__: SmartDJQueueItem[] | undefined;
}

const DEFAULT_EXPLICIT_WORDS = [
  "explicit",
  "uncensored",
  "dirty version",
  "dirty edit",
  "raw version",
  "parental advisory",
  "fuck",
  "shit",
  "bitch",
  "pussy",
  "bloodclaat",
  "bumboclaat",
  "raasclaat"
];

function getQueue() {
  if (!globalThis.__THA_CORE_SMARTDJ_QUEUE__) {
    globalThis.__THA_CORE_SMARTDJ_QUEUE__ = [];
  }

  return globalThis.__THA_CORE_SMARTDJ_QUEUE__;
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getExplicitWords() {
  const customWords = process.env.SMARTDJ_EXPLICIT_WORDS || "";

  if (customWords.trim()) {
    return customWords
      .split(",")
      .map((word) => normalize(word))
      .filter(Boolean);
  }

  return DEFAULT_EXPLICIT_WORDS.map((word) => normalize(word));
}

function detectExplicitWords(track: SmartDJTrack) {
  const text = normalize(
    [
      track.title,
      track.artist,
      track.source,
      track.reason,
      track.rawUrl,
      track.url,
      track.streamUrl,
      track.audioUrl,
    ].join(" ")
  );

  return getExplicitWords().filter((word) => word && text.includes(word));
}

function getAzuraBaseUrl(): string {
  return (
    process.env.AZURACAST_BASE_URL ||
    process.env.NEXT_PUBLIC_AZURACAST_BASE_URL ||
    "http://thacoreonlinerad.com"
  ).replace(/\/+$/, "");
}

function getAzuraStationId(): string {
  return (
    process.env.AZURACAST_STATION_ID ||
    process.env.NEXT_PUBLIC_AZURACAST_STATION_ID ||
    "1"
  );
}

async function getActiveScheduleRequestPolicy() {
  try {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "http://127.0.0.1:3101";

    const res = await fetch(`${base}/api/radio/smartzj-schedule`, {
      method: "GET",
      cache: "no-store",
      headers: { "Cache-Control": "no-store" },
    });

    const data = await res.json();

    return {
      ok: Boolean(data?.ok),
      active: Boolean(data?.activeBlock),
      activeBlockId: String(data?.activeBlock?.id || ""),
      activeBlockName: String(data?.activeBlock?.name || ""),
      prioritizeOverRequests: Boolean(data?.prioritizeOverRequests || data?.activeBlock?.prioritizeOverRequests),
      interruptBroadcast: Boolean(data?.interruptBroadcast || data?.activeBlock?.interruptBroadcast),
    };
  } catch {
    return {
      ok: false,
      active: false,
      activeBlockId: "",
      activeBlockName: "",
      prioritizeOverRequests: false,
      interruptBroadcast: false,
    };
  }
}

async function trySendToAzuraCastRequest(track: SmartDJTrack) {
  const enabled = process.env.SMARTDJ_SEND_TO_AZURACAST_REQUESTS === "true";

  if (!enabled) {
    return {
      tried: false,
      ok: false,
      message:
        "AzuraCast request sending is off. Track is held in SmartDJ safety queue.",
    };
  }

  const baseUrl = getAzuraBaseUrl();
  const stationId = getAzuraStationId();
  const apiKey = process.env.AZURACAST_API_KEY || "";
  const requestId = encodeURIComponent(track.id);

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const response = await fetch(
    `${baseUrl}/api/station/${stationId}/request/${requestId}`,
    {
      method: "POST",
      headers,
      cache: "no-store",
    }
  );

  const text = await response.text().catch(() => "");

  return {
    tried: true,
    ok: response.ok,
    status: response.status,
    message: response.ok
      ? "Sent to AzuraCast request queue."
      : `AzuraCast request failed with status ${response.status}. Track remains in SmartDJ safety queue.`,
    body: text,
  };
}

export async function GET() {
  const queue = getQueue();

  return NextResponse.json(
    {
      ok: true,
      queue,
      count: queue.length,
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
    const track = (body?.track ?? body) as SmartDJTrack;

    if (!track || !track.id || !track.title) {
      return NextResponse.json(
        {
          ok: false,
          message: "Missing SmartDJ track for queue.",
        },
        { status: 400 }
      );
    }

    const foundExplicitWords = [
      ...(Array.isArray(track.explicitWords) ? track.explicitWords : []),
      ...detectExplicitWords(track),
    ].filter(Boolean);

    const uniqueExplicitWords = Array.from(new Set(foundExplicitWords));
    const needsBleep = Boolean(track.isExplicit || uniqueExplicitWords.length > 0);

    const item: SmartDJQueueItem = {
      ...track,
      isExplicit: needsBleep,
      explicitWords: uniqueExplicitWords,
      queuedAt: new Date().toISOString(),
      needsBleep,
      broadcastSafe: !needsBleep,
      queueStatus: needsBleep
        ? "BLEEP REQUIRED - held in SmartDJ safety queue before broadcast."
        : "Queued in SmartDJ safety queue.",
    };

    const queue = getQueue();
    queue.unshift(item);
    globalThis.__THA_CORE_SMARTDJ_QUEUE__ = queue.slice(0, 30);

    let azuraResult: unknown = null;

    if (!needsBleep) {
      azuraResult = await trySendToAzuraCastRequest(track);
    }

    return NextResponse.json(
      {
        ok: true,
        item,
        queue: globalThis.__THA_CORE_SMARTDJ_QUEUE__,
        message: needsBleep
          ? "Track held for bleep/clean check before broadcast."
          : "Track sent to SmartDJ queue.",
        azuraResult,
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
        message:
          error instanceof Error
            ? error.message
            : "SmartDJ queue route failed.",
      },
      { status: 500 }
    );
  }
}
