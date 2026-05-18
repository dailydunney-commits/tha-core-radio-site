import { NextRequest, NextResponse } from "next/server";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DATA_DIR = join(process.cwd(), ".data");
const SMARTDJ_STATE_FILE = join(DATA_DIR, "smartdj-state.json");

function cleanText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function extractTarget(command: string) {
  const target = cleanText(command)
    .replace(/\b(create|build|make|compile|generate)\b/gi, " ")
    .replace(/\b(playlist|playlists|set|mix|songs|song|tracks|track)\b/gi, " ")
    .replace(/\b(find|play|search|give|me|please|for|a|an|the)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return target || "music";
}

function saveState(state: any) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SMARTDJ_STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function normalizeTrack(item: any, index: number) {
  const audioUrl = cleanText(
    item?.audioUrl ||
      item?.streamUrl ||
      item?.url ||
      item?.safeAudioUrl ||
      item?.radioSafeAudioUrl ||
      item?.cleanAudioUrl ||
      item?.bleepedAudioUrl ||
      ""
  );

  const title = cleanText(
    item?.title ||
      item?.name ||
      item?.text ||
      item?.path_short ||
      item?.path ||
      `SmartDJ Track ${index + 1}`
  );

  const artist = cleanText(item?.artist || item?.creator || "AzuraCast");

  return {
    id: cleanText(
      item?.id ||
        item?.unique_id ||
        item?.media_id ||
        item?.path ||
        `smartdj-playlist-${Date.now()}-${index + 1}`
    ),
    title,
    artist,
    source: cleanText(item?.source || "AzuraCast Source Search"),
    reason: audioUrl
      ? "SmartDJ playlist track found from AzuraCast source search."
      : "SmartDJ playlist metadata found, but no direct audio URL returned.",
    statusText: audioUrl ? "READY - source audio found" : "HELD - needs clean/bleep copy",
    action: audioUrl ? "source_search_playlist_track" : "held_for_clean_bleep",
    audioUrl,
    url: audioUrl,
    streamUrl: audioUrl,
    rawUrl: cleanText(item?.rawUrl || item?.raw_url || item?.download_url || ""),
  };
}

function uniqueTracks(items: any[]) {
  const map = new Map<string, any>();

  items.map(normalizeTrack).forEach((track) => {
    const key = `${track.title}|${track.artist}|${track.audioUrl}`.toLowerCase();
    if (!map.has(key)) map.set(key, track);
  });

  return Array.from(map.values()).slice(0, 12);
}

async function fetchAzuraPlaylist(origin: string, target: string) {
  const response = await fetch(`${origin}/api/radio/azura-source-search`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: target }),
  });

  const data = await response.json().catch(() => null);
  const results = Array.isArray(data?.results) ? data.results : [];

  return {
    ok: Boolean(data?.ok),
    tracks: uniqueTracks(results),
    sourceCount: Number(data?.count || 0),
    message: cleanText(data?.message || ""),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const command = cleanText(body?.text || body?.command || body?.query || "");

    if (!command) {
      return NextResponse.json(
        { ok: false, error: "Missing playlist command." },
        { status: 400 }
      );
    }

    const target = extractTarget(command);
    const found = await fetchAzuraPlaylist(request.nextUrl.origin, target);
    const tracks = found.tracks;

    const state = {
      ok: true,
      command,
      intent: "build_playlist",
      target,
      message:
        tracks.length > 0
          ? `SmartDJ created ${target} playlist with ${tracks.length} track(s).`
          : `SmartDJ could not find playlist tracks for ${target}.`,
      reply:
        tracks.length > 0
          ? `SmartDJ created the playlist with ${tracks.length} track(s).`
          : `SmartDJ could not build a ${target} playlist yet. Try another keyword.`,
      statusText: `SmartDJ playlist loaded: ${tracks.length} track(s).`,
      action:
        tracks.length > 0
          ? "playlist_created_from_azura_source_search"
          : "playlist_no_matches",
      targetPanel: "smartdj_queue",
      playlistTitle: `SmartDJ ${target} playlist`,
      playlist: tracks,
      lastPlaylist: tracks,
      timestamp: new Date().toISOString(),
      resultCount: tracks.length,
      resultLabel: `SmartDJ playlist loaded (${tracks.length})`,
      sourceSearch: {
        ok: found.ok,
        sourceCount: found.sourceCount,
        message: found.message,
      },
    };

    saveState(state);

    return NextResponse.json(state, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "SmartDJ playlist builder failed.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      route: "/api/smartdj/build-playlist",
      message: "POST a command like: create money playlist",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}