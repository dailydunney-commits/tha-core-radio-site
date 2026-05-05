import { NextRequest, NextResponse } from "next/server";
import { getAzuraBaseUrl, getAzuraStationId, getPadRequestMap } from "@/lib/azuracast";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const slug = String(body?.slug || "").trim();

    if (!slug) {
      return NextResponse.json(
        { ok: false, error: "Missing pad slug." },
        { status: 400 }
      );
    }

    const requestMap = getPadRequestMap();
    const requestId = requestMap[slug];

    if (!requestId) {
      return NextResponse.json({
        ok: false,
        mapped: false,
        slug,
        error: `No AzuraCast request ID mapped for pad: ${slug}`,
        help: "The button is working, but this pad needs an AzuraCast request ID in AZURACAST_PAD_REQUESTS.",
      });
    }

    const baseUrl = getAzuraBaseUrl();
    const stationId = getAzuraStationId();

    const response = await fetch(`${baseUrl}/api/station/${stationId}/request/${requestId}`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const text = await response.text();

    let details: unknown = text;

    try {
      details = text ? JSON.parse(text) : null;
    } catch {
      details = text;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          slug,
          requestId,
          error: "AzuraCast pad request failed.",
          details,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      slug,
      requestId,
      message: `Pad sent to AzuraCast: ${slug}`,
      details,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown pad error.",
      },
      { status: 500 }
    );
  }
}
