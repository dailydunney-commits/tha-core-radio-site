import { NextResponse } from "next/server";
import { getAzuraApiKey, getAzuraBaseUrl, getAzuraStationId } from "@/lib/azuracast";

export const dynamic = "force-dynamic";

function getSlug(text: string) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  try {
    const baseUrl = getAzuraBaseUrl();
    const stationId = getAzuraStationId();
    const apiKey = getAzuraApiKey();

    const response = await fetch(`${baseUrl}/api/station/${stationId}/requests`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(apiKey
          ? {
              Authorization: `Bearer ${apiKey}`,
              "X-API-Key": apiKey,
            }
          : {}),
      },
    });

    const text = await response.text();

    let raw: unknown = text;

    try {
      raw = text ? JSON.parse(text) : [];
    } catch {
      raw = text;
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Could not load AzuraCast request list.",
          status: response.status,
          details: raw,
        },
        { status: response.status }
      );
    }

    const list = Array.isArray(raw)
      ? raw
      : Array.isArray((raw as any)?.data)
        ? (raw as any).data
        : Array.isArray((raw as any)?.requests)
          ? (raw as any).requests
          : [];

    const mapped = list.map((item: any) => {
      const song = item?.song || item;
      const title = song?.title || item?.title || song?.text || item?.text || "Unknown Title";
      const artist = song?.artist || item?.artist || "";
      const textLabel = song?.text || item?.text || `${artist} ${title}`.trim();

      return {
        slug: getSlug(textLabel || title),
        requestId:
          item?.request_id ||
          item?.requestId ||
          item?.id ||
          item?.unique_id ||
          item?.uniqueId ||
          song?.id ||
          song?.unique_id ||
          song?.uniqueId ||
          null,
        title,
        artist,
        text: textLabel,
        rawKeys: Object.keys(item || {}),
      };
    });

    return NextResponse.json({
      ok: true,
      count: mapped.length,
      help: "Find the jingle/drop/commercial here, copy its requestId, then add it to AZURACAST_PAD_REQUESTS.",
      examplesNeeded: {
        "station-id": "PASTE_REQUEST_ID_HERE",
        "dj-drop": "PASTE_REQUEST_ID_HERE",
        "com-break": "PASTE_REQUEST_ID_HERE",
        "store-ad": "PASTE_REQUEST_ID_HERE",
        "sponsor-ad": "PASTE_REQUEST_ID_HERE"
      },
      requests: mapped,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown request-map error.",
      },
      { status: 500 }
    );
  }
}
