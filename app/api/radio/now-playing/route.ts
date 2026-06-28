import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Tha-Core-Owner-Truth-Only": "true",
    "X-Tha-Core-Raw-Azura-Blocked": "true",
    "X-Tha-Core-No-Old-Fallback": "true",
  };
}

function safeStandby(message: string) {
  // THA_CORE_NOW_PLAYING_OWNER_TRUTH_ONLY_NO_LEAK_V1
  return NextResponse.json(
    {
      ok: true,
      mode: "SAFE_STANDBY",
      safety: "OWNER_TRUTH_ONLY_NO_RAW_AZURA_NO_OLD_FALLBACK",
      source: "OWNER_CURRENT_BROADCAST_MIRROR",
      type: "standby",
      is_online: false,
      title: "",
      artist: "",
      programName: "",
      audioUrl: "",
      streamUrl: "",
      listen_url: "",
      directAudioUrl: "",
      station: {
        name: "Tha Core Online Radio",
        listen_url: "",
        mounts: [],
      },
      listeners: { total: 0, unique: 0, current: 0 },
      live: { is_live: false, streamer_name: "" },
      now_playing: {
        song: { title: "", artist: "", text: "" },
        duration: 0,
        elapsed: 0,
      },
      playing_next: null,
      song_history: [],
      cache: null,
      protectedBroadcast: false,
      smartZJRequired: false,
      rawAzuraBlocked: true,
      azuraBypassed: true,
      oldFallbackBlocked: true,
      message,
    },
    { status: 200, headers: noStoreHeaders() }
  );
}

export async function GET(req: NextRequest) {
  try {
    const ownerTruthUrl = new URL("/api/listener/now-playing", req.url);
    ownerTruthUrl.searchParams.set("_mirror", "now-playing-owner-truth-only");

    const upstream = await fetch(ownerTruthUrl.toString(), { cache: "no-store" });
    const body = await upstream.text();

    let data: any = {};
    try {
      data = body ? JSON.parse(body) : {};
    } catch {
      return safeStandby("Owner current-broadcast mirror returned non-JSON. No fallback audio used.");
    }

    const hasOwnerAudio = Boolean(
      data?.audioUrl ||
        data?.streamUrl ||
        data?.listen_url ||
        data?.directAudioUrl
    );

    if (!hasOwnerAudio) {
      return safeStandby(
        data?.message ||
          "No valid owner/schedule-editor current broadcast audio. No fallback audio used."
      );
    }

    return NextResponse.json(
      {
        ...data,
        route: new URL(req.url).pathname,
        source: data.source || "OWNER_CURRENT_BROADCAST_MIRROR",
        smartZJRequired: false,
        rawAzuraBlocked: true,
        azuraBypassed: true,
        oldFallbackBlocked: true,
        message:
          data.message ||
          "Now-playing mirrors owner/control-panel current broadcast only.",
      },
      { status: 200, headers: noStoreHeaders() }
    );
  } catch {
    return safeStandby("Now-playing owner mirror failed. Raw Azura and old fallback blocked.");
  }
}