import fs from "fs";
import path from "path";
import { spawn } from "child_process";

type AnyRecord = Record<string, any>;

export type BleepCue = {
  start: number;
  end: number;
  word?: string;
  reason?: string;
};

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, ".data");
const JOBS_FILE = path.join(DATA_DIR, "bleep-jobs.json");
const SMARTDJ_STATE_FILE = path.join(DATA_DIR, "smartdj-state.json");
const PUBLIC_DIR = path.join(ROOT, "public");
const INPUT_DIR = path.join(DATA_DIR, "bleep-input");
const OUTPUT_DIR = path.join(PUBLIC_DIR, "audio", "smartdj", "clean");

const EXPLICIT_WORDS = [
  "fuck",
  "fucking",
  "shit",
  "bitch",
  "pussy",
  "dick",
  "cock",
  "cocksucker",
  "motherfucker",
  "nigger",
  "nigga",
  "asshole",
  "slut",
  "whore",
];

function ensureDirs() {
  for (const dir of [DATA_DIR, INPUT_DIR, OUTPUT_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function safeJsonRead(filePath: string, fallback: any) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf8");
    if (!raw.trim()) return fallback;
    return JSON.parse(raw.replace(/^\uFEFF/, ""));
  } catch {
    return fallback;
  }
}

function safeJsonWrite(filePath: string, value: any) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
}

function normalizeWord(value: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isExplicitWord(word: string) {
  const clean = normalizeWord(word);
  return EXPLICIT_WORDS.includes(clean);
}

function getJobListShape(data: any): { list: AnyRecord[]; save: (list: AnyRecord[]) => any } {
  if (Array.isArray(data)) {
    return {
      list: data,
      save: (list) => list,
    };
  }

  if (Array.isArray(data?.jobs)) {
    return {
      list: data.jobs,
      save: (list) => ({ ...data, jobs: list }),
    };
  }

  if (Array.isArray(data?.items)) {
    return {
      list: data.items,
      save: (list) => ({ ...data, items: list }),
    };
  }

  return {
    list: [],
    save: (list) => ({ jobs: list }),
  };
}

function findJob(list: AnyRecord[], jobId: string) {
  return list.find((job) => {
    const ids = [
      job.id,
      job.jobId,
      job.bleepJobId,
      job.trackId,
      job.track?.id,
      job.track?.trackId,
    ].filter(Boolean);

    return ids.map(String).includes(String(jobId));
  });
}

function cueFromRawCue(cue: any): BleepCue | null {
  const start = Number(cue?.start ?? cue?.startTime ?? cue?.from);
  const end = Number(cue?.end ?? cue?.endTime ?? cue?.to);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  if (start < 0 || end <= start) return null;

  return {
    start: Math.max(0, start),
    end,
    word: cue?.word ? String(cue.word) : undefined,
    reason: cue?.reason ? String(cue.reason) : "explicit_cue",
  };
}

function buildCues(job: AnyRecord, requestCues?: any[]): BleepCue[] {
  const rawCueSources = [
    requestCues,
    job.bleepCues,
    job.explicitCues,
    job.cues,
    job.track?.bleepCues,
    job.track?.explicitCues,
    job.track?.cues,
  ];

  for (const raw of rawCueSources) {
    if (Array.isArray(raw) && raw.length) {
      const cues = raw.map(cueFromRawCue).filter(Boolean) as BleepCue[];
      if (cues.length) return mergeCues(cues);
    }
  }

  const wordSources = [
    job.wordTimestamps,
    job.words,
    job.transcriptWords,
    job.track?.wordTimestamps,
    job.track?.words,
    job.track?.transcriptWords,
  ];

  for (const words of wordSources) {
    if (Array.isArray(words) && words.length) {
      const cues = words
        .filter((item) => isExplicitWord(String(item?.word ?? item?.text ?? "")))
        .map((item) => {
          const start = Number(item.start ?? item.startTime);
          const end = Number(item.end ?? item.endTime);
          if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;

          return {
            start: Math.max(0, start - 0.03),
            end: end + 0.05,
            word: String(item.word ?? item.text ?? ""),
            reason: "explicit_word_timestamp",
          };
        })
        .filter(Boolean) as BleepCue[];

      if (cues.length) return mergeCues(cues);
    }
  }

  return [];
}

function mergeCues(cues: BleepCue[]) {
  const sorted = cues
    .filter((cue) => Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.end > cue.start)
    .sort((a, b) => a.start - b.start);

  const merged: BleepCue[] = [];

  for (const cue of sorted) {
    const last = merged[merged.length - 1];

    if (!last || cue.start > last.end + 0.04) {
      merged.push({ ...cue });
    } else {
      last.end = Math.max(last.end, cue.end);
      last.word = [last.word, cue.word].filter(Boolean).join(",");
      last.reason = "merged_explicit_cues";
    }
  }

  return merged;
}

function isLocalPublicAudio(value: string) {
  return value.startsWith("/audio/") || value.startsWith("audio/");
}

function publicUrlToFilePath(value: string) {
  const clean = value.startsWith("/") ? value.slice(1) : value;
  const resolved = path.resolve(PUBLIC_DIR, clean);

  if (!resolved.startsWith(PUBLIC_DIR)) {
    throw new Error("Unsafe local audio path.");
  }

  return resolved;
}

function getAudioSource(job: AnyRecord, body: AnyRecord) {
  const explicitLocalPath =
    body.sourceFilePath ||
    job.sourceFilePath ||
    job.localAudioPath ||
    job.track?.sourceFilePath ||
    job.track?.localAudioPath;

  if (explicitLocalPath) {
    const resolved = path.resolve(ROOT, String(explicitLocalPath));
    return {
      type: "local" as const,
      value: resolved,
      authorized: true,
    };
  }

  const authorizedUrl =
    body.authorizedAudioUrl ||
    job.authorizedAudioUrl ||
    job.safeDownloadUrl ||
    job.track?.authorizedAudioUrl ||
    job.track?.safeDownloadUrl;

  if (authorizedUrl) {
    const url = String(authorizedUrl);

    if (isLocalPublicAudio(url)) {
      return {
        type: "local" as const,
        value: publicUrlToFilePath(url),
        authorized: true,
      };
    }

    return {
      type: "remote" as const,
      value: url,
      authorized: true,
    };
  }

  const unsafeUrl =
    body.audioUrl ||
    job.audioUrl ||
    job.rawAudioUrl ||
    job.track?.audioUrl ||
    job.track?.rawAudioUrl ||
    job.track?.url;

  if (unsafeUrl && isLocalPublicAudio(String(unsafeUrl))) {
    return {
      type: "local" as const,
      value: publicUrlToFilePath(String(unsafeUrl)),
      authorized: true,
    };
  }

  return {
    type: "missing" as const,
    value: unsafeUrl ? String(unsafeUrl) : "",
    authorized: false,
  };
}

async function downloadAuthorizedAudio(url: string, jobId: string) {
  const output = path.join(INPUT_DIR, `${jobId}-source-audio`);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "ThaCoreRadioCleanProcessor/1.0",
      Accept: "audio/*,*/*",
    },
  });

  if (!response.ok) {
    const error: any = new Error(`Audio download failed with HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }

  const arrayBuffer = await response.arrayBuffer();
  fs.writeFileSync(output, Buffer.from(arrayBuffer));

  return output;
}

function runCommand(command: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const error: any = new Error(`${command} failed with code ${code}`);
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
      }
    });
  });
}

function ffmpegTime(value: number) {
  return Number(value).toFixed(3);
}

async function processWithFfmpeg(inputPath: string, outputPath: string, cues: BleepCue[]) {
  const filterParts: string[] = [];

  let base = "[0:a]";
  cues.forEach((cue, index) => {
    const out = `[duck${index}]`;
    filterParts.push(
      `${base}volume=enable='between(t,${ffmpegTime(cue.start)},${ffmpegTime(cue.end)})':volume=0.04${out}`
    );
    base = out;
  });

  const beepLabels: string[] = [];

  cues.forEach((cue, index) => {
    const duration = Math.max(0.08, cue.end - cue.start);
    const delayMs = Math.max(0, Math.round(cue.start * 1000));
    const label = `[beep${index}]`;

    filterParts.push(
      `sine=frequency=1000:duration=${ffmpegTime(duration)},volume=0.35,adelay=${delayMs}|${delayMs}${label}`
    );

    beepLabels.push(label);
  });

  const inputs = [base, ...beepLabels].join("");
  const mixedLabel = "[mixed]";
  filterParts.push(`${inputs}amix=inputs=${1 + beepLabels.length}:duration=first:normalize=0${mixedLabel}`);

  const filterComplex = filterParts.join(";");

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const args = [
    "-y",
    "-i",
    inputPath,
    "-filter_complex",
    filterComplex,
    "-map",
    mixedLabel,
    "-map",
    "0:v?",
    "-c:v",
    "copy",
    "-c:a",
    "libmp3lame",
    "-b:a",
    "192k",
    outputPath,
  ];

  await runCommand("ffmpeg", args);

  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1024) {
    throw new Error("Processed file was not created correctly.");
  }
}

function updateMatchingTracks(value: any, matcher: (track: AnyRecord) => boolean, updater: (track: AnyRecord) => AnyRecord): any {
  if (Array.isArray(value)) {
    return value.map((item) => updateMatchingTracks(item, matcher, updater));
  }

  if (value && typeof value === "object") {
    const record = value as AnyRecord;

    const looksLikeTrack =
      "title" in record ||
      "audioUrl" in record ||
      "rawAudioUrl" in record ||
      "trackId" in record ||
      "id" in record;

    let next: AnyRecord = { ...record };

    if (looksLikeTrack && matcher(record)) {
      next = updater(record);
    }

    for (const key of Object.keys(next)) {
      next[key] = updateMatchingTracks(next[key], matcher, updater);
    }

    return next;
  }

  return value;
}

function returnSafeCopyToSmartDj(job: AnyRecord, processedAudioUrl: string) {
  if (!fs.existsSync(SMARTDJ_STATE_FILE)) return false;

  const state = safeJsonRead(SMARTDJ_STATE_FILE, null);
  if (!state) return false;

  const jobTitle = String(job.title || job.trackTitle || job.track?.title || "").toLowerCase().trim();
  const jobTrackId = String(job.trackId || job.track?.id || job.track?.trackId || "").trim();
  const jobId = String(job.id || job.jobId || "").trim();

  let changed = false;

  const updated = updateMatchingTracks(
    state,
    (track) => {
      const trackTitle = String(track.title || track.trackTitle || "").toLowerCase().trim();
      const trackId = String(track.id || track.trackId || "").trim();

      return Boolean(
        (jobTrackId && trackId && jobTrackId === trackId) ||
          (jobId && track.bleepJobId && String(track.bleepJobId) === jobId) ||
          (jobTitle && trackTitle && jobTitle === trackTitle)
      );
    },
    (track) => {
      changed = true;

      return {
        ...track,
        audioUrl: processedAudioUrl,
        cleanAudioUrl: processedAudioUrl,
        processedAudioUrl,
        rawAudioBlocked: true,
        safetyStatus: "READY",
        cleanStatus: "PROCESSED_AUDIO_READY",
        status: track.status === "HELD" ? "READY" : track.status,
        held: false,
        needsBleep: false,
        bleepJobStatus: "PROCESSED_AUDIO_READY",
        safetyNote: "Returned from real clean/bleep processor. Only processed audio is allowed.",
      };
    }
  );

  if (changed) {
    safeJsonWrite(SMARTDJ_STATE_FILE, updated);
  }

  return changed;
}

function updateJobStatus(job: AnyRecord, patch: AnyRecord) {
  return {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
}

export async function runRealBleepProcessor(body: AnyRecord) {
  ensureDirs();

  const jobId = String(body.jobId || body.id || body.bleepJobId || "").trim();

  if (!jobId) {
    return {
      ok: false,
      status: "MISSING_JOB_ID",
      message: "No jobId was provided.",
    };
  }

  const jobsData = safeJsonRead(JOBS_FILE, { jobs: [] });
  const shape = getJobListShape(jobsData);
  const list = shape.list;

  const job = findJob(list, jobId);

  if (!job) {
    return {
      ok: false,
      status: "JOB_NOT_FOUND",
      jobId,
      message: "No matching bleep job was found.",
    };
  }

  const source = getAudioSource(job, body);

  if (!source.authorized || source.type === "missing") {
    const updatedJob = updateJobStatus(job, {
      status: "NEEDS_AUTHORIZED_AUDIO_SOURCE",
      decision: "BLOCK_PROCESSING",
      safe: false,
      needsAuthorizedAudioSource: true,
      message:
        "Processor refused to use raw/unauthorized audio. Provide authorizedAudioUrl, safeDownloadUrl, or sourceFilePath.",
    });

    const updatedList = list.map((item) => (item === job ? updatedJob : item));
    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: false,
      jobId,
      status: "NEEDS_AUTHORIZED_AUDIO_SOURCE",
      message:
        "No authorized audio source found. This prevents fake clean files and prevents 403 Azura download problems.",
    };
  }

  const cues = buildCues(job, body.cues);

  if (!cues.length) {
    const updatedJob = updateJobStatus(job, {
      status: "NEEDS_WORD_TIMESTAMPS",
      decision: "BLOCK_PROCESSING",
      safe: false,
      needsWordTimestamps: true,
      message:
        "No explicit word-level timestamps were found. Processor will not create a fake radio-safe copy.",
    });

    const updatedList = list.map((item) => (item === job ? updatedJob : item));
    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: false,
      jobId,
      status: "NEEDS_WORD_TIMESTAMPS",
      message:
        "Job needs word-level timestamps or explicit bleep cues before real processing can happen.",
    };
  }

  let inputPath = "";

  try {
    if (source.type === "local") {
      inputPath = source.value;

      if (!fs.existsSync(inputPath)) {
        throw new Error(`Local audio file not found: ${inputPath}`);
      }
    } else if (source.type === "remote") {
      inputPath = await downloadAuthorizedAudio(source.value, jobId);
    }

    const outputFileName = `${jobId}-real-bleeped.mp3`;
    const outputPath = path.join(OUTPUT_DIR, outputFileName);
    const processedAudioUrl = `/audio/smartdj/clean/${outputFileName}`;

    await processWithFfmpeg(inputPath, outputPath, cues);

    const returnedToSmartDj = returnSafeCopyToSmartDj(job, processedAudioUrl);

    const updatedJob = updateJobStatus(job, {
      status: "PROCESSED_AUDIO_READY",
      decision: "ALLOW_SAFE_COPY_ONLY",
      safe: true,
      needsBleep: false,
      needsWordTimestamps: false,
      needsAuthorizedAudioSource: false,
      rawAudioBlocked: true,
      processedAudioUrl,
      cleanAudioUrl: processedAudioUrl,
      audioUrl: processedAudioUrl,
      bleepCues: cues,
      cueCount: cues.length,
      returnedToSmartDj,
      message:
        "Real bleeped copy created. Only this processed audio is allowed for preview, queue, and broadcast.",
    });

    const updatedList = list.map((item) => (item === job ? updatedJob : item));
    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: true,
      jobId,
      status: "PROCESSED_AUDIO_READY",
      processedAudioUrl,
      cleanAudioUrl: processedAudioUrl,
      cueCount: cues.length,
      returnedToSmartDj,
      message:
        "Real bleeped copy created and safe copy returned to SmartDJ when a matching track was found.",
    };
  } catch (error: any) {
    const is403 = Number(error?.status) === 403 || String(error?.message || "").includes("403");

    const status = is403 ? "NEEDS_AUTHORIZED_AUDIO_SOURCE" : "PROCESSING_FAILED";

    const updatedJob = updateJobStatus(job, {
      status,
      decision: "BLOCK_PROCESSING",
      safe: false,
      needsBleep: true,
      processingError: String(error?.message || error),
      message: is403
        ? "Remote source refused download with 403. Provide an authorized audio source."
        : "Real bleep processing failed. No safe copy was created.",
    });

    const updatedList = list.map((item) => (item === job ? updatedJob : item));
    safeJsonWrite(JOBS_FILE, shape.save(updatedList));

    return {
      ok: false,
      jobId,
      status,
      message: String((updatedJob as any).message || 'Real bleep processing failed. No safe copy was created.'),
      error: String(error?.message || error),
    };
  }
}


