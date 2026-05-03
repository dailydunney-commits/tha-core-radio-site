import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NOW_PLAYING_URL =
  process.env.NEXT_PUBLIC_AZURACAST_NOW_PLAYING_URL ||
  "https://thacoreonlinerad.com/api/nowplaying/1";

export async function GET() {
  try {
    const res = await fetch(NOW_PLAYING_URL, {
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          listeners: {
            current: 0,
          },
          now_playing: {
            song: {
              text: "Tha Core Live Mix",
            },
          },
          error: `Azura now-playing failed with status ${res.status}`,
        },
        { status: 200 }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        listeners: {
          current: 0,
        },
        now_playing: {
          song: {
            text: "Tha Core Live Mix",
          },
        },
        error: "Could not reach Azura now-playing API",
      },
      { status: 200 }
    );
  }
}