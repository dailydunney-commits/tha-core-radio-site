import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type AzuraNowPlaying = {
  station?: {
    name?: string;
    listen_url?: string;
    is_online?: boolean;
  };
  listeners?: {
    current?: number;
    unique?: number;
    total?: number;
  };
  live?: {
    is_live?: boolean;
    streamer_name?: string;
  };
  now_playing?: {
    song?: {
      artist?: string;
      title?: string;
      text?: string;
      art?: string | null;
    };
    elapsed?: number;
    remaining?: number;
  };
  song_history?: unknown[];
};

const FALLBACK_STREAM =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

const FALLBACK_NOW_PLAYING =
  process.env.NEXT_PUBLIC_AZURACAST_NOW_PLAYING_URL ||
  "https://thacoreonlinerad.com/api/nowplaying/1";

function cleanBaseUrl(url: string) {
  return url.trim().replace(/\/$/, "");
}

function buildNowPlayingUrls() {
  const urls: string[] = [];

  const publicNowPlaying = process.env.NEXT_PUBLIC_AZURACAST_NOW_PLAYING_URL;
  const baseUrl = process.env.AZURACAST_BASE_URL;
  const stationShortcode = process.env.AZURACAST_STATION_SHORTCODE;
  const stationId = process.env.AZURACAST_STATION_ID;

  if (publicNowPlaying) {
    urls.push(publicNowPlaying);
  }

  if (baseUrl && stationId) {
    urls.push(`${cleanBaseUrl(baseUrl)}/api/nowplaying/${stationId}`);
  }

  if (baseUrl && stationShortcode) {
    urls.push(`${cleanBaseUrl(baseUrl)}/api/nowplaying/${stationShortcode}`);
  }

  urls.push(FALLBACK_NOW_PLAYING);

  return Array.from(new Set(urls.filter(Boolean)));
}

function normalizeStatus(data: AzuraNowPlaying) {
  const song = data?.now_playing?.song;

  const text =
    song?.text ||
    `${song?.artist || "Tha Core"} - ${song?.title || "Live Radio"}`;

  const stationOnline = data?.station?.is_online !== false;

  return {
    ok: true,
    connected: true,
    stationName: data?.station?.name || "Tha Core Online Radio",
    streamUrl: data?.station?.listen_url || FALLBACK_STREAM,
    isOnAir: stationOnline,
    isLive: Boolean(data?.live?.is_live),
    autoDj: !Boolean(data?.live?.is_live),
    liveDjName: data?.live?.streamer_name || null,
    listeners: {
      current: data?.listeners?.current ?? 0,
      unique: data?.listeners?.unique ?? 0,
      total: data?.listeners?.total ?? 0,
    },
    nowPlaying: {
      artist: song?.artist || "Tha Core",
      title: song?.title || "Live Radio",
      text,
      albumArt: song?.art || null,
      elapsed: data?.now_playing?.elapsed ?? 0,
      remaining: data?.now_playing?.remaining ?? 0,
    },
    recentSongs: data?.song_history || [],
    checkedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const urls = buildNowPlayingUrls();
  const errors: string[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "User-Agent": "Tha Core Radio Status Check",
        },
      });

      if (!response.ok) {
        errors.push(`${url} returned ${response.status}`);
        continue;
      }

      const data = (await response.json()) as AzuraNowPlaying;

      return NextResponse.json(normalizeStatus(data), {
        status: 200,
      });
    } catch (error) {
      errors.push(
        error instanceof Error
          ? `${url} failed: ${error.message}`
          : `${url} failed`
      );
    }
  }

  return NextResponse.json(
    {
      ok: false,
      connected: false,
      stationName: "Tha Core Online Radio",
      streamUrl: FALLBACK_STREAM,
      isOnAir: false,
      isLive: false,
      autoDj: false,
      liveDjName: null,
      listeners: {
        current: 0,
        unique: 0,
        total: 0,
      },
      nowPlaying: {
        artist: "Tha Core",
        title: "Live Radio",
        text: "Tha Core - Live Radio",
        albumArt: null,
        elapsed: 0,
        remaining: 0,
      },
      recentSongs: [],
      checkedAt: new Date().toISOString(),
      message:
        errors[0] ||
        "Unable to connect to AzuraCast now playing status right now.",
      attemptedUrls: urls,
    },
    { status: 200 }
  );
}