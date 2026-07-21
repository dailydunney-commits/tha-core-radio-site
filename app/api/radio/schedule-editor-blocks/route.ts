import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), ".data", "schedule-editor-blocks.json");

// SCHEDULE_EDITOR_MIRROR_MUZIK_SETTINGS_V1
const MUZIK_BLOCKS_V1_FILE = path.join(process.cwd(), ".data", "schedule-editor-muzik-blocks-v5.json");
const MUZIK_REFRESH_V1_FILE = path.join(process.cwd(), ".data", "schedule-editor-muzik-refresh-v1.json");

function hasMuzikSettingsV1(block: any): boolean {
  if (!block || typeof block !== "object") return false;
  const text = String(block.type || block.kind || block.category || block.name || block.title || "").toLowerCase();
  return (
    text.includes("muzik") ||
    text.includes("music") ||
    block.playbackOrder != null ||
    block.playOrder != null ||
    block.playbackMode != null ||
    block.primaryLane != null ||
    block.selectedLane != null ||
    block.fallbackLanes != null ||
    block.songsBetweenJingles != null ||
    block.jingleBetweenSongs != null ||
    block.overlayJingles != null ||
    block.noRepeatArtistCount != null ||
    block.noRepeatTitleCount != null
  );
}

async function mirrorMuzikSettingsV1(data: any) {
  try {
    const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
    const muzikBlocks = blocks.filter(hasMuzikSettingsV1);
    if (!muzikBlocks.length) return;

    const now = new Date().toISOString();
    const refreshVersion = Date.now();

    const payload = {
      ok: true,
      blocks: muzikBlocks,
      muzikBlocks,
      musicBlocks: muzikBlocks,
      updatedAt: now,
      refreshVersion,
      source: "SCHEDULE_EDITOR_MIRROR_MUZIK_SETTINGS_V1",
    };

    await fs.writeFile(MUZIK_BLOCKS_V1_FILE, JSON.stringify(payload, null, 2), "utf8");
    await fs.writeFile(
      MUZIK_REFRESH_V1_FILE,
      JSON.stringify(
        {
          ok: true,
          updatedAt: now,
          refreshVersion,
          source: "SCHEDULE_EDITOR_MIRROR_MUZIK_SETTINGS_V1",
          blockCount: muzikBlocks.length,
        },
        null,
        2
      ),
      "utf8"
    );
  } catch {}
}


function nowIso() {
  return new Date().toISOString();
}

function seed() {
  return {
    ok: true,
    version: "SCHEDULE_EDITOR_SHOW_PROGRAM_BLOCKS_V1",
    updatedAt: nowIso(),
    musicBlocksUntouched: true,
    blocks: [
      {
        id: "program-nia-news-1300",
        kind: "program",
        title: "Nia 1:00 PM News",
        enabled: true,
        startTime: "13:00",
        durationMinutes: 15,
        protectedBroadcast: true,
        archiveAfterBroadcast: true,
        blockType: "midday-news",
        showId: "nia-news",
        programType: "nia-news-program",
        hostVoice: "Nia",
        modules: { news: true, sports: true, weather: true, traffic: false, community: false },
        internalMusic: { enabled: false, genreLane: "News", songsBetweenSegments: 0, musicSource: "SmartZJ" },
        routing: {
          builderRoute: "/api/radio/ai-host-news-rundown",
          runnerRoute: "/api/radio/ai-host-news-runner",
          playbackLibrary: true,
          smartZjFallbackGuard: true,
          niaProtected: true
        },
        notes: "Protected Nia news program block. Music Blocks remain separate."
      },
      {
        id: "show-core-music-link-up",
        kind: "show",
        title: "The Core Music Link-Up",
        enabled: true,
        startTime: "18:00",
        durationMinutes: 60,
        protectedBroadcast: true,
        archiveAfterBroadcast: true,
        blockType: "evening-music-show",
        showId: "evening-music-show",
        programType: "ai-long-show",
        hostVoice: "AI Host",
        modules: { news: false, sports: true, weather: true, traffic: false, community: true },
        internalMusic: { enabled: true, genreLane: "R-n-B", songsBetweenSegments: 2, musicSource: "SmartZJ" },
        routing: {
          builderRoute: "/api/radio/ai-host-long-show-package-feeder",
          runnerRoute: "/api/radio/ai-host-long-show-live-runner",
          playbackLibrary: true,
          smartZjFallbackGuard: true,
          niaProtected: true
        },
        notes: "AI show block with internal music between segments. Existing Music Blocks stay untouched."
      }
    ]
  };
}

async function readData() {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.blocks)) return parsed;
  } catch {}
  const data = seed();
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
  await mirrorMuzikSettingsV1(data);
  return data;
}

export async function GET() {
  const data = await readData();
  return NextResponse.json({
    ...data,
    route: "/api/radio/schedule-editor-blocks",
    purpose: "Owner Schedule Editor Show/Program Blocks",
    moduleFeeds: {
      news: "/api/news",
      sports: "/api/news?category=sports",
      weather: "/api/weather"
    }
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.blocks)) {
    return NextResponse.json({ ok: false, error: "blocks array required" }, { status: 400 });
  }

  const data = {
    ok: true,
    version: "SCHEDULE_EDITOR_SHOW_PROGRAM_BLOCKS_V1",
    updatedAt: nowIso(),
    musicBlocksUntouched: true,
    blocks: body.blocks
  };

  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");

    // SCHEDULE_EDITOR_POST_MIRROR_MUZIK_SETTINGS_V1
    // Keep music-block playback settings in sync after every Schedule Editor save.
    await mirrorMuzikSettingsV1(data);
  return NextResponse.json({
    ok: true,
    saved: true,
    blockCount: data.blocks.length,
    updatedAt: data.updatedAt
  });
}
