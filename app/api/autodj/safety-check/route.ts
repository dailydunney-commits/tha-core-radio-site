import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AutoDjTrack = {
  id?: string;
  title?: string;
  artist?: string;
  source?: string;
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

function buildTrackText(track: AutoDjTrack) {
  return normalize(
    [
      track.id,
      track.title,
      track.artist,
      track.source,
      track.reason,
      track.path,
      track.audioUrl,
      track.url,
      track.streamUrl,
      track.rawUrl,
    ].join(" ")
  );
}

function getSafeAudioUrl(track: AutoDjTrack): string {
  return getAnyString(
    track.processedAudioUrl,
    track.bleepedAudioUrl,
    track.cleanAudioUrl,
    track.radioSafeAudioUrl,
    track.safeAudioUrl
  );
}

function getPlayableUrl(track: AutoDjTrack): string {
  return getAnyString(
    track.processedAudioUrl,
    track.bleepedAudioUrl,
    track.cleanAudioUrl,
    track.radioSafeAudioUrl,
    track.safeAudioUrl,
    track.audioUrl,
    track.url,
    track.streamUrl
  );
}

function looksDirty(track: AutoDjTrack): boolean {
  const text = buildTrackText(track);

  return (
    text.includes("explicit") ||
    text.includes("dirty") ||
    text.includes("uncensored") ||
    text.includes("raw version") ||
    text.includes("parental advisory")
  );
}

function looksClean(track: AutoDjTrack): boolean {
  const text = buildTrackText(track);

  if (looksDirty(track)) return false;

  return (
    text.includes("clean") ||
    text.includes("radio edit") ||
    text.includes("radio safe") ||
    text.includes("radio-safe") ||
    text.includes("edited") ||
    text.includes("censored")
  );
}

function safeTrack(track: AutoDjTrack, audioUrl: string, reason: string): AutoDjTrack {
  return {
    ...track,
    source: track.source || "AutoDJ safety gate",
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

function getReadyUrlFromJob(job: any): string {
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

function sameTrack(track: AutoDjTrack, job: any): boolean {
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

async function findReadyBleepJob(origin: string, track: AutoDjTrack) {
  const response = await fetch(`${origin}/api/radio/bleep-job`, {
    method: "GET",
    cache: "no-store",
  }).catch(() => null);

  if (!response || !response.ok) return null;

  const data = await response.json().catch(() => null);
  const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

  return (
    jobs.find((job: any) => {
      const readyUrl = getReadyUrlFromJob(job);
      return readyUrl && sameTrack(track, job);
    }) ?? null
  );
}

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      route: "/api/autodj/safety-check",
      message: "AutoDJ safety gate online.",
      rules: [
        "AutoDJ may play clean/radio-safe tracks.",
        "AutoDJ may play processed/bleeped tracks.",
        "AutoDJ must hold or skip dirty/raw tracks until clean/bleeped audio is ready.",
        "LiveDJ remains live bleep/dump only.",
      ],
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
    const track = (body?.track ?? body ?? {}) as AutoDjTrack;
    const origin = request.nextUrl.origin;

    const safeUrl = getSafeAudioUrl(track);

    if (safeUrl) {
      const nextTrack = safeTrack(
        track,
        safeUrl,
        "AutoDJ safety gate approved processed/clean/bleeped audio."
      );

      return NextResponse.json(
        {
          ok: true,
          safe: true,
          allowAutoDj: true,
          decision: "ALLOW_PROCESSED_AUDIO",
          track: nextTrack,
          audioUrl: safeUrl,
          message: "AutoDJ approved clean/bleeped processed audio.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (looksClean(track)) {
      const playable = getPlayableUrl(track);

      return NextResponse.json(
        {
          ok: true,
          safe: Boolean(playable),
          allowAutoDj: Boolean(playable),
          decision: playable ? "ALLOW_CLEAN_TRACK" : "HOLD_NO_AUDIO_URL",
          track: playable
            ? safeTrack(track, playable, "AutoDJ approved clean/radio-safe track.")
            : track,
          audioUrl: playable,
          message: playable
            ? "AutoDJ approved clean/radio-safe track."
            : "AutoDJ found clean metadata, but no playable audio URL.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const readyJob = await findReadyBleepJob(origin, track);

    if (readyJob) {
      const readyUrl = getReadyUrlFromJob(readyJob);
      const nextTrack = safeTrack(
        track,
        readyUrl,
        "AutoDJ found completed bleep job and linked clean/bleeped audio."
      );

      return NextResponse.json(
        {
          ok: true,
          safe: true,
          allowAutoDj: true,
          decision: "ALLOW_READY_BLEEP_JOB",
          job: readyJob,
          track: nextTrack,
          audioUrl: readyUrl,
          message: "AutoDJ approved completed clean/bleeped job audio.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const gateResponse = await fetch(`${origin}/api/radio/bleep-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        source: "AUTODJ",
        mode: "pre_broadcast",
        requireClean: true,
        track,
        text: buildTrackText(track),
      }),
    }).catch(() => null);

    const gateData = gateResponse
      ? await gateResponse.json().catch(() => null)
      : null;

    const jobReadyUrl = getReadyUrlFromJob(gateData?.job);

    if (jobReadyUrl) {
      const nextTrack = safeTrack(
        track,
        jobReadyUrl,
        "AutoDJ received clean/bleeped audio from global bleep gate."
      );

      return NextResponse.json(
        {
          ok: true,
          safe: true,
          allowAutoDj: true,
          decision: "ALLOW_GATE_PROCESSED_AUDIO",
          gate: gateData,
          track: nextTrack,
          audioUrl: jobReadyUrl,
          message: "AutoDJ approved clean/bleeped audio from bleep gate.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        safe: false,
        allowAutoDj: false,
        decision: looksDirty(track) ? "HOLD_DIRTY_TRACK" : "HOLD_UNVERIFIED_TRACK",
        track: {
          ...track,
          audioUrl: "",
          url: "",
          streamUrl: "",
        },
        gate: gateData,
        needsBleep: true,
        message:
          "AutoDJ blocked this track from rotation until a clean version or bleeped copy is ready.",
        recommendation:
          "Skip this AutoDJ track for now or wait for the bleep job to produce processed audio.",
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
        allowAutoDj: false,
        decision: "AUTODJ_SAFETY_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "AutoDJ safety check failed.",
      },
      { status: 500 }
    );
  }
}
