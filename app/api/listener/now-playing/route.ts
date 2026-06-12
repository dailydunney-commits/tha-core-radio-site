import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, ".data");
const CURRENT_BROADCAST_FILE = path.join(DATA_DIR, "current-broadcast.json");

type AnyObj = Record<string, any>;

async function readJson(file: string): Promise<AnyObj | null> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function text(value: any, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function standby() {
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
      listeners: { total: 0, unique: 0, current: 0 },
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
      message:
        "Waiting for owner/control panel current broadcast. Public listener will not choose Safe Rotation, drops, SmartZJ, Nia, AI, or fallback audio by itself.",
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function GET() {
  const current = await readJson(CURRENT_BROADCAST_FILE);

  if (!current || (!current.audioUrl && !current.streamUrl && !current.listen_url)) {
    return standby();
  }

  const stamp = encodeURIComponent(
    text(current.updatedAt, text(current.startedAt, String(Date.now())))
  );

  const liveUrl = `/api/listener/live-current-audio?t=${stamp}`;
  const title = text(current.title, text(current.track?.title, "Owner Current Broadcast"));
  const artist = text(current.artist, text(current.track?.artist, "Tha Core Online Radio"));
  const programName = text(current.programName, text(current.track?.programName, "Owner Current Broadcast"));
  const source = text(current.source, text(current.track?.source, "CURRENT_BROADCAST"));

  return NextResponse.json(
    {
      ok: true,
      mode: "CURRENT_BROADCAST",
      safety: text(current.safety, "OWNER_CURRENT_BROADCAST_TRUTH"),
      source,
      type: text(current.type, "CURRENT_BROADCAST"),
      is_online: true,

      title,
      artist,
      programName,

      audioUrl: liveUrl,
      streamUrl: liveUrl,
      listen_url: liveUrl,

      directAudioUrl: current.audioUrl || current.streamUrl || current.listen_url || "",
      currentBroadcast: current,

      station: {
        name: "Tha Core Online Radio",
        listen_url: liveUrl,
        mounts: [{ name: "Owner Current Broadcast", url: liveUrl }],
      },

      listeners: { total: 0, unique: 0, current: 0 },

      live: {
        is_live: true,
        streamer_name: programName,
        broadcast_start: current.startedAt || null,
        art: null,
      },

      now_playing: {
        song: {
          text: `${artist} - ${title}`,
          artist,
          title,
          album: programName,
          art: null,
        },
        playlist: programName,
        is_request: false,
        elapsed: 0,
        remaining: 0,
      },

      playing_next: null,
      song_history: [],
      cache: {
        disabled: true,
        generatedAt: new Date().toISOString(),
        currentUpdatedAt: current.updatedAt || null,
      },

      protectedBroadcast: current.protectedBroadcast !== false,
      smartZJRequired: false,
      rawAzuraBlocked: true,
      message: `${programName} is live from the owner/control-panel current-broadcast truth.`,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
