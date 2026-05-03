import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cleanBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const adminKeyFromHeader = request.headers.get("x-admin-key");
    const adminKeyFromBody = body?.adminKey;
    const adminKey = adminKeyFromHeader || adminKeyFromBody;

    if (!process.env.ADMIN_CONTROL_KEY) {
      return NextResponse.json(
        { ok: false, message: "Missing ADMIN_CONTROL_KEY on server." },
        { status: 500 }
      );
    }

    if (adminKey !== process.env.ADMIN_CONTROL_KEY) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized control request." },
        { status: 401 }
      );
    }

    const command = body?.command;

    const baseUrl = process.env.AZURACAST_BASE_URL;
    const stationId =
      process.env.AZURACAST_STATION_ID ||
      process.env.AZURACAST_STATION_SHORTCODE;
    const apiKey = process.env.AZURACAST_API_KEY;

    if (!baseUrl || !stationId || !apiKey) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Missing AZURACAST_BASE_URL, AZURACAST_STATION_ID/AZURACAST_STATION_SHORTCODE, or AZURACAST_API_KEY.",
        },
        { status: 500 }
      );
    }

    let azuraEndpoint = "";

    if (command === "skip") {
      azuraEndpoint = `${cleanBaseUrl(
        baseUrl
      )}/api/station/${stationId}/backend/skip`;
    } else {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Command not allowed. For safety, only skip is enabled right now.",
        },
        { status: 400 }
      );
    }

    const response = await fetch(azuraEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          command,
          message: `AzuraCast command failed: ${response.status}`,
          details: text,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      command,
      message: "Radio command sent successfully.",
      details: text,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unknown radio command error.",
      },
      { status: 500 }
    );
  }
}