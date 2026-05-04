import { NextRequest, NextResponse } from "next/server";
import { getAuthHeaders, getAzuraBaseUrl, getAzuraStationId, type RadioAction } from "@/lib/azuracast";

export const dynamic = "force-dynamic";

const allowedActions: RadioAction[] = ["skip", "restart", "start", "stop"];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action as RadioAction | undefined;

    if (!action || !allowedActions.includes(action)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid radio action.",
          allowedActions,
        },
        { status: 400 }
      );
    }

    const baseUrl = getAzuraBaseUrl();
    const stationId = getAzuraStationId();

    const response = await fetch(`${baseUrl}/api/station/${stationId}/backend/${action}`, {
      method: "POST",
      cache: "no-store",
      headers: getAuthHeaders(),
    });

    const text = await response.text();

    let details: unknown = null;

    try {
      details = text ? JSON.parse(text) : null;
    } catch {
      details = text;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          action,
          status: response.status,
          error: "AzuraCast action failed.",
          details,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      action,
      message: `Radio action completed: ${action}`,
      details,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown radio action error.",
      },
      { status: 500 }
    );
  }
}