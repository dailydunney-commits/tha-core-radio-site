import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DATA_DIR = path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "schedule-editor-muzik-blocks-v5.json");
const REFRESH_FILE = path.join(DATA_DIR, "schedule-editor-muzik-refresh-v1.json");
const SMARTZJ_SCHEDULE_FILE = path.join(DATA_DIR, "smartzj-schedule.json");

type AnyObj = Record<string, any>;

function noStoreHeaders(extra: Record<string, string> = {}) {
  return {
    "Cache-Control": "no-store, no-cache, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "X-Tha-Core-Muzik-Refresh": String(Date.now()),
    ...extra,
  };
}

function readJsonSafe(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function ensureDataDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}

function normalizeBlocksPayload(body: any): AnyObj {
  const now = new Date().toISOString();
  const incomingBlocks = Array.isArray(body)
    ? body
    : Array.isArray(body?.blocks)
      ? body.blocks
      : Array.isArray(body?.muzikBlocks)
        ? body.muzikBlocks
        : Array.isArray(body?.musicBlocks)
          ? body.musicBlocks
          : [];

  const previous = readJsonSafe(FILE, { ok: true, blocks: [] });
  const previousBlocks = Array.isArray(previous)
    ? previous
    : Array.isArray(previous?.blocks)
      ? previous.blocks
      : [];

  const blocks = incomingBlocks.length ? incomingBlocks : previousBlocks;

  return {
    ok: true,
    blocks,
    muzikBlocks: blocks,
    musicBlocks: blocks,
    updatedAt: now,
    refreshVersion: Date.now(),
    source: "SCHEDULE_EDITOR_MUZIK_BLOCKS_UPDATE_SAVE_REFRESH_V1",
  };
}

function writeRefreshSignal(payload: AnyObj) {
  try {
    fs.writeFileSync(
      REFRESH_FILE,
      JSON.stringify(
        {
          ok: true,
          updatedAt: payload.updatedAt,
          refreshVersion: payload.refreshVersion,
          source: payload.source,
          blockCount: Array.isArray(payload.blocks) ? payload.blocks.length : 0,
        },
        null,
        2
      ),
      "utf8"
    );
  } catch {}
}
function syncMuzikBlocksToSmartzjScheduleV1(payload: AnyObj) {
  // SCHEDULE_EDITOR_MUZIK_SAVE_SYNC_SMARTZJ_SCHEDULE_V1
  // Owner music-block saves must update the schedule file SmartZJ actually reads.
  try {
    const incomingBlocks = Array.isArray(payload?.blocks) ? payload.blocks : [];
    if (!incomingBlocks.length) return { synced: false, updated: 0, reason: "NO_INCOMING_BLOCKS" };

    const schedule = readJsonSafe(SMARTZJ_SCHEDULE_FILE, null);
    if (!schedule || !Array.isArray(schedule.blocks)) {
      return { synced: false, updated: 0, reason: "SMARTZJ_SCHEDULE_MISSING" };
    }

    const text = (value: unknown) => String(value ?? "").trim();
    const laneKey = (block: AnyObj) =>
      text(block?.primaryLane || block?.lane || block?.genreLane || block?.selectedLane).toLowerCase();

    let updated = 0;

    const mergedBlocks = schedule.blocks.map((existing: AnyObj) => {
      const existingId = text(existing?.id);
      const existingLane = laneKey(existing);

      const incoming = incomingBlocks.find((block: AnyObj) => {
        const incomingId = text(block?.id);
        if (!incomingId || incomingId !== existingId) return false;

        const incomingLane = laneKey(block);
        if (!incomingLane) return true;

        return incomingLane === existingLane;
      });

      if (!incoming) return existing;

      updated += 1;
      return {
        ...existing,
        ...incoming,
        id: existing.id,
        primaryLane: incoming.primaryLane ?? existing.primaryLane,
      };
    });

    const nextSchedule = {
      ...schedule,
      blocks: mergedBlocks,
      updatedAt: payload.updatedAt || new Date().toISOString(),
      refreshVersion: payload.refreshVersion || Date.now(),
      source: "SCHEDULE_EDITOR_MUZIK_SAVE_SYNC_SMARTZJ_SCHEDULE_V1",
    };

    fs.writeFileSync(SMARTZJ_SCHEDULE_FILE, JSON.stringify(nextSchedule, null, 2), "utf8");

    return { synced: true, updated, reason: "SYNCED" };
  } catch (error: any) {
    return { synced: false, updated: 0, reason: String(error?.message || error || "SYNC_ERROR") };
  }
}

export async function GET() {
  const raw = readJsonSafe(FILE, { ok: true, blocks: [] });
  const blocks = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.blocks)
      ? raw.blocks
      : [];

  const refresh = readJsonSafe(REFRESH_FILE, {});
  const updatedAt = raw?.updatedAt || refresh?.updatedAt || null;
  const refreshVersion = raw?.refreshVersion || refresh?.refreshVersion || Date.now();

  return NextResponse.json(
    {
      ok: true,
      blocks,
      muzikBlocks: blocks,
      musicBlocks: blocks,
      updatedAt,
      refreshVersion,
      source: "SCHEDULE_EDITOR_MUZIK_BLOCKS_GET_REFRESH_V1",
    },
    { headers: noStoreHeaders({ "X-Tha-Core-Muzik-Refresh-Version": String(refreshVersion) }) }
  );
}

export async function POST(req: NextRequest) {
  ensureDataDir();

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid JSON body" },
      { status: 400, headers: noStoreHeaders() }
    );
  }

  const payload = normalizeBlocksPayload(body);

  fs.writeFileSync(FILE, JSON.stringify(payload, null, 2), "utf8");
  writeRefreshSignal(payload);
  const smartzjScheduleSync = syncMuzikBlocksToSmartzjScheduleV1(payload);

  return NextResponse.json(
    {
      ok: true,
      saved: true,
      smartzjScheduleSync,
      blockCount: Array.isArray(payload.blocks) ? payload.blocks.length : 0,
      updatedAt: payload.updatedAt,
      refreshVersion: payload.refreshVersion,
      blocks: payload.blocks,
      muzikBlocks: payload.blocks,
      musicBlocks: payload.blocks,
      source: payload.source,
    },
    { headers: noStoreHeaders({ "X-Tha-Core-Muzik-Saved": "1", "X-Tha-Core-Muzik-Refresh-Version": String(payload.refreshVersion) }) }
  );
}
