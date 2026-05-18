import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CurrentBroadcastState = {
  ok?: boolean;
  status?: string;
  source?: string;
  title?: string;
  artist?: string;
  audioUrl?: string;
  url?: string;
  streamUrl?: string;
  track?: any;
  updatedAt?: string;
};

const DATA_DIR = join(process.cwd(), ".data");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");

function readCurrentBroadcast(): CurrentBroadcastState {
  try {
    if (!existsSync(CURRENT_BROADCAST_FILE)) return {};

    const parsed = JSON.parse(readFileSync(CURRENT_BROADCAST_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function pickCurrentBroadcastUrl(state: CurrentBroadcastState) {
  const track = state.track ?? {};

  return cleanText(
    state.audioUrl ||
      state.streamUrl ||
      state.url ||
      track.safeAudioUrl ||
      track.radioSafeAudioUrl ||
      track.cleanAudioUrl ||
      track.bleepedAudioUrl ||
      track.processedAudioUrl ||
      track.audioUrl ||
      track.streamUrl ||
      track.url
  );
}

function isRawAzuraOrSourceUrl(url: string) {
  const text = url.toLowerCase();

  return (
    text.includes("/listen/") ||
    text.includes("radio.mp3") ||
    text.includes("/api/station/") ||
    text.includes("/files/download") ||
    text.includes("/api/smartdj/audio?src=")
  );
}

function isSafeBroadcastUrl(url: string) {
  const text = url.toLowerCase();

  if (!url) return false;
  if (isRawAzuraOrSourceUrl(url)) return false;

  return (
    text.includes("clean") ||
    text.includes("bleep") ||
    text.includes("processed") ||
    text.includes("safe") ||
    text.startsWith("/audio/")
  );
}

function standbyResponse(message = "Safe broadcast standby. Raw fallback stream is blocked.") {
  return NextResponse.json(
    {
      ok: true,
      mode: "SAFE_STANDBY",
      safety: "PUBLIC_RAW_FALLBACK_BLOCKED",
      is_online: false,
      audioUrl: "",
      streamUrl: "",
      listen_url: "",
      station: {
        name: "Tha Core Online Radio",
        listen_url: "",
        mounts: [],
      },
      listeners: {
        total: 0,
        unique: 0,
        current: 0,
      },
      live: {
        is_live: false,
        streamer_name: "",
        broadcast_start: null,
        art: null,
      },
      now_playing: {
        song: {
          text: "Safe Broadcast Standby",
          artist: "Tha Core Online Radio",
          title: "Safe Broadcast Standby",
          album: "",
          art: null,
        },
        playlist: "Safety Brain",
        is_request: false,
        elapsed: 0,
        remaining: 0,
      },
      playing_next: null,
      song_history: [],
      cache: null,
      message,
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

export async function GET() {
  const current = readCurrentBroadcast();
  const status = cleanText(current.status).toUpperCase();
  const audioUrl = pickCurrentBroadcastUrl(current);

  const hasActiveBroadcast =
    Boolean(audioUrl) && status !== "IDLE" && status !== "OFF_AIR";

  if (!hasActiveBroadcast) {
    return standbyResponse(
      "No clean/bleeped Current Broadcast Output yet. Public raw Azura fallback is blocked."
    );
  }

  if (!isSafeBroadcastUrl(audioUrl)) {
    return standbyResponse(
      "Current broadcast audio was not verified as clean/bleeped/processed. Public playback blocked."
    );
  }

  const title = cleanText(current.title) || "Clean Broadcast";
  const artist = cleanText(current.artist) || cleanText(current.source) || "Tha Core Online Radio";

  return NextResponse.json(
    {
      ok: true,
      mode: "CURRENT_BROADCAST",
      safety: "CLEAN_OR_BLEEPED_CURRENT_BROADCAST",
      is_online: true,
      audioUrl,
      streamUrl: audioUrl,
      listen_url: audioUrl,
      station: {
        name: "Tha Core Online Radio",
        listen_url: audioUrl,
        mounts: [
          {
            name: "Clean/Bleeped Current Broadcast",
            url: audioUrl,
            is_default: true,
          },
        ],
      },
      listeners: {
        total: 0,
        unique: 0,
        current: 0,
      },
      live: {
        is_live: status.includes("LIVE"),
        streamer_name: "",
        broadcast_start: null,
        art: null,
      },
      now_playing: {
        song: {
          text: `${artist} - ${title}`,
          artist,
          title,
          album: "",
          art: null,
        },
        playlist: "Current Broadcast Output",
        is_request: false,
        elapsed: 0,
        remaining: 0,
      },
      playing_next: null,
      song_history: [],
      cache: null,
      message: "Listener side is playing clean/bleeped Current Broadcast Output.",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
