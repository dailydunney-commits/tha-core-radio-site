import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SMARTDJ_ENGINE_URL =
  process.env.SMARTDJ_ENGINE_URL || "http://127.0.0.1:5050";

export async function GET() {
  try {
    const response = await fetch(`${SMARTDJ_ENGINE_URL}/latest-playlist`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => null);

    return NextResponse.json({
      ok: response.ok,
      source: SMARTDJ_ENGINE_URL,
      smartdj: data,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Could not reach SmartDJ latest playlist.",
      },
      { status: 200 }
    );
  }
}
