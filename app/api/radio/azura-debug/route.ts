import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getAzuraBaseUrl(): string {
  return (
    process.env.AZURACAST_BASE_URL ||
    process.env.NEXT_PUBLIC_AZURACAST_BASE_URL ||
    "http://thacoreonlinerad.com"
  ).replace(/\/+$/, "");
}

function getAzuraStationId(): string {
  return (
    process.env.AZURACAST_STATION_ID ||
    process.env.NEXT_PUBLIC_AZURACAST_STATION_ID ||
    "1"
  );
}

function getApiKey(): string {
  return process.env.AZURACAST_API_KEY || "";
}

function headers(): HeadersInit {
  const apiKey = getApiKey();

  const h: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (apiKey) {
    h.Authorization = `Bearer ${apiKey}`;
    h["X-API-Key"] = apiKey;
  }

  return h;
}

async function testFetch(label: string, url: string, method: "GET" | "POST" = "GET") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  const started = Date.now();

  try {
    const response = await fetch(url, {
      method,
      headers: headers(),
      cache: "no-store",
      signal: controller.signal,
      body: method === "POST" ? JSON.stringify({ currentDirectory: "" }) : undefined,
    });

    const text = await response.text();

    return {
      label,
      url,
      method,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      ms: Date.now() - started,
      bodyPreview: text.slice(0, 300),
    };
  } catch (error: any) {
    return {
      label,
      url,
      method,
      ok: false,
      status: 0,
      ms: Date.now() - started,
      errorName: error?.name || "UnknownError",
      errorMessage: error?.message || String(error),
      errorCode: error?.code || error?.cause?.code || "",
      errorCause: error?.cause?.message || "",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const baseUrl = getAzuraBaseUrl();
  const stationId = getAzuraStationId();

  const tests = await Promise.all([
    testFetch("base", baseUrl),
    testFetch("api root", `${baseUrl}/api`),
    testFetch("nowplaying", `${baseUrl}/api/nowplaying`),
    testFetch("station files GET", `${baseUrl}/api/station/${stationId}/files`),
    testFetch("station files search", `${baseUrl}/api/station/${stationId}/files?search=mother`),
    testFetch("station files list POST", `${baseUrl}/api/station/${stationId}/files/list`, "POST"),
    testFetch("stream", `${baseUrl}/listen/tha-core-online/radio.mp3`),
  ]);

  return NextResponse.json(
    {
      ok: true,
      baseUrl,
      stationId,
      hasApiKey: Boolean(getApiKey()),
      tests,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
