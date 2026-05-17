import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type GateTrack = {
  id?: string;
  title?: string;
  artist?: string;
  source?: string;
  mode?: string;
  reason?: string;
  path?: string;
  audioUrl?: string;
  url?: string;
  streamUrl?: string;
  rawUrl?: string;
  cleanAudioUrl?: string;
  bleepedAudioUrl?: string;
  processedAudioUrl?: string;
  radioSafeAudioUrl?: string;
  safeAudioUrl?: string;
};

function getAnyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }

  return "";
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\w\s./:-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildScanText(track: GateTrack, extraText?: string) {
  return normalize(
    [
      extraText,
      track.id,
      track.title,
      track.artist,
      track.source,
      track.mode,
      track.reason,
      track.path,
      track.audioUrl,
      track.url,
      track.streamUrl,
      track.rawUrl,
    ].join(" ")
  );
}

function getSafeAudioUrl(track: GateTrack): string {
  return getAnyString(
    track.processedAudioUrl,
    track.bleepedAudioUrl,
    track.cleanAudioUrl,
    track.radioSafeAudioUrl,
    track.safeAudioUrl
  );
}

function getRawAudioUrl(track: GateTrack): string {
  return getAnyString(track.rawUrl, track.audioUrl, track.url, track.streamUrl);
}

function looksDirty(track: GateTrack, extraText?: string): boolean {
  const text = buildScanText(track, extraText);

  return (
    text.includes("explicit") ||
    text.includes("dirty") ||
    text.includes("uncensored") ||
    text.includes("raw version") ||
    text.includes("parental advisory") ||
    text.includes("not clean")
  );
}

function looksClean(track: GateTrack, extraText?: string): boolean {
  const text = buildScanText(track, extraText);

  if (looksDirty(track, extraText)) return false;

  return (
    text.includes("clean") ||
    text.includes("radio edit") ||
    text.includes("radio safe") ||
    text.includes("radio-safe") ||
    text.includes("edited") ||
    text.includes("censored") ||
    text.includes("bleeped") ||
    text.includes("processed")
  );
}

function safeTrack(track: GateTrack, audioUrl: string, reason: string): GateTrack {
  return {
    ...track,
    reason,
    audioUrl,
    url: audioUrl,
    streamUrl: audioUrl,
    cleanAudioUrl: audioUrl,
    bleepedAudioUrl: audioUrl,
    processedAudioUrl: audioUrl,
    radioSafeAudioUrl: audioUrl,
    safeAudioUrl: audioUrl,
  };
}

function readyUrlFromJob(job: any): string {
  return getAnyString(
    job?.processedAudioUrl,
    job?.bleepedAudioUrl,
    job?.cleanAudioUrl,
    job?.radioSafeAudioUrl,
    job?.safeAudioUrl,
    job?.track?.processedAudioUrl,
    job?.track?.bleepedAudioUrl,
    job?.track?.cleanAudioUrl,
    job?.track?.radioSafeAudioUrl,
    job?.track?.safeAudioUrl,
    job?.track?.audioUrl,
    job?.track?.url,
    job?.track?.streamUrl
  );
}

function sameTrack(track: GateTrack, job: any): boolean {
  const trackTitle = normalize(track.title);
  const trackArtist = normalize(track.artist);
  const jobTitle = normalize(job?.track?.title);
  const jobArtist = normalize(job?.track?.artist);

  const trackRaw = normalize(
    track.rawUrl || track.audioUrl || track.url || track.streamUrl || track.id
  );

  const jobRaw = normalize(
    job?.track?.rawUrl ||
      job?.track?.audioUrl ||
      job?.track?.url ||
      job?.track?.streamUrl ||
      job?.track?.id
  );

  if (trackRaw && jobRaw && (trackRaw.includes(jobRaw) || jobRaw.includes(trackRaw))) {
    return true;
  }

  if (trackTitle && jobTitle && trackTitle === jobTitle) {
    if (!trackArtist || !jobArtist) return true;
    return trackArtist === jobArtist;
  }

  return false;
}

async function findCompletedBleepJob(origin: string, track: GateTrack) {
  const response = await fetch(`${origin}/api/radio/bleep-job`, {
    method: "GET",
    cache: "no-store",
  }).catch(() => null);

  if (!response || !response.ok) return null;

  const data = await response.json().catch(() => null);
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

  return (
    jobs.find((job: any) => {
      const readyUrl = readyUrlFromJob(job);
      return readyUrl && sameTrack(track, job);
    }) ?? null
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      route: "/api/radio/global-audio-gate",
      message: "Tha Core Global Audio Gate online.",
      policy: {
        smartDj: "clean or processed/bleeped audio only",
        autoDj: "clean or processed/bleeped audio only",
        uploads: "must pass clean/bleep safety gate",
        requests: "must pass clean/bleep safety gate",
        promos: "must pass clean/bleep safety gate",
        jingles: "must pass clean/bleep safety gate",
        ads: "must pass clean/bleep safety gate",
        liveDj: "live bleep/dump only",
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const track = (body?.track ?? body ?? {}) as GateTrack;
    const source = getAnyString(body?.source, track.source, "CONTROL_PANEL");
    const mode = getAnyString(body?.mode, track.mode, "pre_broadcast");
    const text = getAnyString(body?.text);
    const origin = request.nextUrl.origin;

    const safeUrl = getSafeAudioUrl(track);

    if (safeUrl) {
      return NextResponse.json(
        {
          ok: true,
          safe: true,
          allowBroadcast: true,
          allowAutoDj: source.toUpperCase().includes("AUTODJ"),
          allowSmartDj: source.toUpperCase().includes("SMARTDJ"),
          decision: "ALLOW_PROCESSED_CLEAN_AUDIO",
          source,
          mode,
          audioUrl: safeUrl,
          track: safeTrack(
            track,
            safeUrl,
            "Global Audio Gate approved processed/clean/bleeped audio."
          ),
          message: "Global Audio Gate approved processed/clean/bleeped audio.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const readyJob = await findCompletedBleepJob(origin, track);

    if (readyJob) {
      const readyUrl = readyUrlFromJob(readyJob);

      return NextResponse.json(
        {
          ok: true,
          safe: true,
          allowBroadcast: true,
          allowAutoDj: source.toUpperCase().includes("AUTODJ"),
          allowSmartDj: source.toUpperCase().includes("SMARTDJ"),
          decision: "ALLOW_COMPLETED_BLEEP_JOB",
          source,
          mode,
          audioUrl: readyUrl,
          job: readyJob,
          track: safeTrack(
            track,
            readyUrl,
            "Global Audio Gate linked completed clean/bleeped job audio."
          ),
          message: "Global Audio Gate approved completed clean/bleeped job audio.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (looksClean(track, text)) {
      const rawUrl = getRawAudioUrl(track);

      return NextResponse.json(
        {
          ok: true,
          safe: Boolean(rawUrl),
          allowBroadcast: Boolean(rawUrl),
          allowAutoDj: Boolean(rawUrl) && source.toUpperCase().includes("AUTODJ"),
          allowSmartDj: Boolean(rawUrl) && source.toUpperCase().includes("SMARTDJ"),
          decision: rawUrl ? "ALLOW_CLEAN_METADATA_AUDIO" : "HOLD_CLEAN_METADATA_NO_AUDIO",
          source,
          mode,
          audioUrl: rawUrl,
          track: rawUrl
            ? safeTrack(track, rawUrl, "Global Audio Gate approved clean/radio-safe metadata.")
            : track,
          message: rawUrl
            ? "Global Audio Gate approved clean/radio-safe metadata."
            : "Clean metadata found, but no playable audio URL was supplied.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const bleepCheck = await fetch(`${origin}/api/radio/bleep-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        source,
        mode,
        requireClean: true,
        track,
        text: text || buildScanText(track),
      }),
    }).catch(() => null);

    const gate = bleepCheck ? await bleepCheck.json().catch(() => null) : null;

    return NextResponse.json(
      {
        ok: true,
        safe: false,
        allowBroadcast: false,
        allowAutoDj: false,
        allowSmartDj: false,
        decision: looksDirty(track, text) ? "HOLD_DIRTY_AUDIO" : "HOLD_UNVERIFIED_AUDIO",
        source,
        mode,
        track: {
          ...track,
          audioUrl: "",
          url: "",
          streamUrl: "",
        },
        gate,
        needsBleep: true,
        message:
          "Global Audio Gate blocked this audio until a clean version or processed bleeped copy is ready.",
        recommendation:
          "Do not send this audio to listeners. Find clean version or create bleeped copy first.",
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        safe: false,
        allowBroadcast: false,
        decision: "GLOBAL_AUDIO_GATE_ERROR",
        message:
          error instanceof Error ? error.message : "Global Audio Gate failed.",
      },
      { status: 500 }
    );
  }
}
