import { NextRequest, NextResponse } from "next/server";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";
import crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PHASE = "AI_HOST_LONG_SHOW_VOICE_PACKAGE_V1_BATCH_BUILDER";

const DATA_DIR = join(process.cwd(), ".data");
const SCRIPT_DIR = join(DATA_DIR, "ai-host-long-show-scripts");
const LONG_SHOW_PROGRAM_DIR = join(DATA_DIR, "ai-host-long-show-programs");
const PUBLIC_AI_HOST_DIR = join(process.cwd(), "public", "audio", "ai-host");

const DEFAULT_TTS_MODEL = process.env.OPENAI_AI_HOST_TTS_MODEL || "gpt-4o-mini-tts";
const PRODIGY_VOICE = process.env.OPENAI_AI_HOST_PRODIGY_VOICE || "onyx";
const DIAMOND_VOICE = process.env.OPENAI_AI_HOST_DIAMOND_VOICE || "coral";

type HostTurn = {
  turnNumber: number;
  host: string;
  script: string;
  delivery: string;
  estimatedSeconds: number;
};

type Segment = {
  segmentId: string;
  blockNumber: number;
  startMinute: number;
  durationMinutes: number;
  segmentType: string;
  title: string;
  purpose: string;
  estimatedVoiceMinutes: number;
  estimatedMusicMinutes: number;
  hosts: string[];
  hostTurns: HostTurn[];
};

type ScriptShow = {
  showId: string;
  showName: string;
  slot: string;
  targetMinutes: number;
  plannedMinutes: number;
  segmentCount: number;
  segments: Segment[];
};

type ScriptPackage = {
  ok?: boolean;
  phase?: string;
  scriptPackageId?: string;
  sourcePackageId?: string;
  createdAt?: string;
  shows?: ScriptShow[];
};

type AudioPart = {
  partNumber: number;
  segmentId: string;
  segmentTitle: string;
  segmentType: string;
  speaker: string;
  voice: string;
  fileName: string;
  audioUrl: string;
  storageUrl: string;
  script: string;
  durationSeconds: number;
  actualSeconds: number | null;
  track: Record<string, unknown>;
};

type MusicBreak = {
  markerNumber: number;
  segmentId: string;
  segmentTitle: string;
  startMinute: number;
  durationMinutes: number;
  instruction: string;
  smartZjRequired: true;
};

type Manifest = {
  ok: true;
  phase: string;
  programId: string;
  showId: string;
  showName: string;
  slot: string;
  targetMinutes: number;
  plannedMinutes: number;
  sourceScriptPackageId: string | null;
  sourceScriptPackageFile: string;
  createdAt: string;
  updatedAt: string;
  buildComplete: boolean;
  nextSegmentIndex: number;
  totalSegments: number;
  audioParts: AudioPart[];
  musicBreaks: MusicBreak[];
  safety: ReturnType<typeof safety>;
};

function safety() {
  return {
    batchBuilderOnly: true as const,
    voiceStarted: true as const,
    broadcastStarted: false as const,
    doesNotTouchNiaNews: true as const,
    doesNotTouchCurrentBroadcast: true as const,
    doesNotTouchSmartZJ: true as const,
    routeDoesNotWriteCurrentBroadcast: true as const,
    routeDoesNotStartBroadcast: true as const,
  };
}

function safeSlug(value: string, fallback: string) {
  return (
    String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || fallback
  );
}

function cleanSpeechText(value: string) {
  return String(value || "")
    .replace(/\[SMARTZJ CLEAN MUSIC BREAK:[\s\S]*?\]/gi, "")
    .replace(/\[PROTECTED NIA NEWS CUT-IN PLACEHOLDER:[\s\S]*?\]/gi, "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isMusicSegment(segment: Segment) {
  return (
    segment.segmentType === "smartzj-music-break" ||
    segment.segmentType === "music-intro" ||
    segment.segmentType === "music-return-link"
  );
}

function speakerVoice(host: string) {
  const h = String(host || "").toLowerCase();
  if (h.includes("diamond")) return { speaker: "Diamond", voice: DIAMOND_VOICE };
  return { speaker: "Prodigy", voice: PRODIGY_VOICE };
}

function voiceInstructions(speaker: string) {
  if (speaker === "Diamond") {
    return [
      "Diamond from Tha Core.",
      "Sound smooth, stylish, confident, grown, witty, and polished.",
      "Do not sound like Nia.",
      "Do not sound cartoonish or overly bubbly.",
      "Keep the delivery natural for radio, with personality but not too loud.",
      "Keep the brand spoken naturally as Tha Core.",
    ].join(" ");
  }

  return [
    "Prodigy from Tha Core.",
    "Sound street-smart, confident, sharp, intelligent, witty, and controlled.",
    "Bring energy and presence without shouting.",
    "Keep it clean, mature, and natural for radio.",
    "Keep the brand spoken naturally as Tha Core.",
  ].join(" ");
}

async function generateSpeechMp3(input: {
  apiKey: string;
  text: string;
  voice: string;
  speaker: string;
}) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_TTS_MODEL,
      voice: input.voice,
      input: input.text,
      format: "mp3",
      instructions: voiceInstructions(input.speaker),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OPENAI_TTS_FAILED_${res.status}: ${detail.slice(0, 400)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}

function getMp3DurationSeconds(filePath: string) {
  try {
    const out = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", filePath],
      { encoding: "utf8" }
    ).trim();

    const seconds = Number(out);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  } catch {
    return null;
  }
}

function estimateSeconds(text: string) {
  const words = String(text || "").split(/\s+/).filter(Boolean).length;
  return Math.max(8, Math.round((words / 145) * 60));
}

async function loadLatestScriptPackage(): Promise<{ fileName: string; data: ScriptPackage } | null> {
  await mkdir(SCRIPT_DIR, { recursive: true });

  const files = (await readdir(SCRIPT_DIR))
    .filter((file) => file.endsWith(".json"))
    .sort();

  const latest = files[files.length - 1];
  if (!latest) return null;

  const raw = await readFile(join(SCRIPT_DIR, latest), "utf8");
  return { fileName: latest, data: JSON.parse(raw) as ScriptPackage };
}

async function loadManifest(programId: string): Promise<Manifest | null> {
  const filePath = join(LONG_SHOW_PROGRAM_DIR, `${programId}.json`);
  if (!existsSync(filePath)) return null;

  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as Manifest;
}

async function saveManifest(manifest: Manifest) {
  await mkdir(LONG_SHOW_PROGRAM_DIR, { recursive: true });
  await writeFile(
    join(LONG_SHOW_PROGRAM_DIR, `${manifest.programId}.json`),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
}

function createManifest(input: {
  show: ScriptShow;
  scriptPackage: ScriptPackage;
  scriptFile: string;
}) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const programId = `long-show-${safeSlug(input.show.showId, "show")}-${stamp}-${crypto
    .randomUUID()
    .slice(0, 8)}`;

  const manifest: Manifest = {
    ok: true,
    phase: PHASE,
    programId,
    showId: input.show.showId,
    showName: input.show.showName,
    slot: input.show.slot,
    targetMinutes: input.show.targetMinutes,
    plannedMinutes: input.show.plannedMinutes,
    sourceScriptPackageId: input.scriptPackage.scriptPackageId || null,
    sourceScriptPackageFile: input.scriptFile,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    buildComplete: false,
    nextSegmentIndex: 0,
    totalSegments: input.show.segments.length,
    audioParts: [],
    musicBreaks: [],
    safety: safety(),
  };

  return manifest;
}

function findShow(pkg: ScriptPackage, showId: string): ScriptShow | null {
  return (pkg.shows || []).find((show) => show.showId === showId) || null;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    phase: PHASE,
    route: "/api/radio/ai-host-long-show-voice-package",
    purpose: "Builds full 3.5-hour long-show voice packages in safe batches.",
    usage: {
      method: "POST",
      body: {
        showId: "night-talk-show",
        maxSegments: 2,
        programId: "optional-existing-program-id-to-continue",
      },
    },
    safety: safety(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, phase: PHASE, error: "OPENAI_API_KEY_MISSING" },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const showId = String(body.showId || "night-talk-show");
    const maxSegments = Math.max(1, Math.min(4, Number(body.maxSegments || 2)));
    const continueProgramId = body.programId ? String(body.programId) : "";

    const source = await loadLatestScriptPackage();

    if (!source || !Array.isArray(source.data.shows)) {
      return NextResponse.json(
        {
          ok: false,
          phase: PHASE,
          error: "NO_LONG_SHOW_SCRIPT_PACKAGE_FOUND",
          instruction: "Run /api/radio/ai-host-long-show-script-feeder first.",
        },
        { status: 404 }
      );
    }

    const show = findShow(source.data, showId);

    if (!show) {
      return NextResponse.json(
        {
          ok: false,
          phase: PHASE,
          error: "SHOW_NOT_FOUND",
          requestedShowId: showId,
          availableShows: (source.data.shows || []).map((s) => ({
            showId: s.showId,
            showName: s.showName,
          })),
        },
        { status: 404 }
      );
    }

    await mkdir(PUBLIC_AI_HOST_DIR, { recursive: true });
    await mkdir(LONG_SHOW_PROGRAM_DIR, { recursive: true });

    let manifest =
      continueProgramId ? await loadManifest(continueProgramId) : null;

    if (!manifest) {
      manifest = createManifest({
        show,
        scriptPackage: source.data,
        scriptFile: source.fileName,
      });
    }

    const startIndex = manifest.nextSegmentIndex;
    const endIndex = Math.min(show.segments.length, startIndex + maxSegments);
    const processedSegments: Array<Record<string, unknown>> = [];

    for (let index = startIndex; index < endIndex; index += 1) {
      const segment = show.segments[index];

      if (isMusicSegment(segment)) {
        const markerNumber = manifest.musicBreaks.length + 1;

        manifest.musicBreaks.push({
          markerNumber,
          segmentId: segment.segmentId,
          segmentTitle: segment.title,
          startMinute: segment.startMinute,
          durationMinutes: Math.max(1, segment.durationMinutes),
          instruction:
            "SmartZJ must run clean/bleeped READY music for this timed music break. Raw Azura remains blocked.",
          smartZjRequired: true,
        });

        processedSegments.push({
          segmentId: segment.segmentId,
          title: segment.title,
          type: segment.segmentType,
          action: "MUSIC_BREAK_MARKER_ADDED",
          durationMinutes: segment.durationMinutes,
        });

        manifest.nextSegmentIndex = index + 1;
        continue;
      }

      const turns = Array.isArray(segment.hostTurns) ? segment.hostTurns : [];

      for (const turn of turns) {
        if (String(turn.host || "").toLowerCase() === "smartzj") continue;

        const text = cleanSpeechText(turn.script);
        if (!text) continue;

        const { speaker, voice } = speakerVoice(turn.host);
        const partNumber = manifest.audioParts.length + 1;
        const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
        const fileName = `long-show-${safeSlug(show.showId, "show")}-part-${String(
          partNumber
        ).padStart(4, "0")}-${stamp}-${crypto.randomUUID().slice(0, 8)}.mp3`;

        const filePath = join(PUBLIC_AI_HOST_DIR, fileName);
        const mp3 = await generateSpeechMp3({ apiKey, text, voice, speaker });

        await writeFile(filePath, mp3);

        const actualSeconds = getMp3DurationSeconds(filePath);
        const seconds = actualSeconds || estimateSeconds(text);
        const audioUrl = `/api/listener/ai-host-audio?file=${encodeURIComponent(fileName)}`;

        manifest.audioParts.push({
          partNumber,
          segmentId: segment.segmentId,
          segmentTitle: segment.title,
          segmentType: segment.segmentType,
          speaker,
          voice,
          fileName,
          audioUrl,
          storageUrl: `/audio/ai-host/${fileName}`,
          script: text,
          durationSeconds: seconds,
          actualSeconds,
          track: {
            id: `AI-Host-LongShow/${manifest.programId}/part-${partNumber}`,
            trackId: `AI-Host-LongShow/${manifest.programId}/part-${partNumber}`,
            title: `${show.showName} Part ${partNumber}`,
            artist: `${speaker} from Tha Core`,
            source: "AI_HOST_LONG_SHOW",
            lane: "AI-Host",
            folder: "AI-Host-Long-Show",
            audioUrl,
            streamUrl: audioUrl,
            listen_url: audioUrl,
            cleanAudioUrl: audioUrl,
            returnedToSmartDj: true,
            held: false,
            bleepJobStatus: "PROCESSED_AUDIO_READY",
            aiHost: true,
            aiGeneratedVoice: true,
            longShowProgram: true,
            programId: manifest.programId,
            programName: show.showName,
            programSlot: show.slot,
            segmentId: segment.segmentId,
            segmentTitle: segment.title,
          },
        });
      }

      processedSegments.push({
        segmentId: segment.segmentId,
        title: segment.title,
        type: segment.segmentType,
        action: "VOICE_PARTS_GENERATED",
        hostTurnCount: turns.length,
      });

      manifest.nextSegmentIndex = index + 1;
    }

    manifest.updatedAt = new Date().toISOString();

    let totalAudioSeconds = manifest.audioParts.reduce(
      (sum, part) => sum + Number(part.durationSeconds || 0),
      0
    );

    let totalMusicMinutes = manifest.musicBreaks.reduce(
      (sum, marker) => sum + Number(marker.durationMinutes || 0),
      0
    );

    let estimatedPackageMinutes =
      Math.round(((totalAudioSeconds / 60) + totalMusicMinutes) * 10) / 10;

    const targetRuntimeMinutes = Number(manifest.targetMinutes || show.targetMinutes || 210);
    const fillMarkerExists = manifest.musicBreaks.some((marker) =>
      String(marker.segmentId || "").startsWith("smartzj-long-show-fill-")
    );

    if (
      manifest.nextSegmentIndex >= show.segments.length &&
      estimatedPackageMinutes < targetRuntimeMinutes &&
      !fillMarkerExists
    ) {
      const missingMinutes =
        Math.round((targetRuntimeMinutes - estimatedPackageMinutes) * 10) / 10;

      manifest.musicBreaks.push({
        markerNumber: manifest.musicBreaks.length + 1,
        segmentId: `smartzj-long-show-fill-${manifest.programId}`,
        segmentTitle: "SmartZJ Long Show Fill Rotation",
        startMinute: Math.round(estimatedPackageMinutes),
        durationMinutes: missingMinutes,
        instruction:
          "SmartZJ must run clean/bleeped READY music to fill the remaining long-show runtime. Host package remains complete; raw Azura remains blocked.",
        smartZjRequired: true,
      });
    }

    totalAudioSeconds = manifest.audioParts.reduce(
      (sum, part) => sum + Number(part.durationSeconds || 0),
      0
    );

    totalMusicMinutes = manifest.musicBreaks.reduce(
      (sum, marker) => sum + Number(marker.durationMinutes || 0),
      0
    );

    estimatedPackageMinutes =
      Math.round(((totalAudioSeconds / 60) + totalMusicMinutes) * 10) / 10;

    manifest.buildComplete =
      manifest.nextSegmentIndex >= show.segments.length &&
      estimatedPackageMinutes >= targetRuntimeMinutes;

    manifest.safety = safety();

    await saveManifest(manifest);

    return NextResponse.json({
      ok: true,
      phase: PHASE,
      programId: manifest.programId,
      showId: manifest.showId,
      showName: manifest.showName,
      slot: manifest.slot,
      sourceScriptPackageFile: manifest.sourceScriptPackageFile,
      processedSegments,
      nextSegmentIndex: manifest.nextSegmentIndex,
      totalSegments: manifest.totalSegments,
      buildComplete: manifest.buildComplete,
      audioPartCount: manifest.audioParts.length,
      musicBreakCount: manifest.musicBreaks.length,
      totalAudioSeconds,
      totalAudioMinutes: Math.round((totalAudioSeconds / 60) * 10) / 10,
      totalMusicMinutes,
      targetRuntimeMinutes,
      estimatedPackageMinutes,
      missingRuntimeMinutes:
        Math.max(0, Math.round((targetRuntimeMinutes - estimatedPackageMinutes) * 10) / 10),
      savedManifest: join(LONG_SHOW_PROGRAM_DIR, `${manifest.programId}.json`),
      latestAudioParts: manifest.audioParts.slice(-8),
      safety: safety(),
      nextStep: manifest.buildComplete
        ? "Full long-show package manifest is built. Next step is the long-show live runner."
        : "Run this route again with the same programId to continue the next batch.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        phase: PHASE,
        error: "LONG_SHOW_VOICE_PACKAGE_ERROR",
        message: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
