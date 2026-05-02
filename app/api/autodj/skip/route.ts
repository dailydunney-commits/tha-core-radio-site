import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Skip route exists. Use POST to skip.",
  });
}

export async function POST() {
  const base = process.env.NEXT_PUBLIC_AZURACAST_BASE_URL;
  const key = process.env.AZURACAST_API_KEY;

  if (!base || !key) {
    return NextResponse.json({
      success: false,
      problem: "Missing env value",
      hasBase: Boolean(base),
      hasKey: Boolean(key),
      base,
    });
  }

  const url = `${base}/api/station/1/backend/skip`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-Key": key,
      },
      cache: "no-store",
    });

    const text = await res.text();

    return NextResponse.json({
      success: res.ok,
      calledUrl: url,
      status: res.status,
      statusText: res.statusText,
      response: text,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      problem: "Fetch crashed",
      message: error instanceof Error ? error.message : String(error),
      calledUrl: url,
      hasKey: Boolean(key),
    });
  }
}