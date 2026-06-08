import { NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import { mkdir, readdir, readFile, writeFile } from "fs/promises";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PHASE = "AI_HOST_LONG_SHOW_SCRIPT_FEEDER_V1_DRAFT_ONLY";

type ShowBlock = {
  blockNumber: number;
  startMinute: number;
  durationMinutes: number;
  segmentType: string;
  title: string;
  hosts: string[];
  purpose: string;
  scriptDirection: string;
  musicInstruction?: string;
  newsInstruction?: string;
  returnRule?: string;
};

type ShowDraft = {
  showId: string;
  showName: string;
  slot: string;
  lengthMinutes: number;
  hosts: string[];
  format: string;
  newsCutInRule: string;
  musicCutInRule: string;
  smartZjRule: string;
  blocks: ShowBlock[];
};

type LongShowPackage = {
  ok?: boolean;
  packageId?: string;
  createdAt?: string;
  shows?: ShowDraft[];
};

type HostTurn = {
  turnNumber: number;
  host: string;
  script: string;
  delivery: string;
  estimatedSeconds: number;
};

type ExpandedSegment = {
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
  musicInstruction?: string;
  newsInstruction?: string;
  returnRule?: string;
  runtimePlaceholders: string[];
  productionNotes: string[];
  safety: {
    draftOnly: true;
    voiceStarted: false;
    broadcastStarted: false;
    doesNotTouchNiaNews: true;
    doesNotTouchCurrentBroadcast: true;
    doesNotTouchSmartZJ: true;
  };
};

const MUSIC_TYPES = new Set([
  "smartzj-music-break",
  "music-intro",
  "music-return-link",
]);

const NEWS_TYPES = new Set([
  "news-teaser",
  "news-commentary",
]);

function safety() {
  return {
    draftOnly: true as const,
    voiceStarted: false as const,
    broadcastStarted: false as const,
    doesNotTouchNiaNews: true as const,
    doesNotTouchCurrentBroadcast: true as const,
    doesNotTouchSmartZJ: true as const,
  };
}

function cleanText(value: unknown): string {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueHosts(hosts: string[], fallback: string[] = ["Prodigy", "Diamond"]): string[] {
  const cleaned = hosts
    .concat(fallback)
    .map((h) => cleanText(h))
    .filter(Boolean);

  return Array.from(new Set(cleaned));
}

function voiceHostsFor(block: ShowBlock, show: ShowDraft): string[] {
  const blockHosts = uniqueHosts(block.hosts || [], show.hosts || []);
  const withoutSmartZj = blockHosts.filter((h) => h !== "SmartZJ");

  if (withoutSmartZj.length > 0) return withoutSmartZj;
  return ["Prodigy", "Diamond"];
}

function estimateVoiceMinutes(block: ShowBlock): number {
  if (MUSIC_TYPES.has(block.segmentType)) return Math.min(2, Math.max(1, block.durationMinutes * 0.15));
  if (block.segmentType === "opening") return Math.min(5, Math.max(3, block.durationMinutes * 0.5));
  if (block.segmentType === "recap-close") return Math.min(6, Math.max(3, block.durationMinutes * 0.35));
  if (NEWS_TYPES.has(block.segmentType)) return Math.min(4, Math.max(1.5, block.durationMinutes * 0.35));
  return Math.min(6, Math.max(3, block.durationMinutes * 0.4));
}

function placeholderList(block: ShowBlock): string[] {
  const placeholders: string[] = [];

  if (NEWS_TYPES.has(block.segmentType)) {
    placeholders.push("[INSERT FRESH LOCAL NEWS HEADLINE AT RUNTIME]");
    placeholders.push("[INSERT FRESH REGIONAL/WORLD NEWS HEADLINE AT RUNTIME]");
    placeholders.push("[INSERT FRESH SPORTS OR ENTERTAINMENT HEADLINE AT RUNTIME]");
  }

  if (block.segmentType.includes("sports")) {
    placeholders.push("[INSERT FRESH SPORTS SCORE/STORY AT RUNTIME]");
  }

  if (block.segmentType.includes("entertainment")) {
    placeholders.push("[INSERT FRESH ENTERTAINMENT ITEM AT RUNTIME]");
  }

  if (block.segmentType.includes("artist") || MUSIC_TYPES.has(block.segmentType)) {
    placeholders.push("[INSERT CURRENT / PREVIOUS / UPCOMING SMARTZJ TRACK METADATA AT RUNTIME]");
  }

  if (block.segmentType.includes("listener")) {
    placeholders.push("[INSERT APPROVED LISTENER QUESTION / SHOUTOUT AT RUNTIME]");
  }

  return placeholders;
}

function productionNotes(block: ShowBlock): string[] {
  const notes = [
    "Draft script only. Do not voice or broadcast from this route.",
    "Keep all speech clean, broadcast-safe, and respectful.",
  ];

  if (MUSIC_TYPES.has(block.segmentType)) {
    notes.push("SmartZJ controls clean music rotation. Host voice should only introduce, bridge, or return from music.");
    notes.push("No raw Azura fallback. Music must remain clean/bleeped READY only.");
  }

  if (NEWS_TYPES.has(block.segmentType)) {
    notes.push("Nia news remains protected. Insert verified fresh news at runtime only.");
    notes.push("Hosts may comment after news, but must not replace official Nia news blocks.");
  }

  return notes;
}

function lineFor(
  show: ShowDraft,
  block: ShowBlock,
  host: string,
  turnNumber: number
): string {
  const showName = show.showName;
  const title = block.title;
  const type = block.segmentType;

  if (type === "opening") {
    if (turnNumber === 1) {
      return `You are inside Tha Core, and this is ${showName}. We are opening this segment with ${title.toLowerCase()} — clean energy, clear mind, and real radio for the people.`;
    }
    if (host === "Diamond") {
      return `Yes family, stay close. We are keeping it warm, useful, and entertaining — not just talking to talk, but giving you something you can carry into the day.`;
    }
    return `The aim is simple: move with sense, protect your focus, respect the music, and keep the conversation connected to real life.`;
  }

  if (MUSIC_TYPES.has(type)) {
    if (turnNumber === 1) {
      return `Tha Core, do not move. SmartZJ is lining up a clean music break, and when we come back we continue ${title.toLowerCase()}.`;
    }
    if (turnNumber === 2) {
      return `[SMARTZJ CLEAN MUSIC BREAK: play clean/bleeped READY music from the active schedule lane. Do not use raw or unsafe audio.]`;
    }
    return `We are back inside ${showName}. That music gave the room some life — now let us connect it back to the conversation.`;
  }

  if (type === "news-teaser") {
    if (turnNumber === 1) {
      return `Quick heads-up: Nia will handle the full news update when that protected news window comes around. We are only giving you the road sign right now.`;
    }
    return `Watch for the key stories: local, regional, global, sports, entertainment, money, and community. When the verified headlines are ready, Nia takes that cleanly.`;
  }

  if (type === "news-commentary") {
    if (block.title.toLowerCase().includes("pause")) {
      return `[PROTECTED NIA NEWS CUT-IN PLACEHOLDER: pause this show, let Nia deliver the verified news update, then return to Prodigy and Diamond for brief commentary.]`;
    }
    if (turnNumber === 1) {
      return `Now that the news side is on the table, we are not here to panic people. We are here to help people understand what it means and how it touches everyday life.`;
    }
    return `The facts must come first, then the reasoning. Once the verified headline is inserted, we respond with balance, respect, and clean perspective.`;
  }

  if (type === "sports-commentary") {
    return `Sports always shows us something bigger than the scoreboard: discipline, preparation, pressure, teamwork, and how people respond when the lights are on.`;
  }

  if (type === "entertainment-commentary") {
    return `Entertainment is fun, but it also teaches us about image, pressure, choices, fame, money, and how quickly the public can lift somebody up or tear them down.`;
  }

  if (type === "artist-spotlight") {
    return `Respect to the artists — the living legends, the new voices, and the ones who passed on but still influence the sound. Music carries memory, culture, pain, joy, and lessons.`;
  }

  if (type === "money-business") {
    return `Money talk is not only about having money. It is about discipline, pricing your work, avoiding waste, building slowly, and turning skill into something that can feed your life.`;
  }

  if (type === "relationship-life") {
    return `Relationships need more than feelings. They need respect, timing, listening, apology, boundaries, and the maturity to not let pride destroy what patience could fix.`;
  }

  if (type === "listener-question") {
    return `A listener situation like this deserves a real answer. We are going to reason it out from both sides, because sometimes the truth is not loud — it is balanced.`;
  }

  if (type === "community-moment") {
    return `Community is not just where we live. It is how we treat the children, the elders, the workers, the dreamers, and the people trying to build something with limited resources.`;
  }

  if (type === "ai-future") {
    return `AI is not just a tech topic anymore. It touches work, creativity, business, music, relationships, learning, and how everyday people prepare for what is coming.`;
  }

  if (type === "joke-clean") {
    if (host === "Diamond") {
      return `Let me lighten the room for a second — because some people wake up with one eye open and still ready to argue with the toaster.`;
    }
    return `That is why we keep the laugh clean and the message useful. A smile can reset the room without dragging anybody down.`;
  }

  if (type === "local-regional-global") {
    return `From Jamaica to the Caribbean, the diaspora, Africa, the UK, the US, and the wider world, the sound travels because people carry culture wherever they go.`;
  }

  if (type === "recap-close") {
    if (turnNumber === 1) {
      return `Before we close this block, let us pull the pieces together: the music, the reasoning, the life lesson, and the message for the people locked in with Tha Core.`;
    }
    return `Stay with Tha Core. Clean vibes, clean energy, real conversation, and SmartZJ keeping the music safe in the rotation.`;
  }

  return `This segment is ${title}. The direction is clear: ${cleanText(block.scriptDirection)} Keep it natural, clean, useful, and ready for radio.`;
}

function buildTurns(show: ShowDraft, block: ShowBlock): HostTurn[] {
  const voiceHosts = voiceHostsFor(block, show);
  const turns: HostTurn[] = [];

  let count = 4;
  if (MUSIC_TYPES.has(block.segmentType)) count = 3;
  if (block.segmentType === "opening") count = 4;
  if (block.segmentType === "recap-close") count = 4;
  if (block.segmentType === "news-commentary" && block.title.toLowerCase().includes("pause")) count = 1;
  if (["topic-talk", "money-business", "relationship-life", "ai-future", "community-moment"].includes(block.segmentType)) count = 6;

  for (let i = 0; i < count; i += 1) {
    const turnNumber = i + 1;
    const host =
      MUSIC_TYPES.has(block.segmentType) && turnNumber === 2
        ? "SmartZJ"
        : voiceHosts[i % voiceHosts.length];

    turns.push({
      turnNumber,
      host,
      script: lineFor(show, block, host, turnNumber),
      delivery:
        host === "SmartZJ"
          ? "system/music-instruction"
          : block.segmentType === "opening"
            ? "warm, clear, confident"
            : block.segmentType === "joke-clean"
              ? "light, playful, clean"
              : block.segmentType.includes("night")
                ? "calm, late-night, intimate"
                : "natural radio conversation",
      estimatedSeconds: host === "SmartZJ" ? 0 : 25,
    });
  }

  return turns;
}

function expandSegment(show: ShowDraft, block: ShowBlock): ExpandedSegment {
  const voiceMinutes = Number(estimateVoiceMinutes(block).toFixed(1));
  const musicMinutes = MUSIC_TYPES.has(block.segmentType)
    ? Number(Math.max(0, block.durationMinutes - voiceMinutes).toFixed(1))
    : 0;

  return {
    segmentId: `${show.showId}-block-${String(block.blockNumber).padStart(3, "0")}`,
    blockNumber: block.blockNumber,
    startMinute: block.startMinute,
    durationMinutes: block.durationMinutes,
    segmentType: block.segmentType,
    title: block.title,
    purpose: block.purpose,
    estimatedVoiceMinutes: voiceMinutes,
    estimatedMusicMinutes: musicMinutes,
    hosts: uniqueHosts(block.hosts || [], show.hosts || []),
    hostTurns: buildTurns(show, block),
    musicInstruction: block.musicInstruction,
    newsInstruction: block.newsInstruction,
    returnRule: block.returnRule,
    runtimePlaceholders: placeholderList(block),
    productionNotes: productionNotes(block),
    safety: safety(),
  };
}

async function loadLatestPackage(): Promise<{ fileName: string; data: LongShowPackage } | null> {
  const dir = path.join(process.cwd(), ".data", "ai-host-long-show-packages");

  try {
    const files = (await readdir(dir))
      .filter((file) => file.endsWith(".json"))
      .sort();

    const latest = files[files.length - 1];
    if (!latest) return null;

    const raw = await readFile(path.join(dir, latest), "utf8");
    return {
      fileName: latest,
      data: JSON.parse(raw) as LongShowPackage,
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const source = await loadLatestPackage();

  if (!source || !Array.isArray(source.data.shows) || source.data.shows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        phase: PHASE,
        error: "NO_LONG_SHOW_PACKAGE_FOUND",
        instruction:
          "Run /api/radio/ai-host-long-show-package-feeder first to create the 3-show package draft.",
        draftOnly: true,
        voiceStarted: false,
        broadcastStarted: false,
        doesNotTouchNiaNews: true,
        doesNotTouchCurrentBroadcast: true,
        doesNotTouchSmartZJ: true,
      },
      { status: 404 }
    );
  }

  const scriptPackageId = `long-show-script-${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto
    .randomBytes(4)
    .toString("hex")}`;

  const shows = source.data.shows.map((show) => {
    const segments = (show.blocks || []).map((block) => expandSegment(show, block));
    const plannedMinutes = segments.reduce((sum, segment) => sum + segment.durationMinutes, 0);
    const estimatedVoiceMinutes = Number(
      segments.reduce((sum, segment) => sum + segment.estimatedVoiceMinutes, 0).toFixed(1)
    );
    const estimatedMusicMinutes = Number(
      segments.reduce((sum, segment) => sum + segment.estimatedMusicMinutes, 0).toFixed(1)
    );

    return {
      showId: show.showId,
      showName: show.showName,
      slot: show.slot,
      targetMinutes: show.lengthMinutes,
      plannedMinutes,
      estimatedVoiceMinutes,
      estimatedMusicMinutes,
      segmentCount: segments.length,
      format: show.format,
      newsCutInRule: show.newsCutInRule,
      musicCutInRule: show.musicCutInRule,
      smartZjRule: show.smartZjRule,
      safety: safety(),
      segments,
    };
  });

  const validation = shows.map((show) => ({
    showId: show.showId,
    showName: show.showName,
    targetMinutes: show.targetMinutes,
    plannedMinutes: show.plannedMinutes,
    meetsTarget: show.targetMinutes === show.plannedMinutes,
    segmentCount: show.segmentCount,
    estimatedVoiceMinutes: show.estimatedVoiceMinutes,
    estimatedMusicMinutes: show.estimatedMusicMinutes,
  }));

  const payload = {
    ok: true,
    phase: PHASE,
    scriptPackageId,
    sourcePackageId: source.data.packageId || null,
    sourcePackageFile: source.fileName,
    createdAt: new Date().toISOString(),
    approvalStatus: "SCRIPT_DRAFT_NEEDS_OWNER_APPROVAL",
    draftOnly: true,
    voiceStarted: false,
    broadcastStarted: false,
    doesNotTouchNiaNews: true,
    doesNotTouchCurrentBroadcast: true,
    doesNotTouchSmartZJ: true,
    generatorRules: {
      expandsShowBlocksIntoRadioSegments: true,
      createsHostTurns: true,
      musicBreaksRemainSmartZjInstructionsOnly: true,
      niaNewsRemainsProtected: true,
      freshNewsSportsEntertainmentInsertedAtRuntime: true,
      noVoiceGenerationInThisRoute: true,
      noBroadcastInThisRoute: true,
      cleanHumorOnly: true,
    },
    validation,
    shows,
  };

  const outDir = path.join(process.cwd(), ".data", "ai-host-long-show-scripts");
  await mkdir(outDir, { recursive: true });

  const fileName = `${scriptPackageId}.json`;
  const filePath = path.join(outDir, fileName);

  await writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");

  return NextResponse.json({
    ...payload,
    savedFile: fileName,
    savedPath: filePath,
  });
}

export async function POST() {
  return GET();
}
