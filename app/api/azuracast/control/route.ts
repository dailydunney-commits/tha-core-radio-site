import { NextRequest, NextResponse } from "next/server";

const AZURACAST_BASE_URL =
  process.env.AZURACAST_BASE_URL ||
  process.env.AZURACAST_URL ||
  "http://thacoreonlinerad.com";

const AZURACAST_API_KEY =
  process.env.AZURACAST_API_KEY ||
  process.env.AZURACAST_ADMIN_API_KEY ||
  "";

const STATION_ID =
  process.env.AZURACAST_STATION_ID ||
  process.env.AZURACAST_STATION_SHORT_NAME ||
  "tha-core-online";

const ACTION_PATHS: Record<string, string> = {
  start_autodj: `/api/station/${STATION_ID}/backend/start`,
  restart_autodj: `/api/station/${STATION_ID}/backend/restart`,

  // CUE / STOP ALL BROADCASTING
  cue_stop_all: `/api/station/${STATION_ID}/backend/stop`,
  stop_autodj: `/api/station/${STATION_ID}/backend/stop`,

  // Live DJ mode prepares Azura backend to receive / run live session.
  go_on_air: `/api/station/${STATION_ID}/backend/start`,
};

function cleanBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

async function callAzura(path: string) {
  if (!AZURACAST_API_KEY) {
    return {
      ok: false,
      status: 500,
      message:
        "Missing AZURACAST_API_KEY or AZURACAST_ADMIN_API_KEY in environment.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(`${cleanBaseUrl(AZURACAST_BASE_URL)}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AZURACAST_API_KEY}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();

    return {
      ok: res.ok,
      status: res.status,
      message: text || (res.ok ? "Azura command sent." : "Azura command failed."),
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to reach AzuraCast.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  let action = "";

  try {
    const body = await req.json();
    action = String(body?.action || "");
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Missing action.",
      },
      { status: 400 }
    );
  }

  const path = ACTION_PATHS[action];

  if (!path) {
    return NextResponse.json(
      {
        ok: false,
        action,
        message: `Unknown Azura action: ${action}`,
      },
      { status: 400 }
    );
  }

  const result = await callAzura(path);

  return NextResponse.json(
    {
      action,
      path,
      station: STATION_ID,
      ...result,
    },
    { status: result.ok ? 200 : 500 }
  );
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    station: STATION_ID,
    message:
      "Azura control route ready. Use POST with start_autodj, restart_autodj, go_on_air, cue_stop_all, or stop_autodj.",
  });
}