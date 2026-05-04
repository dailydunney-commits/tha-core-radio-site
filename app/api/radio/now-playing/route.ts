import { NextResponse } from "next/server";
import { getAzuraBaseUrl, getAzuraStationShortcode } from "@/lib/azuracast";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const baseUrl = getAzuraBaseUrl();
    const shortcode = getAzuraStationShortcode();

    const response = await fetch(`${baseUrl}/api/nowplaying_static/${shortcode}.json`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "AzuraCast now-playing request failed.",
          status: response.status,
          details: text,
        },
        { status: response.status }
      );
    }

    const data = JSON.parse(text);
    const song = data?.now_playing?.song || {};
    const listeners = data?.listeners || {};
    const station = data?.station || {};

    return NextResponse.json({
      ok: true,
      station: {
        name: station?.name || "Tha Core Online Radio",
        shortcode: station?.shortcode || shortcode,
      },
      nowPlaying: {
        title: song?.title || "Unknown Title",
        artist: song?.artist || "Unknown Artist",
        text:
          song?.text ||
          `${song?.artist || "Unknown Artist"} - ${song?.title || "Unknown Title"}`,
        art: song?.art || null,
      },
      listeners: {
        current: listeners?.current || 0,
        unique: listeners?.unique || 0,
        total: listeners?.total || 0,
      },
      raw: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown now-playing error.",
      },
      { status: 500 }
    );
  }
}
