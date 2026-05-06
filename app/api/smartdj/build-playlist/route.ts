import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ENGINE_URLS = [
  process.env.SMARTDJ_ENGINE_URL,
  "http://127.0.0.1:5050",
  "http://localhost:5050",
].filter(Boolean) as string[];

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const text = String(body?.text || "").trim();

  if (!text) {
    return NextResponse.json(
      { ok: false, error: "Missing playlist command." },
      { status: 400 }
    );
  }

  const attempts: string[] = [];

  for (const engineUrl of ENGINE_URLS) {
    try {
      const response = await fetch(`${engineUrl}/build-playlist`, {
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
        source: engineUrl,
        smartdj: data,
      });
    } catch (error) {
      attempts.push(
        `${engineUrl}: ${
          error instanceof Error ? error.message : "Unknown connection error"
        }`
      );
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Could not reach SmartDJ playlist builder.",
      attempts,
      help: "SmartDJ must be running on localhost:5050.",
    },
    { status: 200 }
  );
}
