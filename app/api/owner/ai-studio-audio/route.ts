import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { promises as fs } from "node:fs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeAudioFileName(value: string) {
  const base = path.basename(String(value || ""));
  if (!/^voice-[a-z0-9_-]+-\d{4}-\d{2}-\d{2}t\d{2}-\d{2}-\d{2}-\d{3}z\.wav$/i.test(base)) return "";
  return base;
}

export async function GET(req: NextRequest) {
  const file = safeAudioFileName(req.nextUrl.searchParams.get("file") || "");

  if (!file) {
    return NextResponse.json({ ok: false, error: "Bad audio file." }, { status: 400 });
  }

  const filePath = path.join(process.cwd(), "public", "audio", "ai-studio", file);

  let data: Buffer;
  try {
    data = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ ok: false, error: "Audio file not found." }, { status: 404 });
  }

  const size = data.byteLength;
  const range = req.headers.get("range");

  const baseHeaders: Record<string, string> = {
    "Content-Type": "audio/wav",
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
    "Content-Disposition": `inline; filename="${file}"`,
  };

  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : size - 1;
      const safeStart = Math.max(0, Math.min(start, size - 1));
      const safeEnd = Math.max(safeStart, Math.min(end, size - 1));
      const chunk = data.subarray(safeStart, safeEnd + 1);

      return new NextResponse(new Uint8Array(chunk) as BodyInit, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Length": String(chunk.byteLength),
          "Content-Range": `bytes ${safeStart}-${safeEnd}/${size}`,
        },
      });
    }
  }

  return new NextResponse(new Uint8Array(data) as BodyInit, {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(size),
    },
  });
}