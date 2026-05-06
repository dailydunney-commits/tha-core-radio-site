import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SMARTDJ_ENGINE_URL =
  process.env.SMARTDJ_ENGINE_URL || "http://localhost:5050";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = String(body?.text || "").trim();

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Missing SmartDJ command text." },
        { status: 400 }
      );
    }

    const response = await fetch(`${SMARTDJ_ENGINE_URL}/command`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ text }),
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
        error:
          "Could not reach SmartDJ command engine. Make sure localhost:5050 is running.",
      },
      { status: 500 }
    );
  }
}
