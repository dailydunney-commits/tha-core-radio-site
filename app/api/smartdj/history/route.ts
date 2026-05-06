import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SMARTDJ_ENGINE_URL =
  process.env.SMARTDJ_ENGINE_URL || "http://localhost:5050";

export async function GET() {
  try {
    const response = await fetch(`${SMARTDJ_ENGINE_URL}/history`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json({
      ok: true,
      source: SMARTDJ_ENGINE_URL,
      smartdj: data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "SmartDJ history bridge failed.",
      },
      { status: 200 }
    );
  }
}
