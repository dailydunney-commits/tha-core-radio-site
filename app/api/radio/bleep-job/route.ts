import { NextRequest, NextResponse } from "next/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BleepJobTrack = {
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

type BleepJobStatus =
  | "BLEEP_JOB_CREATED"
  | "CLEAN_VERSION_SEARCHING"
  | "CLEAN_VERSION_FOUND"
  | "READY_FOR_BLEEP_PROCESSING"
  | "PROCESSED_AUDIO_READY";

type BleepJob = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  status: BleepJobStatus;
  source: string;
  track: BleepJobTrack;
  message: string;
  cleanResults?: unknown[];
  originalAttached?: boolean;
  processorStatus?: string;
  cleanAudioUrl?: string;
  bleepedAudioUrl?: string;
  processedAudioUrl?: string;
  radioSafeAudioUrl?: string;
  safeAudioUrl?: string;
};

const BLEEP_JOBS_DIR = join(process.cwd(), ".data");
const BLEEP_JOBS_FILE = join(BLEEP_JOBS_DIR, "bleep-jobs.json");

function readJobsFromFile(): BleepJob[] {
  try {
    if (!existsSync(BLEEP_JOBS_FILE)) return [];

    const parsed = JSON.parse(readFileSync(BLEEP_JOBS_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJobsToFile(jobs: BleepJob[]) {
  try {
    mkdirSync(BLEEP_JOBS_DIR, { recursive: true });
    writeFileSync(BLEEP_JOBS_FILE, JSON.stringify(jobs.slice(0, 50), null, 2), "utf8");
  } catch {
    // Keep API alive even if local file write fails.
  }
}

function getJobs() {
  if (!(globalThis as any).__THA_CORE_GLOBAL_BLEEP_JOBS__) {
    (globalThis as any).__THA_CORE_GLOBAL_BLEEP_JOBS__ = readJobsFromFile();
  }

  return (globalThis as any).__THA_CORE_GLOBAL_BLEEP_JOBS__;
}

function normalizeKey(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getJobKey(source: string, track: BleepJobTrack) {
  return [
    normalizeKey(source),
    normalizeKey(track.artist),
    normalizeKey(track.title),
  ].join("::");
}

function saveJobs(jobs: BleepJob[]) {
  (globalThis as any).__THA_CORE_GLOBAL_BLEEP_JOBS__ = jobs.slice(0, 50);
  writeJobsToFile((globalThis as any).__THA_CORE_GLOBAL_BLEEP_JOBS__);
  return (globalThis as any).__THA_CORE_GLOBAL_BLEEP_JOBS__;
}

// BLEEP_JOB_FILE_PERSISTENCE_V1

function pickBleepAudioUrl(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getProcessedAudioUrlFromBleepJob(value: any): string {
  return pickBleepAudioUrl(
    value?.processedAudioUrl,
    value?.bleepedAudioUrl,
    value?.cleanAudioUrl,
    value?.radioSafeAudioUrl,
    value?.safeAudioUrl,
    value?.audioUrl,
    value?.url,
    value?.streamUrl,
    value?.track?.processedAudioUrl,
    value?.track?.bleepedAudioUrl,
    value?.track?.cleanAudioUrl,
    value?.track?.radioSafeAudioUrl,
    value?.track?.safeAudioUrl,
    value?.track?.audioUrl,
    value?.track?.url,
    value?.track?.streamUrl
  );
}


// SMARTDJ_ORIGINAL_AUDIO_HOOK_V1
// Treat source/search audio as ORIGINAL audio for processing only.
// This does NOT mark the track clean. It only gives the processor something to clean/bleep.
function pickOriginalAudioUrlFromTrack(track: any): string {
  return pickBleepAudioUrl(
    track?.rawUrl,
    track?.sourceAudioUrl,
    track?.originalAudioUrl,
    track?.audioUrl,
    track?.url,
    track?.streamUrl
  );
}

function normalizeOriginalTrackForProcessing(track: BleepJobTrack): BleepJobTrack {
  const originalUrl = pickOriginalAudioUrlFromTrack(track);

  if (!originalUrl) return track;

  return {
    ...track,
    rawUrl: originalUrl,
    sourceAudioUrl: originalUrl,
    originalAudioUrl: originalUrl,
  } as BleepJobTrack;
}

function applyProcessedAudioToJob(job: BleepJob, payload: any): BleepJob {
  const processedUrl = getProcessedAudioUrlFromBleepJob(payload);

  if (!processedUrl) return job;

  return {
    ...job,
    updatedAt: new Date().toISOString(),
    status: "PROCESSED_AUDIO_READY",
    processorStatus: "PROCESSED_AUDIO_ATTACHED",
    processedAudioUrl: processedUrl,
    bleepedAudioUrl: processedUrl,
    cleanAudioUrl: processedUrl,
    radioSafeAudioUrl: processedUrl,
    safeAudioUrl: processedUrl,
    message:
      "PROCESSED AUDIO READY - clean/bleeped copy is ready for SmartDJ or AutoDJ playlist use.",
    track: {
      ...job.track,
      audioUrl: processedUrl,
      url: processedUrl,
      streamUrl: processedUrl,
      processedAudioUrl: processedUrl,
      bleepedAudioUrl: processedUrl,
      cleanAudioUrl: processedUrl,
      radioSafeAudioUrl: processedUrl,
      safeAudioUrl: processedUrl,
    },
  };
}

function bleepJobResponse(job: BleepJob, jobs: BleepJob[]) {
  const processedUrl = getProcessedAudioUrlFromBleepJob(job);

  return {
    ok: true,
    count: jobs.length,
    job,
    jobs,
    processedAudioUrl: processedUrl,
    bleepedAudioUrl: processedUrl,
    cleanAudioUrl: processedUrl,
    radioSafeAudioUrl: processedUrl,
    safeAudioUrl: processedUrl,
    ready: Boolean(processedUrl),
    message: processedUrl
      ? "Processed clean/bleeped audio is ready."
      : "Bleep job saved. Waiting for processed clean/bleeped audio.",
  };
}

export async function GET() {
  const jobs = getJobs();

  return NextResponse.json(
    {
      ok: true,
      count: jobs.length,
      jobs,
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
    const action = String(body?.action ?? "");

    if (action === "clear") {
      saveJobs([]);

      return NextResponse.json(
        {
          ok: true,
          count: 0,
          jobs: [],
          message: "Bleep jobs cleared.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (action === "remove") {
      const id = String(body?.id ?? "");
      const jobs = getJobs();
      const nextJobs = jobs.filter((job: BleepJob) => job.id !== id);

      saveJobs(nextJobs);

      return NextResponse.json(
        {
          ok: true,
          count: nextJobs.length,
          jobs: nextJobs,
          message: "Bleep job removed.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }


    if (action === "attach_track") {
      const id = String(body?.id ?? "");
      const track = body?.track ?? {};
      const jobs = getJobs();

      const nextJobs = jobs.map((job: any) =>
        job.id === id
          ? {
              ...job,
              updatedAt: new Date().toISOString(),
              status: "READY_FOR_BLEEP_PROCESSING",
              track,
              originalAttached: true,
              processorStatus: track?.rawUrl
                ? "ORIGINAL_AUDIO_ATTACHED"
                : "ORIGINAL_METADATA_ATTACHED_NO_AUDIO_URL",
              message: track?.rawUrl
                ? "ORIGINAL AUDIO ATTACHED - ready for bleep processor to create a clean/bleeped copy before broadcast."
                : "ORIGINAL TRACK ATTACHED - direct audio URL missing. API download hook needed next.",
            }
          : job
      );

      saveJobs(nextJobs);

      return NextResponse.json(
        {
          ok: true,
          count: nextJobs.length,
          jobs: nextJobs,
          message: "Original source attached to bleep job.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }
    if (action === "mark_processing") {
      const id = String(body?.id ?? "");
      const jobs = getJobs();

      const nextJobs = jobs.map((job: BleepJob) =>
        job.id === id
          ? {
              ...job,
              updatedAt: new Date().toISOString(),
              status: "READY_FOR_BLEEP_PROCESSING" as BleepJobStatus,
              message:
                "CREATE BLEEPED COPY REQUESTED - audio processor must create a clean/bleeped copy before broadcast.",
            }
          : job
      );

      saveJobs(nextJobs);

      return NextResponse.json(
        {
          ok: true,
          count: nextJobs.length,
          jobs: nextJobs,
          message: "Bleeped copy job marked for processing.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (
      action === "processed_ready" ||
      action === "attach_processed_audio" ||
      action === "bleeped_ready" ||
      action === "clean_audio_ready"
    ) {
      const id = String(body?.id ?? "");
      const jobs = getJobs();

      const nextJobs = jobs.map((job: BleepJob) =>
        job.id === id ? applyProcessedAudioToJob(job, body) : job
      );

      saveJobs(nextJobs);

      const updatedJob = nextJobs.find((job: BleepJob) => job.id === id) ?? null;

      return NextResponse.json(
        updatedJob
          ? bleepJobResponse(updatedJob, nextJobs)
          : {
              ok: false,
              count: nextJobs.length,
              jobs: nextJobs,
              ready: false,
              message: "Bleep job not found.",
            },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }
    if (action === "clean_found") {
      const id = String(body?.id ?? "");
      const cleanResults = Array.isArray(body?.cleanResults) ? body.cleanResults : [];
      const jobs = getJobs();

      const nextJobs = jobs.map((job: BleepJob) =>
        job.id === id
          ? {
              ...job,
              updatedAt: new Date().toISOString(),
              status: "CLEAN_VERSION_FOUND" as BleepJobStatus,
              cleanResults,
              message: `CLEAN VERSION FOUND - ${cleanResults.length} clean result(s) ready for review.`,
            }
          : job
      );

      saveJobs(nextJobs);

      return NextResponse.json(
        {
          ok: true,
          count: nextJobs.length,
          jobs: nextJobs,
          message: "Clean version attached to bleep job.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    if (action === "clean_not_found") {
      const id = String(body?.id ?? "");
      const jobs = getJobs();

      const nextJobs = jobs.map((job: BleepJob) =>
        job.id === id
          ? {
              ...job,
              updatedAt: new Date().toISOString(),
              status: "BLEEP_JOB_CREATED" as BleepJobStatus,
              message:
                "NO CLEAN VERSION FOUND YET - create a processed bleeped copy before broadcast.",
            }
          : job
      );

      saveJobs(nextJobs);

      return NextResponse.json(
        {
          ok: true,
          count: nextJobs.length,
          jobs: nextJobs,
          message: "No clean version found. Bleep job still waiting.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const track = normalizeOriginalTrackForProcessing((body?.track ?? {}) as BleepJobTrack);
    const source = String(body?.source ?? "CONTROL_PANEL");

    const jobs = getJobs();
    const nextKey = getJobKey(source, track);

    const existing = jobs.find((job: BleepJob) => getJobKey(job.source, job.track) === nextKey);

    if (existing) {
      return NextResponse.json(
        {
          ok: true,
          job: existing,
          duplicate: true,
          message:
            "BLEEP JOB ALREADY EXISTS - SmartDJ is still waiting for a clean version or processed bleeped copy before broadcast.",
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    const job: BleepJob = {
      id: `bleep-job-${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: "BLEEP_JOB_CREATED",
      source,
      track,
      message:
        "BLEEP JOB CREATED - SmartDJ must find a clean version or create a processed bleeped copy before broadcast.",
    };

    jobs.unshift(job);
    saveJobs(jobs);

    return NextResponse.json(
      {
        ok: true,
        job,
        duplicate: false,
        message: job.message,
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
        message:
          error instanceof Error
            ? error.message
            : "Could not update bleep job.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  saveJobs([]);

  return NextResponse.json(
    {
      ok: true,
      count: 0,
      jobs: [],
      message: "Bleep jobs cleared.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}




