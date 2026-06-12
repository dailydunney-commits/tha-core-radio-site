import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, readFile, stat, writeFile } from "fs/promises";
import { join, normalize } from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROOT = process.cwd();
const DATA_DIR = join(ROOT, ".data");
const LIB_DIR = join(DATA_DIR, "program-playback-library");
const PUBLIC_DIR = join(ROOT, "public");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");

type AnyRecord = Record<string, any>;

async function findLibraryItem(input: AnyRecord) {
  await mkdir(LIB_DIR, { recursive: true });

  const files = (await readdir(LIB_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort()
    .reverse();

  const wantProgramId = String(input.programId || "").trim();
  const wantLibraryFile = String(input.libraryFile || "").trim();

  for (const file of files) {
    if (wantLibraryFile && file !== wantLibraryFile) continue;

    const item = JSON.parse(await readFile(join(LIB_DIR, file), "utf8"));

    if (wantProgramId && item.programId !== wantProgramId) continue;

    return { item, libraryFile: file };
  }

  return null;
}

async function validateAudioUrl(audioUrl: string) {
  if (!audioUrl || !audioUrl.startsWith("/audio/")) {
    throw new Error("PLAYBACK_AUDIO_URL_NOT_SAFE");
  }

  const clean = decodeURIComponent(audioUrl.split("?")[0].split("#")[0]);
  const filePath = normalize(join(PUBLIC_DIR, clean.replace(/^\/+/, "")));
  const publicRoot = normalize(PUBLIC_DIR + "/");

  if (!filePath.startsWith(publicRoot)) {
    throw new Error("PLAYBACK_AUDIO_OUTSIDE_PUBLIC");
  }

  const s = await stat(filePath);
  if (!s.isFile() || s.size < 1000) {
    throw new Error("PLAYBACK_AUDIO_FILE_MISSING");
  }

  return { filePath, bytes: s.size };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as AnyRecord;
    const found = await findLibraryItem(body);

    if (!found) {
      return NextResponse.json(
        { ok: false, error: "PROGRAM_PLAYBACK_LIBRARY_ITEM_NOT_FOUND" },
        { status: 404 }
      );
    }

    const item = found.item;
    const audioUrl = String(item.playbackAudioUrl || "");
    const audio = await validateAudioUrl(audioUrl);

    const now = new Date().toISOString();

    const currentBroadcast = {
      ok: true,
      status: "PROGRAM_PLAYBACK_BROADCASTING",
      mode: "CURRENT_BROADCAST",
      safety: "OWNER_PROGRAM_PLAYBACK_LIBRARY_REPLAY",
      source: "AI_PROGRAM_PLAYBACK_LIBRARY",
      type: "AI_PROGRAM_PLAYBACK",
      programId: item.programId,
      programName: item.programName,
      programSlot: item.programSlot || null,
      title: `${item.programName} - Playback`,
      artist: "Tha Core Program Archive",
      audioUrl,
      streamUrl: audioUrl,
      listen_url: audioUrl,
      cleanAudioUrl: audioUrl,
      durationSeconds: Number(item.totalSeconds || 0),
      protectedBroadcast: true,
      smartZJRequired: false,
      smartZJUsed: false,
      rawAzuraBlocked: true,
      noMusicFallback: true,
      archivedPlayback: true,
      startedAt: now,
      updatedAt: now,
      message: "Owner started saved program playback from the Program Playback Library.",
      track: {
        id: `ProgramPlayback/${item.programId}/${found.libraryFile}`,
        trackId: `ProgramPlayback/${item.programId}/${found.libraryFile}`,
        title: `${item.programName} - Playback`,
        artist: "Tha Core Program Archive",
        source: "AI_PROGRAM_PLAYBACK_LIBRARY",
        lane: "AI-Program-Archive",
        folder: "AI-Program-Archive",
        audioUrl,
        streamUrl: audioUrl,
        listen_url: audioUrl,
        cleanAudioUrl: audioUrl,
        programId: item.programId,
        programName: item.programName,
        archivedPlayback: true,
        held: false,
        rawAudioBlocked: true,
      },
      sequence: {
        mode: "OWNER_PROGRAM_PLAYBACK_LIBRARY_REPLAY",
        programId: item.programId,
        programName: item.programName,
        libraryFile: found.libraryFile,
        totalSeconds: Number(item.totalSeconds || 0),
        partCount: Number(item.partCount || 0),
      },
    };

    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(CURRENT_BROADCAST_FILE, JSON.stringify(currentBroadcast, null, 2), "utf8");

    return NextResponse.json({
      ok: true,
      action: "program-playback-started",
      currentBroadcast,
      audioBytes: audio.bytes,
      audioUrl,
      libraryFile: found.libraryFile,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "PROGRAM_PLAYBACK_PLAY_FAILED",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
