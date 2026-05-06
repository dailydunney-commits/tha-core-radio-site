import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SMARTDJ_ENGINE_URL =
  process.env.SMARTDJ_ENGINE_URL || "http://localhost:5050";

export async function POST() {
  try {
    const response = await fetch(`${SMARTDJ_ENGINE_URL}/select-next`, {
      method: "POST",
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
        error: "Could not reach SmartDJ select-next. Make sure SmartDJ is running on localhost:5050.",
      },
      { status: 500 }
    );
  }
}
