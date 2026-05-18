"use client";

import { useEffect, useRef, useState } from "react";

type SafetyQueueItem = {
  id?: string;
  createdAt?: string;
  source?: string;
  action?: string;
  decision?: string;
  message?: string;
  track?: {
    id?: string;
    title?: string;
    artist?: string;
    source?: string;
    reason?: string;
    statusText?: string;
    action?: string;
    audioUrl?: string;
    url?: string;
    streamUrl?: string;
    rawUrl?: string;
    processedAudioUrl?: string;
    bleepedAudioUrl?: string;
    cleanAudioUrl?: string;
    radioSafeAudioUrl?: string;
    safeAudioUrl?: string;
  };
};

type SafetyState = {
  queueCount: number;
  queue: SafetyQueueItem[];
  bleepJobsWaiting: number;
  lastUpdated: string;
  status: "ONLINE" | "CHECKING" | "ERROR";
  message: string;
};

type CurrentBroadcastState = {
  status?: string;
  source?: string;
  title?: string;
  artist?: string;
  audioUrl?: string;
  message?: string;
  updatedAt?: string;
};

function getTrackTitle(item: SafetyQueueItem) {
  return item.track?.title || item.track?.id || "Unknown track";
}

function getTrackAudioUrl(item: SafetyQueueItem) {
  const track = item.track ?? {};

  return (
    track.safeAudioUrl ||
    track.radioSafeAudioUrl ||
    track.cleanAudioUrl ||
    track.bleepedAudioUrl ||
    track.processedAudioUrl ||
    ""
  );
}

function isWaitingBleepJob(job: any) {
  const text = String(
    `${job?.status ?? ""} ${job?.processorStatus ?? ""} ${job?.message ?? ""}`
  ).toUpperCase();

  return !(
    text.includes("PROCESSED_AUDIO_READY") ||
    text.includes("PROCESSED_AUDIO_ATTACHED") ||
    text.includes("READY")
  );
}

function formatBroadcastOutput(current: CurrentBroadcastState) {
  if (!current?.audioUrl || current?.status === "IDLE") {
    return "No current broadcast handoff yet.";
  }

  return `${current.artist || "SmartDJ"} - ${current.title || "Approved track"}`;
}

export default function AudioSafetyCenterPanel() {
  const [bleepJobs, setBleepJobs] = useState<any[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [state, setState] = useState<SafetyState>({
    queueCount: 0,
    queue: [],
    bleepJobsWaiting: 0,
    lastUpdated: "...",
    status: "CHECKING",
    message: "Checking Audio Safety Center...",
  });

  const [currentBroadcast, setCurrentBroadcast] = useState<CurrentBroadcastState>({
    status: "IDLE",
    message: "No current broadcast handoff yet.",
  });

  async function refreshCurrentBroadcastOutput() {
    try {
      const response = await fetch(`/api/radio/current-broadcast?refresh=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (data?.ok) {
        setCurrentBroadcast({
          status: data.status || "SMARTDJ_BROADCASTING",
          source: data.source || "SMARTDJ",
          title: data.title || "",
          artist: data.artist || "",
          audioUrl: data.audioUrl || "",
          message: data.message || "Approved safety queue item is now current broadcast output.",
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      } else {
        setCurrentBroadcast({
          status: "SMARTDJ_BROADCASTING",
          source: "SMARTDJ",
          title: "",
          artist: "",
          audioUrl: "",
          message: "Approved safety queue item is now current broadcast output.",
          updatedAt: new Date().toISOString(),
        });
      }

      window.setTimeout(() => {
        refreshCurrentBroadcastOutput();
      }, 500);

      // CURRENT_BROADCAST_CARD_REFRESH_FIX_V1
    } catch {
      setCurrentBroadcast((current) => ({
        ...current,
        message: "Current broadcast state could not refresh.",
      }));
    }
  }
  // AUDIO_SAFETY_BLEEP_JOB_CONTROL_V1
  function getBleepJobTitle(job: any) {
    return job?.track?.title || job?.track?.id || job?.id || "Unknown bleep job";
  }

  function getBleepJobSafeUrl(job: any) {
    return (
      job?.processedAudioUrl ||
      job?.bleepedAudioUrl ||
      job?.cleanAudioUrl ||
      job?.radioSafeAudioUrl ||
      job?.safeAudioUrl ||
      job?.track?.processedAudioUrl ||
      job?.track?.bleepedAudioUrl ||
      job?.track?.cleanAudioUrl ||
      job?.track?.radioSafeAudioUrl ||
      job?.track?.safeAudioUrl ||
      ""
    );
  }

  function getBleepJobReadyTrack(job: any) {
    const safeUrl = getBleepJobSafeUrl(job);
    const track = job?.track ?? {};

    return {
      ...track,
      audioUrl: safeUrl,
      url: safeUrl,
      streamUrl: safeUrl,
      processedAudioUrl: safeUrl,
      bleepedAudioUrl: safeUrl,
      cleanAudioUrl: safeUrl,
      radioSafeAudioUrl: safeUrl,
      safeAudioUrl: safeUrl,
      statusText: "READY - clean/bleeped audio attached",
      action: "processed_audio_ready",
      source: track?.source || job?.source || "Audio Safety Center",
    };
  }

  async function refreshBleepJobs() {
    try {
      const response = await fetch("/api/radio/bleep-job", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

      setBleepJobs(jobs);

      setState((current) => ({
        ...current,
        bleepJobsWaiting: jobs.filter((job: any) => !getBleepJobSafeUrl(job)).length,
        lastUpdated: new Date().toLocaleTimeString(),
        message: data?.message || current.message,
      }));
    } catch {
      setState((current) => ({
        ...current,
        message: "Could not load bleep/clean jobs.",
      }));
    }
  }

  async function attachProcessedAudioToBleepJob(job: any) {
    const safeUrl = window.prompt(
      "Paste the CLEAN / BLEEPED / RADIO-SAFE audio URL for this job:",
      getBleepJobSafeUrl(job) || "/audio/smartdj/test-bleeped-clean.mp3"
    );

    if (!safeUrl || !safeUrl.trim()) return;

    setState((current) => ({
      ...current,
      message: "Attaching clean/bleeped audio to bleep job...",
    }));

    try {
      const response = await fetch("/api/radio/bleep-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "attach_processed_audio",
          id: job?.id,
          processedAudioUrl: safeUrl.trim(),
          bleepedAudioUrl: safeUrl.trim(),
          cleanAudioUrl: safeUrl.trim(),
          radioSafeAudioUrl: safeUrl.trim(),
          safeAudioUrl: safeUrl.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      setState((current) => ({
        ...current,
        message:
          data?.message ||
          "Clean/bleeped audio attached. Job can now become READY.",
      }));

      await refreshBleepJobs();
      await refreshSafetyCenter();
    } catch {
      setState((current) => ({
        ...current,
        message: "Could not attach clean/bleeped audio.",
      }));
    }
  }
  // SMARTDJ_ONE_BUTTON_CLEAN_RETURN_V1
  async function smartDjCleanAndReturn(job: any) {
    const safeUrl = getBleepJobSafeUrl(job);
    const sourceText = String(job?.source || job?.track?.source || "SMARTDJ").toUpperCase();

    if (!sourceText.includes("SMARTDJ")) {
      setState((current) => ({
        ...current,
        message:
          "PARKED - this one-button return is wired for SmartDJ first. Other source lanes come next.",
      }));
      return;
    }

    setState((current) => ({
      ...current,
      message: "SmartDJ is checking clean/bleep status and returning safe audio to its playlist...",
    }));

    try {
      if (safeUrl) {
        await fetch(`/api/smartdj/command?refresh=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        }).catch(() => null);

        await fetch(`/api/smartdj/latest-playlist?refresh=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        }).catch(() => null);

        await refreshBleepJobs();
        await refreshSafetyCenter();

        const message =
          "SMARTDJ COMPLETE - clean/bleeped audio returned to the SmartDJ playlist. Use SmartDJ playlist controls for preview/queue/broadcast.";

        setState((current) => ({
          ...current,
          message,
          lastUpdated: new Date().toLocaleTimeString(),
        }));

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("tha-core-smartdj-status", { detail: message })
          );
        }

        return;
      }

      await fetch("/api/radio/bleep-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "attach_track",
          id: job?.id,
          track: job?.track ?? {},
        }),
      }).catch(() => null);

      await refreshBleepJobs();
      await refreshSafetyCenter();

      setState((current) => ({
        ...current,
        message:
          "SMARTDJ CLEAN/BLEEP REQUESTED - job is HELD while SmartDJ/processor creates or finds a clean/bleeped copy. It will return to SmartDJ playlist when ready.",
        lastUpdated: new Date().toLocaleTimeString(),
      }));
    } catch {
      setState((current) => ({
        ...current,
        message: "SmartDJ one-button clean/return failed. Job remains HELD.",
      }));
    }
  }



  async function sendBleepJobToQueue(job: any) {
    const safeUrl = getBleepJobSafeUrl(job);

    if (!safeUrl) {
      setState((current) => ({
        ...current,
        message:
          "BLOCKED - no clean/bleeped audio attached. Job stays HELD.",
      }));
      return;
    }

    setState((current) => ({
      ...current,
      message: "Sending clean/bleeped job audio to safety queue...",
    }));

    try {
      const response = await fetch("/api/radio/safe-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          source: job?.source || "SMARTDJ",
          action: "send_to_queue",
          mode: "pre_broadcast",
          requireClean: true,
          track: getBleepJobReadyTrack(job),
        }),
      });

      const data = await response.json().catch(() => ({}));

      setState((current) => ({
        ...current,
        message:
          data?.message ||
          (data?.allowed
            ? "Clean/bleeped audio queued."
            : "Audio was not allowed to queue."),
      }));

      await refreshSafetyCenter();
    } catch {
      setState((current) => ({
        ...current,
        message: "Could not send bleep job to safety queue.",
      }));
    }
  }

  async function removeBleepJob(job: any) {
    if (!window.confirm(`Remove bleep job: ${getBleepJobTitle(job)}?`)) return;

    try {
      const response = await fetch("/api/radio/bleep-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          action: "remove",
          id: job?.id,
        }),
      });

      const data = await response.json().catch(() => ({}));

      setState((current) => ({
        ...current,
        message: data?.message || "Bleep job removed.",
      }));

      await refreshBleepJobs();
      await refreshSafetyCenter();
    } catch {
      setState((current) => ({
        ...current,
        message: "Could not remove bleep job.",
      }));
    }
  }



  async function refreshSafetyCenter() {
    setState((current) => ({
      ...current,
      status: "CHECKING",
      message: "Refreshing Audio Safety Center...",
      lastUpdated: "Refreshing...",
    }));

    try {
      const bust = Date.now();

      const [safeResponse, jobsResponse] = await Promise.allSettled([
        fetch(`/api/radio/safe-action?refresh=${bust}`, {
          method: "GET",
          cache: "no-store",
        }),
        fetch(`/api/radio/bleep-job?refresh=${bust}`, {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      let queueCount = 0;
      let queue: SafetyQueueItem[] = [];
      let bleepJobsWaiting = 0;

      if (safeResponse.status === "fulfilled") {
        const safeData = await safeResponse.value.json().catch(() => null);
        queueCount = Number(safeData?.queueCount ?? 0);
        queue = Array.isArray(safeData?.queue) ? safeData.queue : [];
      }

      if (jobsResponse.status === "fulfilled") {
        const jobsData = await jobsResponse.value.json().catch(() => null);
        const jobs = Array.isArray(jobsData?.jobs)
          ? jobsData.jobs
          : Array.isArray(jobsData?.queue)
            ? jobsData.queue
            : Array.isArray(jobsData?.bleepJobs)
              ? jobsData.bleepJobs
              : [];

        bleepJobsWaiting = jobs.filter(isWaitingBleepJob).length;
      }

      await refreshCurrentBroadcastOutput();

      setState({
        queueCount,
        queue,
        bleepJobsWaiting,
        lastUpdated: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        status: "ONLINE",
        message:
          queueCount > 0
            ? `Audio Safety Center refreshed. ${queueCount} approved safe queue item(s) ready.`
            : "Audio Safety Center refreshed. No approved queue items right now.",
      });
    } catch {
      setState((current) => ({
        ...current,
        status: "ERROR",
        message: "Audio Safety Center could not refresh.",
        lastUpdated: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      }));
    }
  }

  async function clearSafetyQueue() {
    setState((current) => ({
      ...current,
      message: "Clearing full SmartDJ safety queue...",
    }));

    try {
      await fetch("/api/radio/safe-action", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          clear: true,
        }),
      });

      await refreshSafetyCenter();
    } catch {
      setState((current) => ({
        ...current,
        message: "Could not clear SmartDJ safety queue.",
      }));
    }
  }

  async function removeQueuedSafetyItem(item: SafetyQueueItem) {
    if (!item.id) return;

    setState((current) => ({
      ...current,
      message: `Removing queued item: ${getTrackTitle(item)}...`,
    }));

    try {
      await fetch("/api/radio/safe-action", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          id: item.id,
        }),
      });

      await refreshSafetyCenter();
    } catch {
      setState((current) => ({
        ...current,
        message: "Could not remove queued safety item.",
      }));
    }
  }

  async function playQueuedSafetyItem(item: SafetyQueueItem) {
  setState((current) => ({
    ...current,
    message:
      "RETURN ONLY - Audio Safety Center does not play audio. Use RETURN TO SOURCE so the cleaned track goes back to SmartDJ or its original lane.",
  }));
  return;
    const audioUrl = getTrackAudioUrl(item);

    if (!audioUrl) {
      setState((current) => ({
        ...current,
        message: "Queued track has no playable clean/bleeped audio URL.",
      }));
      return;
    }

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const player = new Audio(audioUrl);
      player.volume = 1;
      audioRef.current = player;

      await player.play();

      setState((current) => ({
        ...current,
        message: `Playing queued safe track: ${getTrackTitle(item)}`,
      }));
    } catch {
      setState((current) => ({
        ...current,
        message: "Could not RETURN ONLY safe track.",
      }));
    }
  }

  function stopQueuedPlayback() {
  const player = audioRef.current;

  if (player) {
    try {
      player.pause();
    } catch {
      // Ignore pause errors.
    }

    try {
      player.currentTime = 0;
    } catch {
      // Ignore browser reset errors.
    }

    try {
      player.removeAttribute("src");
      player.load();
    } catch {
      // Ignore unload errors.
    }

    audioRef.current = null;
  }

  try {
    window.dispatchEvent(new CustomEvent("tha-core-safety-queue-stop-playback"));
  } catch {
    // Ignore window event errors.
  }

  setState((current) => ({
    ...current,
    message: "Queued safety playback stopped and audio source cleared.",
  }));
}

async function returnQueuedSafetyItemToSource(item: SafetyQueueItem) {
  const audioUrl = getTrackAudioUrl(item);
  const track = item.track ?? {};
  const sourceText = String(item.source || track.source || "SMARTDJ").toUpperCase();

  if (!audioUrl) {
    setState((current) => ({
      ...current,
      message:
        "BLOCKED - no clean/bleeped/processed audio attached. This item cannot play or return yet.",
    }));
    return;
  }

  if (sourceText.includes("SMARTDJ")) {
    try {
      await fetch(`/api/smartdj/command?refresh=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      await fetch(`/api/smartdj/latest-playlist?refresh=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      }).catch(() => null);

      await refreshBleepJobs();
      await refreshSafetyCenter();

      const message =
        "RETURNED TO SMARTDJ - clean/bleeped audio is synced back to the SmartDJ playlist. Use SmartDJ playlist controls from the proper lane.";

      setState((current) => ({
        ...current,
        message,
        lastUpdated: new Date().toLocaleTimeString(),
      }));

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("tha-core-smartdj-status", { detail: message })
        );
      }

      return;
    } catch {
      setState((current) => ({
        ...current,
        message: "Could not return clean/bleeped audio to SmartDJ playlist.",
      }));
      return;
    }
  }

  setState((current) => ({
    ...current,
    message:
      "RETURN TO SOURCE parked - SmartDJ return is wired first. Other source lanes come next.",
    lastUpdated: new Date().toLocaleTimeString(),
  }));
}
// AUDIO_SAFETY_RETURN_TO_SOURCE_V1

async function sendQueuedSafetyItemToBroadcast(item: SafetyQueueItem) {
    const audioUrl = getTrackAudioUrl(item);

    if (!audioUrl) {
      setState((current) => ({
        ...current,
        message: "Broadcast handoff blocked. Queued item has no clean/bleeped audio URL.",
      }));
      return;
    }

    const track = item.track ?? {};
    const title = track.title || getTrackTitle(item);
    const artist = track.artist || item.source || "SmartDJ";

    try {
      const response = await fetch("/api/radio/current-broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          status: "SMARTDJ_BROADCASTING",
          source: "SMARTDJ",
          title: "",
          artist: "",
          audioUrl: "",
          track,
          message: "Approved safety queue item sent to current broadcast state.",
        }),
      });

      const data = await response.json().catch(() => null);

      if (data?.ok) {
        setCurrentBroadcast({
          status: data.status || "SMARTDJ_BROADCASTING",
          source: data.source || "SMARTDJ",
          title: data.title || "",
          artist: data.artist || "",
          audioUrl: data.audioUrl || "",
          message: data.message || "Approved safety queue item is now current broadcast output.",
          updatedAt: data.updatedAt || new Date().toISOString(),
        });
      } else {
        setCurrentBroadcast({
          status: "SMARTDJ_BROADCASTING",
          source: "SMARTDJ",
          title: "",
          artist: "",
          audioUrl: "",
          message: "Approved safety queue item is now current broadcast output.",
          updatedAt: new Date().toISOString(),
        });
      }

      window.setTimeout(() => {
        refreshCurrentBroadcastOutput();
      }, 500);

      // CURRENT_BROADCAST_CARD_REFRESH_FIX_V1
    } catch {
      setState((current) => ({
        ...current,
        message: "Current broadcast state could not be saved, but handoff will still be attempted.",
      }));
    }

    window.dispatchEvent(
      new CustomEvent("tha-core-safety-queue-broadcast", {
        detail: {
          item,
          track,
          audioUrl: "",
        },
      })
    );

    setState((current) => ({
      ...current,
      message: `Broadcast handoff sent: ${getTrackTitle(item)}`,
    }));
  }

  async function testHeldRule() {
    setState((current) => ({
      ...current,
      message: "Testing HELD One Truth rule...",
    }));

    try {
      const response = await fetch("/api/radio/safe-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          source: "CONTROL_PANEL",
          action: "test_held_rule",
          track: {
            id: "audio-safety-center-held-test",
            title: "Held safety test",
            artist: "Tha Core",
            source: "Audio Safety Center",
            reason: "HELD - needs clean/bleep copy",
            statusText: "HELD - needs clean/bleep copy",
            action: "held_for_clean_bleep",
            audioUrl: "",
            url: "",
            streamUrl: "",
          },
        }),
      });

      const data = await response.json().catch(() => null);

      setState((current) => ({
        ...current,
        message:
          data?.decision === "BLOCKED_HELD_ONE_TRUTH"
            ? "HELD test passed. Blocked everywhere until clean/bleep copy is ready."
            : data?.message || "HELD test completed.",
      }));

      await refreshSafetyCenter();
    } catch {
      setState((current) => ({
        ...current,
        message: "HELD test failed to run.",
      }));
    }
  }

  useEffect(() => {
    refreshSafetyCenter();
    refreshBleepJobs();
    refreshCurrentBroadcastOutput();

    const timer = window.setInterval(() => {
      refreshSafetyCenter();
    refreshBleepJobs();
    refreshCurrentBroadcastOutput();
    }, 15000);

    return () => {
      window.clearInterval(timer);

      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <section className="audio-safety-center-panel">
      <div className="audio-safety-center-header">
        <div>
          <p className="audio-safety-center-kicker">ONE TRUTH SAFETY CENTER</p>
          <h2>AUDIO SAFETY CENTER</h2>
          <p>
            SmartDJ {"\u2022"} AutoDJ {"\u2022"} LiveDJ {"\u2022"} Requests {"\u2022"} Uploads {"\u2022"} Promos {"\u2022"} Jingles {"\u2022"} Ads
          </p>
        </div>

        <div className="audio-safety-center-actions">
          <button type="button" onClick={refreshSafetyCenter}>
            REFRESH SAFETY
          </button>
          <button type="button" onClick={testHeldRule}>
            TEST HELD
          </button>
          <button type="button" onClick={clearSafetyQueue}>
            CLEAR QUEUE
          </button>
        </div>
      </div>

      <div className="audio-safety-center-rule">
        <strong>Rule:</strong> HELD anywhere = blocked everywhere. CLEAN anywhere =
        clean everywhere. BLEEPED anywhere = safe everywhere.
      </div>

      <div className="audio-safety-center-grid">
        <div className="audio-safety-center-card">
          <span>Safety Brain</span>
          <strong>{state.status}</strong>
          <small>{state.message}</small>
        </div>

        <div className="audio-safety-center-card">
          <span>SmartDJ Safety Queue</span>
          <strong>{state.queueCount}</strong>
          <small>Only clean/bleeped approved tracks should appear here.</small>
        </div>

        <div className="audio-safety-center-card">
          <span>Bleep / Clean Jobs</span>
          <strong>{state.bleepJobsWaiting}</strong>
          <small>Tracks still waiting for clean or bleeped copy.</small>
        </div>

        <div className="audio-safety-center-card">
          <span>Current Broadcast Output</span>
          <strong>{currentBroadcast.status || "IDLE"}</strong>
          <small>{formatBroadcastOutput(currentBroadcast)}</small>
        </div>

        <div className="audio-safety-center-card">
          <span>Last Updated</span>
          <strong>{state.lastUpdated}</strong>
          <small>Refresh button and auto refresh are both active.</small>
        </div>
      </div>

      <div className="audio-safety-center-flow">
        <div>
          <strong>Preview</strong>
          <span>Blocked unless CLEAN or BLEEPED</span>
        </div>
        <div>
          <strong>Queue</strong>
          <span>Blocked unless CLEAN or BLEEPED</span>
        </div>
        <div>
          <strong>Broadcast</strong>
          <span>Blocked unless CLEAN or BLEEPED</span>
        </div>
      </div>

            <section className="audio-safety-center-jobs">
        <div className="audio-safety-center-section-title">
          <strong>Bleep / Clean Job Control</strong>
          <small>
            {bleepJobs.length} job(s). HELD jobs cannot queue or broadcast until clean/bleeped audio is attached.
          </small>
        </div>

        {bleepJobs.length > 0 ? (
          <div className="audio-safety-center-queue-list">
            {bleepJobs.map((job: any) => {
              const safeUrl = getBleepJobSafeUrl(job);
              const isReady = Boolean(safeUrl);

              return (
                <div
                  className={`audio-safety-center-queue-item ${
                    isReady ? "ready" : "held"
                  }`}
                  key={job?.id || getBleepJobTitle(job)}
                >
                  <div>
                    <strong>{getBleepJobTitle(job)}</strong>
                    <small>
                      Status: {job?.status || "BLEEP_JOB_CREATED"} {"ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢"}{" "}
                      {isReady ? "READY - clean/bleeped audio attached" : "HELD - waiting for clean/bleeped copy"}
                    </small>
                    <small>{job?.message || "Waiting for clean/bleeped copy."}</small>
                    {safeUrl ? <small>Safe audio: {safeUrl}</small> : null}
                  </div>

                  <div className="audio-safety-center-queue-actions">
                    <button
                      type="button"
                      onClick={() => smartDjCleanAndReturn(job)}
                    >
                      SMARTDJ CLEAN + RETURN
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="audio-safety-center-empty">
            No bleep/clean jobs waiting right now.
          </p>
        )}
      </section>

      {state.queue.length > 0 ? (
        <div className="audio-safety-center-list">
          {state.queue.map((item, index) => (
            <div key={`${item.id}-${index}`} className="audio-safety-center-item">
              <strong>
                {index + 1}. {item.track?.artist || item.source || "Tha Core"} -{" "}
                {getTrackTitle(item)}
              </strong>

              <span>{item.message || item.decision || "Queued safety item."}</span>

              <small>
                Decision: {item.decision || "ALLOW_TO_QUEUE"} {"\u2022"} Source:{" "}
                {item.source || "CONTROL_PANEL"}
              </small>

              <div className="audio-safety-center-item-actions">
                <button type="button" onClick={() => playQueuedSafetyItem(item)}>
                  RETURN ONLY
                </button>

                <button type="button" onClick={stopQueuedPlayback}>
                  STOP SAFETY AUDIO
                </button>

                <button type="button" onClick={() => returnQueuedSafetyItemToSource(item)}>
                  RETURN TO SOURCE
                </button>

                <button type="button" onClick={() => removeQueuedSafetyItem(item)}>
                  REMOVE
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="audio-safety-center-empty">
          No approved safety-queue tracks right now. HELD tracks stay blocked until
          clean/bleep copy is ready.
        </p>
      )}
    </section>
  );
}

