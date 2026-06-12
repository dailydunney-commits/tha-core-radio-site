import { NextResponse } from "next/server";
import { mkdir, readdir, readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { join, normalize } from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, ".data");
const LIB_DIR = join(DATA_DIR, "program-playback-library");
const PUBLIC_DIR = join(ROOT, "public");

async function fileExistsForAudioUrl(audioUrl: string) {
  if (!audioUrl || !audioUrl.startsWith("/audio/")) return false;

  const clean = decodeURIComponent(audioUrl.split("?")[0].split("#")[0]);
  const filePath = normalize(join(PUBLIC_DIR, clean.replace(/^\/+/, "")));
  const publicRoot = normalize(PUBLIC_DIR + "/");

  if (!filePath.startsWith(publicRoot)) return false;

  try {
    const s = await stat(filePath);
    return s.isFile() && s.size > 1000;
  } catch {
    return false;
  }
}

export async function GET() {
  await mkdir(LIB_DIR, { recursive: true });

  const files = (await readdir(LIB_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();

  const items = [];

  for (const file of files) {
    try {
      const full = join(LIB_DIR, file);
      const item = JSON.parse(await readFile(full, "utf8"));
      const playable = await fileExistsForAudioUrl(String(item.playbackAudioUrl || ""));

      items.push({
        ...item,
        libraryFile: file,
        playable,
      });
    } catch {}
  }

  return NextResponse.json({
    ok: true,
    route: "/api/radio/program-playback-library",
    count: items.length,
    items,
  });
}
