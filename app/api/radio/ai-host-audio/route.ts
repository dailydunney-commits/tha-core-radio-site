import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSafeFileName(value: string | null) {
  const file = (value || "").trim();

  if (!file || !/^[a-zA-Z0-9._-]+\.mp3$/.test(file)) {
    return null;
  }

  if (file.includes("..") || file.includes("/") || file.includes("\\")) {
    return null;
  }

  return file;
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fileName = getSafeFileName(url.searchParams.get("file"));

    if (!fileName) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_AUDIO_FILE_REQUIRED",
          message: "Provide a safe MP3 file name.",
        },
        { status: 400 }
      );
    }

    const audioDir = path.join(process.cwd(), "public", "audio", "ai-host");
    const filePath = path.join(audioDir, fileName);

    const info = await stat(filePath).catch(() => null);

    if (!info || !info.isFile()) {
      return NextResponse.json(
        {
          ok: false,
          error: "AI_HOST_AUDIO_NOT_FOUND",
          fileName,
        },
        { status: 404 }
      );
    }

    const range = req.headers.get("range");
    const fileBuffer = await readFile(filePath);
    const total = fileBuffer.length;

    if (range) {
      const match = range.match(/bytes=(\d*)-(\d*)/);
      const start = match?.[1] ? Number(match[1]) : 0;
      const end = match?.[2] ? Number(match[2]) : total - 1;

      if (!Number.isFinite(start) || !Number.isFinite(end) || start >= total || end >= total || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${total}`,
          },
        });
      }

      const chunk = fileBuffer.subarray(start, end + 1);

      return new NextResponse(chunk, {
        status: 206,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(chunk.length),
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, no-store",
        },
      });
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(total),
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "AI_HOST_AUDIO_ROUTE_ERROR",
        message: error?.message || "Unknown error.",
      },
      { status: 500 }
    );
  }
}
