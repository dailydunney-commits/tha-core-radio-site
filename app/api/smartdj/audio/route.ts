import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getAzuraBaseUrl() {
  return (
    process.env.AZURACAST_BASE_URL ||
    process.env.NEXT_PUBLIC_AZURACAST_BASE_URL ||
    "http://thacoreonlinerad.com"
  ).replace(/\/+$/, "");
}

function isAllowedAudioUrl(value: string) {
  try {
    const url = new URL(value);
    const azura = new URL(getAzuraBaseUrl());
    const stream = process.env.NEXT_PUBLIC_STREAM_URL || process.env.STREAM_URL || "";

    if (url.hostname === azura.hostname) return true;

    if (stream) {
      const streamUrl = new URL(stream);
      if (url.hostname === streamUrl.hostname) return true;
    }

    return false;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src") || "";

  if (!src || !isAllowedAudioUrl(src)) {
    return NextResponse.json(
      {
        ok: false,
        message: "SmartDJ audio source is missing or not allowed.",
      },
      { status: 400 }
    );
  }

  const headers: HeadersInit = {};

  const apiKey = process.env.AZURACAST_API_KEY || "";
  if (apiKey) {
    headers["X-API-Key"] = apiKey;
  }

  const range = request.headers.get("range");
  if (range) {
    headers["Range"] = range;
  }

  const upstream = await fetch(src, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    return NextResponse.json(
      {
        ok: false,
        message: `SmartDJ audio proxy failed with status ${upstream.status}.`,
      },
      { status: upstream.status }
    );
  }

  const responseHeaders = new Headers();

  const contentType = upstream.headers.get("content-type") || "audio/mpeg";
  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  const acceptRanges = upstream.headers.get("accept-ranges");

  responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("Cache-Control", "no-store");

  if (contentLength) responseHeaders.set("Content-Length", contentLength);
  if (contentRange) responseHeaders.set("Content-Range", contentRange);
  if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
