import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SMARTDJ_ENGINE_URL =
  process.env.SMARTDJ_ENGINE_URL || "http://localhost:5050";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const question = String(body?.question || "").trim();

    if (!question) {
      return NextResponse.json(
        { ok: false, error: "Missing SmartDJ question." },
        { status: 400 }
      );
    }

    const response = await fetch(`${SMARTDJ_ENGINE_URL}/ask`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ question }),
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
          "Could not reach SmartDJ Ask Mode. Make sure SmartDJ is running on localhost:5050.",
      },
      { status: 500 }
    );
  }
}
