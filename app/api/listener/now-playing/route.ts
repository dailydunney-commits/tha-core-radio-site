import { NextResponse } from "next/server";
import fs from "fs/promises";
import { execFile } from "child_process";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT_DIR = process.cwd();
const DATA_DIR = path.join(ROOT_DIR, ".data");
const CURRENT_BROADCAST_FILE = path.join(DATA_DIR, "current-broadcast.json");

type AnyObj = Record<string, any>;


function publicAudioUrlToFilePathV1(audioUrl: string) {
  const raw = String(audioUrl || "").split("?")[0].split("#")[0];
  if (!raw) return "";
  const clean = decodeURIComponent(raw);
  if (clean.startsWith("/audio/")) return path.join(ROOT_DIR, "public", clean.replace(/^\/+/, ""));
  if (clean.startsWith("audio/")) return path.join(ROOT_DIR, "public", clean);
  if (clean.startsWith("public/audio/")) return path.join(ROOT_DIR, clean);
  return "";
}

async function ffprobeDurationFallbackV1(audioUrl: string): Promise<number | null> {
  // NOW_PLAYING_FFPROBE_DURATION_FALLBACK_V1
  const filePath = publicAudioUrlToFilePathV1(audioUrl);
  if (!filePath) return null;

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size < 1000) return null;
  } catch {
    return null;
  }

  return await new Promise((resolve) => {
    execFile(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", filePath],
      { windowsHide: true },
      (_error, stdout) => {
        const value = Number(String(stdout || "").trim());
        resolve(Number.isFinite(value) && value > 0 ? value : null);
      }
    );
  });
}


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

  // NOW_PLAYING_MIRROR_CURRENT_DURATION_V1
  const startedAt = text(
    current.startedAt,
    text(current.track?.startedAt, text(current.started_at, ""))
  );
  const updatedAt = text(
    current.updatedAt,
    text(current.track?.updatedAt, startedAt)
  );
  const durationValue = Number(
    current.durationSec ??
      current.durationSeconds ??
      current.duration ??
      current.track?.durationSec ??
      current.track?.durationSeconds ??
      current.track?.duration ??
      0
  );
  let durationSec =
    Number.isFinite(durationValue) && durationValue > 0 ? durationValue : null;

  const stamp = encodeURIComponent(
    text(updatedAt, text(startedAt, String(Date.now())))
  );

  const liveUrl = `/api/listener/live-current-audio?t=${stamp}`;
  const title = text(current.title, text(current.track?.title, "Owner Current Broadcast"));
  const artist = text(current.artist, text(current.track?.artist, "Tha Core Online Radio"));
  const programName = text(current.programName, text(current.track?.programName, "Owner Current Broadcast"));
  const source = text(current.source, text(current.track?.source, "CURRENT_BROADCAST"));
  const directAudioUrl = current.audioUrl || current.streamUrl || current.listen_url || "";

  if (!durationSec) {
    durationSec = await ffprobeDurationFallbackV1(String(directAudioUrl || ""));
  }

  const startedMs = Date.parse(String(startedAt || ""));
  const elapsedSec =
    Number.isFinite(startedMs) && startedMs > 0
      ? Math.max(0, Math.floor((Date.now() - startedMs) / 1000))
      : 0;
  const remainingSec =
    durationSec && durationSec > 0 ? Math.max(0, Math.ceil(durationSec - elapsedSec)) : 0;
  const computedExpectedEndAt =
    durationSec && Number.isFinite(startedMs) && startedMs > 0
      ? new Date(startedMs + durationSec * 1000).toISOString()
      : null;


    // NOW_PLAYING_SCHEDULE_METADATA_MIRROR_V1
    const reason = text(current.reason, text(current.selectionReason, text(current.track?.reason, text(current.track?.selectionReason, ""))));
    const selectionReason = text(current.selectionReason, reason);
    const playbackOrder = text(current.playbackOrder, text(current.track?.playbackOrder, text(current.activeBlock?.playbackOrder, "")));
    const selectedLane = text(current.selectedLane, text(current.track?.selectedLane, text(current.activeBlock?.selectedLane, text(current.genreLane, text(current.track?.genreLane, "")))));
    const primaryLane = text(current.primaryLane, text(current.track?.primaryLane, text(current.activeBlock?.primaryLane, selectedLane)));
    const lane = text(current.lane, text(current.track?.lane, selectedLane));
    const genreLane = text(current.genreLane, text(current.track?.genreLane, selectedLane));
    const activeBlockId = text(current.activeBlockId, text(current.track?.activeBlockId, text(current.activeBlock?.id, "")));
    const expectedEndAt = text(current.expectedEndAt, text(current.track?.expectedEndAt, ""));

  return NextResponse.json(
    {
      ok: true,
      mode: "CURRENT_BROADCAST",
      safety: text(current.safety, "OWNER_CURRENT_BROADCAST_TRUTH"),
      source,
      type: text(current.type, "CURRENT_BROADCAST"),
        reason: reason || null,
        selectionReason: selectionReason || null,
        playbackOrder: playbackOrder || null,
        lane: lane || null,
        selectedLane: selectedLane || null,
        primaryLane: primaryLane || null,
        genreLane: genreLane || null,
        activeBlockId: activeBlockId || null,
        activeBlock: current.activeBlock || null,
        expectedEndAt: expectedEndAt || computedExpectedEndAt || null,
      is_online: true,

      title,
      artist,
      programName,

      audioUrl: liveUrl,
      streamUrl: liveUrl,
      listen_url: liveUrl,

      directAudioUrl,
      durationSec,
      durationSeconds: durationSec,
      startedAt: startedAt || null,
      updatedAt: updatedAt || null,
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
        broadcast_start: startedAt || null,
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
        currentUpdatedAt: updatedAt || null,
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
