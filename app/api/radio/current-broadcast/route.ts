import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CurrentBroadcastState = {
  ok: boolean;
  status: "IDLE" | "SMARTDJ_BROADCASTING" | "AUTODJ_BROADCASTING" | "LIVEDJ_BROADCASTING";
  source: string;
  title: string;
  artist: string;
  audioUrl: string;
  startedAt: string;
  updatedAt: string;
  message: string;
  track?: any;
};

const DATA_DIR = join(process.cwd(), ".data");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");

function blankState(): CurrentBroadcastState {
  const now = new Date().toISOString();

  return {
    ok: true,
    status: "IDLE",
    source: "CONTROL_PANEL",
    title: "",
    artist: "",
    audioUrl: "",
    startedAt: "",
    updatedAt: now,
    message: "No current broadcast handoff yet.",
    track: null,
  };
}

function readCurrentBroadcast(): CurrentBroadcastState {
  try {
    if (!existsSync(CURRENT_BROADCAST_FILE)) return blankState();

    const parsed = JSON.parse(readFileSync(CURRENT_BROADCAST_FILE, "utf8"));

    return {
      ...blankState(),
      ...parsed,
      ok: true,
    };
  } catch {
    return blankState();
  }
}

function saveCurrentBroadcast(state: CurrentBroadcastState) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CURRENT_BROADCAST_FILE, JSON.stringify(state, null, 2), "utf8");
}

function pickAudioUrl(track: any, body: any) {
  return String(
    body?.audioUrl ||
      track?.safeAudioUrl ||
      track?.radioSafeAudioUrl ||
      track?.cleanAudioUrl ||
      track?.bleepedAudioUrl ||
      track?.processedAudioUrl ||
      track?.audioUrl ||
      track?.url ||
      track?.streamUrl ||
      ""
  ).trim();
}

export async function GET() {
  return NextResponse.json(readCurrentBroadcast(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const track = body?.track ?? {};
    const audioUrl = pickAudioUrl(track, body);

    if (!audioUrl) {
      return NextResponse.json(
        {
          ok: false,
          status: "IDLE",
          message: "Current broadcast blocked. Missing clean/bleeped audio URL.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const now = new Date().toISOString();

    const nextState: CurrentBroadcastState = {
      ok: true,
      status: body?.status || "SMARTDJ_BROADCASTING",
      source: body?.source || "SMARTDJ",
      title: String(track?.title || body?.title || "Approved safety queue track"),
      artist: String(track?.artist || body?.artist || "SmartDJ"),
      audioUrl,
      startedAt: body?.startedAt || now,
      updatedAt: now,
      message:
        body?.message ||
        "Current broadcast state saved from approved Audio Safety Center queue.",
      track,
    };

    saveCurrentBroadcast(nextState);

    return NextResponse.json(nextState, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "IDLE",
        message: "Could not save current broadcast state.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }
}

export async function DELETE() {
  const state = blankState();
  saveCurrentBroadcast(state);

  return NextResponse.json(state, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
