import { NextResponse } from "next/server";

const AZURACAST_API_KEY = process.env.AZURACAST_API_KEY!;
const AZURACAST_BASE_URL = "http://18.222.11.16";
const STATION_ID = 1;

// GET (just to confirm route works in browser)
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Jingle route is ready. Use POST to trigger jingle.",
  });
}

// POST (this actually fires the jingle)
export async function POST() {
  try {
    const REQUEST_ID = "1a287707b20065b895d6c02c"; // 🔥 your jingle ID

    const res = await fetch(
      `${AZURACAST_BASE_URL}/api/station/${STATION_ID}/request/${REQUEST_ID}`,
      {
        method: "POST",
        headers: {
          "X-API-Key": AZURACAST_API_KEY,
        },
      }
    );

    const text = await res.text();

    return NextResponse.json({
      success: res.ok,
      status: res.status,
      response: text,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: "jingle trigger failed",
    });
  }
}