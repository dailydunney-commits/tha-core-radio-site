import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = join(process.cwd(), ".data");
const HOLD_FILE = join(DATA_DIR, "smartzj-emergency-hold.json");
const CURRENT_BROADCAST_FILE = join(DATA_DIR, "current-broadcast.json");

type AnyRecord = Record<string, any>;

function readJson(filePath: string, fallback: AnyRecord) {
  try {
    if (!existsSync(filePath)) return fallback;
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, value: AnyRecord) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}

function keyOf(track: AnyRecord) {
  return cleanText(
    track.trackId ||
      track.id ||
      track.title ||
      track.audioUrl ||
      track.cleanAudioUrl ||
      track.processedAudioUrl ||
      ""
  );
}

export async function GET() {
  const hold = readJson(HOLD_FILE, { ok: true, blocked: [], updatedAt: "" });

  return NextResponse.json({
    ok: true,
    action: "SMARTZJ_EMERGENCY_HOLD_LIST",
    count: Array.isArray(hold.blocked) ? hold.blocked.length : 0,
    blocked: Array.isArray(hold.blocked) ? hold.blocked : [],
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const current = readJson(CURRENT_BROADCAST_FILE, {});
  const currentTrack = current.track || {};

  const track = {
    ...currentTrack,
    ...body.track,
    trackId: cleanText(body.trackId || body.id || currentTrack.trackId || currentTrack.id),
    title: cleanText(body.title || currentTrack.title || current.title),
    audioUrl: cleanText(body.audioUrl || currentTrack.audioUrl || current.audioUrl),
  };

  const key = keyOf(track);

  if (!key) {
    return NextResponse.json(
      {
        ok: false,
        action: "SMARTZJ_EMERGENCY_HOLD",
        status: "NO_TRACK_KEY",
        message: "No current SmartZJ track found to hold.",
      },
      { status: 400 }
    );
  }

  const hold = readJson(HOLD_FILE, { ok: true, blocked: [], updatedAt: "" });
  const blocked = Array.isArray(hold.blocked) ? hold.blocked : [];

  const filtered = blocked.filter((item: AnyRecord) => keyOf(item) !== key);

  const blockedItem = {
    key,
    trackId: cleanText(track.trackId || key),
    title: cleanText(track.title || key),
    audioUrl: cleanText(track.audioUrl),
    reason: cleanText(body.reason || "Reported explicit slip-through. Emergency hold until re-clean/bleep."),
    status: "BLOCKED_FALSE_CLEAN",
    needsBleep: true,
    held: true,
    rawAudioBlocked: true,
    createdAt: new Date().toISOString(),
  };

  filtered.unshift(blockedItem);

  writeJson(HOLD_FILE, {
    ok: true,
    policy: "Tracks reported as explicit slip-through are blocked from SmartZJ live rotation until re-cleaned/bleeped.",
    updatedAt: new Date().toISOString(),
    blocked: filtered.slice(0, 1000),
  });

  return NextResponse.json({
    ok: true,
    action: "SMARTZJ_EMERGENCY_HOLD",
    status: "BLOCKED_FALSE_CLEAN",
    message: "Track placed on emergency hold and should be skipped by SmartZJ clean-next.",
    blocked: blockedItem,
  });
}
