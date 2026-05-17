import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  try {
    const currentResponse = await fetch(`${origin}/api/radio/current-broadcast`, {
      method: "GET",
      cache: "no-store",
    });

    const current = await currentResponse.json().catch(() => null);

    if (current?.ok && current?.status !== "IDLE" && current?.audioUrl) {
      return NextResponse.json(
        {
          ok: true,
          mode: "CURRENT_BROADCAST",
          status: current.status,
          source: current.source || "SMARTDJ",
          title: current.title || current.track?.title || "Unknown Song",
          artist: current.artist || current.track?.artist || "SmartDJ",
          audioUrl: current.audioUrl,
          streamUrl: current.audioUrl,
          nowPlaying: `${current.artist || "SmartDJ"} - ${current.title || "Unknown Song"}`,
          message: "Listener now-playing is reading Current Broadcast Output.",
          updatedAt: current.updatedAt,
          track: current.track || null,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const fallbackResponse = await fetch(`${origin}/api/now-playing`, {
      method: "GET",
      cache: "no-store",
    });

    const fallback = await fallbackResponse.json().catch(() => null);

    return NextResponse.json(
      {
        ok: true,
        mode: "FALLBACK_NOW_PLAYING",
        ...fallback,
        message:
          fallback?.message ||
          "No Current Broadcast Output yet. Listener side is using fallback now-playing.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        mode: "ERROR",
        status: "ERROR",
        title: "Unknown Song",
        artist: "Tha Core Online Radio",
        audioUrl: "",
        streamUrl: "",
        nowPlaying: "Tha Core Online Radio",
        message: "Listener now-playing could not read Current Broadcast Output.",
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
