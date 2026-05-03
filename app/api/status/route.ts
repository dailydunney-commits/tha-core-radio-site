import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cleanBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export async function GET() {
  try {
    const baseUrl = process.env.AZURACAST_BASE_URL;
    const station =
      process.env.AZURACAST_STATION_SHORTCODE ||
      process.env.AZURACAST_STATION_ID;

    if (!baseUrl || !station) {
      return NextResponse.json(
        {
          ok: false,
          connected: false,
          message:
            "Missing AZURACAST_BASE_URL or AZURACAST_STATION_SHORTCODE/AZURACAST_STATION_ID.",
        },
        { status: 500 }
      );
    }

    const url = `${cleanBaseUrl(baseUrl)}/api/nowplaying/${station}`;

    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          connected: false,
          message: `AzuraCast status request failed: ${response.status}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    const isLive = Boolean(data?.live?.is_live);
    const isOnline = Boolean(data?.station?.is_online ?? true);

    return NextResponse.json({
      ok: true,
      connected: true,

      stationName: data?.station?.name || "Tha Core Online Radio",
      streamUrl:
        data?.station?.listen_url ||
        process.env.NEXT_PUBLIC_STREAM_URL ||
        "",

      isOnAir: isOnline,
      isLive,
      autoDj: isOnline && !isLive,

      liveDjName: data?.live?.streamer_name || null,

      listeners: {
        current: data?.listeners?.current ?? 0,
        unique: data?.listeners?.unique ?? 0,
        total: data?.listeners?.total ?? 0,
      },

      nowPlaying: {
        artist: data?.now_playing?.song?.artist || "Tha Core",
        title: data?.now_playing?.song?.title || "Live Radio",
        text:
          data?.now_playing?.song?.text ||
          "Tha Core Online Radio",
        albumArt: data?.now_playing?.song?.art || null,
        elapsed: data?.now_playing?.elapsed ?? 0,
        remaining: data?.now_playing?.remaining ?? 0,
      },

      recentSongs: data?.song_history || [],

      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown radio status error.",
      },
      { status: 500 }
    );
  }
}