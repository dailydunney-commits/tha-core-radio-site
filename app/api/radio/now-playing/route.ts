import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL =
  process.env.AZURACAST_BASE_URL ||
  "http://thacoreonlinerad.com";

const STATION_SHORTCODE =
  process.env.AZURACAST_STATION_SHORTCODE ||
  "tha-core-online";

const DIRECT_NOW_PLAYING_URL =
  process.env.AZURACAST_NOW_PLAYING_URL ||
  process.env.NEXT_PUBLIC_AZURACAST_NOW_PLAYING_URL ||
  "";

const NOW_PLAYING_URL =
  DIRECT_NOW_PLAYING_URL ||
  `${BASE_URL}/api/nowplaying/${STATION_SHORTCODE}`;

function fallbackPayload(errorMessage: string) {
  return {
    ok: false,
    fallback: true,
    error: errorMessage,
    station: {
      name: "Tha Core Online Radio",
      shortcode: STATION_SHORTCODE,
    },
    listeners: {
      total: 0,
      unique: 0,
      current: 0,
    },
    now_playing: {
      song: {
        title: "Live stream active",
        artist: "Tha Core Online Radio",
        text: "Tha Core Online Radio - Live stream active",
        art: "",
      },
    },
    playing_next: null,
    song_history: [],
    checked_at: new Date().toISOString(),
  };
}

async function fetchWithTimeout(url: string, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function getNowPlaying() {
  let lastError = "Unknown now-playing error.";

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(NOW_PLAYING_URL, attempt === 1 ? 8000 : 12000);
      const text = await response.text();

      let data: unknown = null;

      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        throw new Error("AzuraCast returned non-JSON now-playing data.");
      }

      if (!response.ok) {
        lastError = `AzuraCast now-playing failed with status ${response.status}.`;
        continue;
      }

      return {
        ok: true,
        source: NOW_PLAYING_URL,
        checked_at: new Date().toISOString(),
        ...(typeof data === "object" && data !== null ? data : { raw: data }),
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "Could not reach AzuraCast now-playing.";
    }
  }

  return fallbackPayload(lastError);
}

export async function GET() {
  const data = await getNowPlaying();

  return NextResponse.json(data, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}
