import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SMARTDJ_ENGINE_URL =
  process.env.SMARTDJ_ENGINE_URL || "http://localhost:5050";

export async function GET() {
  try {
    const response = await fetch(`${SMARTDJ_ENGINE_URL}/recommend-next`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "SmartDJ engine returned an error.",
          status: response.status,
          details: data,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      ok: true,
      source: SMARTDJ_ENGINE_URL,
      smartdj: data,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Could not reach SmartDJ Engine. Make sure smartdj-engine is running on http://localhost:5050.",
      },
      { status: 500 }
    );
  }
}
