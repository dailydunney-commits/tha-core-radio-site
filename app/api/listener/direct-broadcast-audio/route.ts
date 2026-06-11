import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROOT = process.cwd();
const STATE = path.join(ROOT, ".data", "direct-broadcast-audio", "current.json");

function contentType(file: string) {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".mp3") return "audio/mpeg";
  if (ext === ".wav") return "audio/wav";
  if (ext === ".m4a") return "audio/mp4";
  if (ext === ".aac") return "audio/aac";
  if (ext === ".ogg") return "audio/ogg";
  if (ext === ".flac") return "audio/flac";
  return "application/octet-stream";
}

export async function GET() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE, "utf8"));
    const file = String(state.file || "");

    if (!file || !fs.existsSync(file)) {
      return NextResponse.json({ ok: false, error: "DIRECT_AUDIO_FILE_MISSING" }, { status: 404 });
    }

    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size < 1000) {
      return NextResponse.json({ ok: false, error: "DIRECT_AUDIO_FILE_EMPTY" }, { status: 404 });
    }

    const bytes = fs.readFileSync(file);

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType(file),
        "Content-Length": String(bytes.length),
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json({ ok: false, error: "DIRECT_AUDIO_NOT_READY" }, { status: 404 });
  }
}
