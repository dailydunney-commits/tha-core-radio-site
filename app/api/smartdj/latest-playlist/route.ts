import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

type SmartDjState = {
  ok?: boolean;
  command?: string;
  intent?: string;
  target?: string;
  message?: string;
  reply?: string;
  statusText?: string;
  action?: string;
  targetPanel?: string;
  playlistTitle?: string;
  playlist?: unknown[];
  lastPlaylist?: unknown[];
  timestamp?: string;
  resultCount?: number;
  resultLabel?: string;
  lastResult?: SmartDjState;
};

function asTrackList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

async function readSmartDjState(): Promise<SmartDjState | null> {
  const statePath = path.join(process.cwd(), ".data", "smartdj-state.json");

  try {
    const raw = await fs.readFile(statePath, "utf8");
    return JSON.parse(raw) as SmartDjState;
  } catch {
    return null;
  }
}

export async function GET() {
  const state = await readSmartDjState();

  if (!state) {
    return NextResponse.json(
      {
        ok: true,
        route: "/api/smartdj/latest-playlist",
        reachable: true,
        command: "view playlist",
        message: "SmartDJ reachable. No saved playlist found yet.",
        reply: "SmartDJ reachable. No saved playlist found yet.",
        statusText: "No SmartDJ playlist created yet. Ask SmartDJ to build one.",
        action: "no_saved_playlist",
        targetPanel: "smartdj_queue",
        playlistTitle: "",
        playlist: [],
        lastPlaylist: [],
        timestamp: new Date().toISOString(),
        resultCount: 0,
        resultLabel: "No SmartDJ playlist yet.",
      },
      {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const lastResult = state.lastResult ?? {};

  const playlist =
    asTrackList(state.playlist).length > 0
      ? asTrackList(state.playlist)
      : asTrackList(lastResult.playlist).length > 0
        ? asTrackList(lastResult.playlist)
        : asTrackList(state.lastPlaylist).length > 0
          ? asTrackList(state.lastPlaylist)
          : asTrackList(lastResult.lastPlaylist);

  const rawAction = String(state.action ?? lastResult.action ?? "");
  const rawMessage = String(
    state.statusText ??
      state.message ??
      lastResult.statusText ??
      lastResult.message ??
      ""
  );

  const wasSentToBleep =
    rawAction.includes("bleep") || rawMessage.toLowerCase().includes("bleep");

  const statusText =
    playlist.length > 0
      ? `SmartDJ playlist loaded: ${playlist.length} track(s).`
      : wasSentToBleep
        ? "SmartDJ reachable. No clean playlist yet. Track was sent to bleep/clean queue."
        : "No SmartDJ playlist created yet. Ask SmartDJ to build one.";

  return NextResponse.json(
    {
      ok: true,
      route: "/api/smartdj/latest-playlist",
      reachable: true,
      command: state.command ?? lastResult.command ?? "view playlist",
      intent: state.intent ?? lastResult.intent ?? "",
      target: state.target ?? lastResult.target ?? "",
      message: state.message ?? lastResult.message ?? statusText,
      reply: state.reply ?? lastResult.reply ?? statusText,
      statusText,
      action: state.action ?? lastResult.action ?? "",
      targetPanel: state.targetPanel ?? lastResult.targetPanel ?? "smartdj_queue",
      playlistTitle: state.playlistTitle ?? lastResult.playlistTitle ?? "",
      playlist,
      lastPlaylist: playlist,
      timestamp: state.timestamp ?? lastResult.timestamp ?? new Date().toISOString(),
      resultCount: playlist.length,
      resultLabel:
        playlist.length > 0
          ? `SmartDJ playlist loaded (${playlist.length})`
          : wasSentToBleep
            ? "SmartDJ reachable - waiting on bleep/clean copy."
            : "No SmartDJ playlist yet.",
      lastResult: state.lastResult ?? null,
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
