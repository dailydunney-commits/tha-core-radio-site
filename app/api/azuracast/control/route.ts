process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";                     import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.AZURACAST_BASE_URL?.replace(/\/$/, "");
const API_KEY = process.env.AZURACAST_API_KEY;
const STATION_ID = process.env.AZURACAST_STATION_ID || "1";

export async function GET() {
  return NextResponse.json({
    route: "working",
    message: "AzuraCast control API is installed. Buttons use POST.",
    hasBaseUrl: Boolean(BASE_URL),
    hasApiKey: Boolean(API_KEY),
    stationId: STATION_ID,
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  console.log("BUTTON ACTION:", action);

  if (!BASE_URL || !API_KEY) {
    return NextResponse.json({
      success: false,
      action,
      error: "Missing AZURACAST_BASE_URL or AZURACAST_API_KEY in .env.local",
      hasBaseUrl: Boolean(BASE_URL),
      hasApiKey: Boolean(API_KEY),
      stationId: STATION_ID,
    });
  }

  const actionMap: Record<string, string> = {
    start_autodj: `/api/station/${STATION_ID}/backend/restart`,
    go_on_air: `/api/station/${STATION_ID}/backend/restart`,
    restart_autodj: `/api/station/${STATION_ID}/backend/restart`,
    stop_autodj: `/api/station/${STATION_ID}/backend/stop`,
    go_off_air: `/api/station/${STATION_ID}/backend/stop`,
    skip_song: `/api/station/${STATION_ID}/queue/skip`,
    load_next: `/api/station/${STATION_ID}/queue/skip`,
  };

  const path = actionMap[action];

  if (!path) {
    console.log("UNWIRED BUTTON:", action);

    return NextResponse.json({
      success: false,
      action,
      error:
        "This button clicked, but it is not wired to a real AzuraCast endpoint yet. Jingles/drops and mixer buttons use local audio or need a custom player.",
    });
  }

  const url = `${BASE_URL}${path}`;
  const method =
    action === "skip_song" || action === "load_next" ? "DELETE" : "POST";

  console.log("SENT TO:", url);
  console.log("METHOD:", method);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const text = await res.text();

    console.log("AZURACAST STATUS:", res.status);
    console.log("AZURACAST RESPONSE:", text);

    return NextResponse.json({
      success: res.ok,
      action,
      method,
      sentTo: url,
      azuracastStatus: res.status,
      azuracastResponse: text,
    });
  } catch (error) {
    console.log("AZURACAST FETCH ERROR:", error);

    return NextResponse.json({
      success: false,
      action,
      method,
      sentTo: url,
      error: String(error),
    });
  }
}