"use client";



import SmartDJAutoBrain from "../../components/smartdj-auto-brain";
import AudioSafetyCenterPanel from "../../components/audio-safety-center-panel";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import OwnerSmartDjCommand from "@/components/owner-smartdj-command";
import GlobalBleepGateButton from "@/components/global-bleep-gate-button";
import GlobalBleepJobsPanel from "@/components/global-bleep-jobs-panel";
import GlobalGateMiniStatus from "@/components/global-gate-mini-status";

type BroadcastState = "off" | "cue" | "live" | "paused";
type PadMode = "JINGLES" | "DROPS" | "COM" | "ADS" | "SMARTDJ" | "AUTODJ" | "LIVEDJ";
type DjMode = "AUTODJ" | "SMARTDJ" | "LIVEDJ";
type PadColor = "yellow" | "red" | "green" | "blue" | "purple" | "orange";

type Pad = {
  label: string;
  mode: PadMode;
  message: string;
  color: PadColor;
};

type LogItem = {
  id: number;
  time: string;
  message: string;
};

type FooterTool = {
  label: string;
  href: string;
  note: string;
  color: PadColor;
};

const STREAM_URL = "";

const padModes: PadMode[] = [
  "JINGLES",
  "DROPS",
  "COM",
  "ADS",
  "SMARTDJ",
  "AUTODJ",
  "LIVEDJ",
];

const pads: Pad[] = [
  { label: "Jingles Folder", mode: "JINGLES", message: "Jingles folder selected.", color: "blue" },
  { label: "Station ID", mode: "JINGLES", message: "Tha Core official station ID fired.", color: "yellow" },
  { label: "Big Intro", mode: "JINGLES", message: "Big intro jingle fired.", color: "orange" },
  { label: "You Locked In", mode: "JINGLES", message: "You are locked in to Tha Core Online Radio.", color: "green" },
  { label: "Morning Vibe", mode: "JINGLES", message: "Morning vibe jingle fired.", color: "yellow" },
  { label: "Late Night", mode: "JINGLES", message: "Late night jingle fired.", color: "purple" },
  { label: "Dancehall Core", mode: "JINGLES", message: "Dancehall Core jingle fired.", color: "red" },
  { label: "Reggae Core", mode: "JINGLES", message: "Reggae Core jingle fired.", color: "green" },
  { label: "Weekend Mix", mode: "JINGLES", message: "Weekend mix jingle fired.", color: "blue" },
  { label: "Fresh Music", mode: "JINGLES", message: "Fresh music jingle fired.", color: "orange" },
  { label: "Back To Back", mode: "JINGLES", message: "Back-to-back music jingle fired.", color: "yellow" },

  { label: "DJ Drop", mode: "DROPS", message: "DJ Daily Bread drop fired.", color: "purple" },
  { label: "Pull Up", mode: "DROPS", message: "Pull up selector drop fired.", color: "red" },
  { label: "Crowd Hype", mode: "DROPS", message: "Crowd hype drop fired.", color: "orange" },
  { label: "Dancehall Drop", mode: "DROPS", message: "Dancehall drop fired.", color: "green" },
  { label: "Hip Hop Drop", mode: "DROPS", message: "Hip hop drop fired.", color: "blue" },
  { label: "Reggae Drop", mode: "DROPS", message: "Reggae drop fired.", color: "yellow" },

  { label: "Com Break", mode: "COM", message: "Commercial break selected.", color: "blue" },
  { label: "Back Soon", mode: "COM", message: "Back soon commercial bridge selected.", color: "yellow" },
  { label: "Sponsor Block", mode: "COM", message: "Sponsor block selected.", color: "green" },
  { label: "Voice Promo", mode: "COM", message: "Voice promo selected.", color: "purple" },
  { label: "Street Promo", mode: "COM", message: "Street promo commercial selected.", color: "orange" },
  { label: "Radio Promo", mode: "COM", message: "Radio promo commercial selected.", color: "red" },

  { label: "Store Ad", mode: "ADS", message: "Tha Core store ad fired.", color: "green" },
  { label: "Print Ad", mode: "ADS", message: "Graphics and printing ad fired.", color: "blue" },
  { label: "Music Promo", mode: "ADS", message: "Music promotion ad fired.", color: "orange" },
  { label: "Sponsor Ad", mode: "ADS", message: "Sponsor ad fired.", color: "yellow" },

  { label: "Smart Mix", mode: "SMARTDJ", message: "SmartDJ mix selected.", color: "purple" },
  { label: "Smart Jingle", mode: "SMARTDJ", message: "SmartDJ jingle timing selected.", color: "yellow" },
  { label: "Smart Ads", mode: "SMARTDJ", message: "SmartDJ ad timing selected.", color: "green" },
  { label: "Smart Talk", mode: "SMARTDJ", message: "SmartDJ talk break selected.", color: "blue" },

  { label: "AutoDJ Flow", mode: "AUTODJ", message: "AutoDJ flow selected.", color: "orange" },
  { label: "Auto Next", mode: "AUTODJ", message: "AutoDJ next command selected.", color: "green" },
  { label: "Auto Break", mode: "AUTODJ", message: "AutoDJ break selected.", color: "blue" },
  { label: "Auto Rotate", mode: "AUTODJ", message: "AutoDJ rotation selected.", color: "yellow" },

  { label: "Live Mic", mode: "LIVEDJ", message: "Live DJ mic armed.", color: "red" },
  { label: "Talk Break", mode: "LIVEDJ", message: "Live DJ talk break selected.", color: "yellow" },
  { label: "Shout Out", mode: "LIVEDJ", message: "Live shout out selected.", color: "orange" },
  { label: "Request Line", mode: "LIVEDJ", message: "Request line opened.", color: "green" },
];

const footerTools: FooterTool[] = [
  { label: "Blog", href: "/blog", note: "Blog page shortcut ready", color: "yellow" },
  { label: "News", href: "/news", note: "News desk shortcut ready", color: "red" },
  { label: "Weather", href: "/weather", note: "Weather reader shortcut ready", color: "blue" },
  { label: "Time Reader", href: "/time", note: "Time reader shortcut ready", color: "purple" },
  { label: "Cash Pot", href: "/cashpot", note: "Cash Pot / lotto shortcut ready", color: "green" },
  { label: "Store", href: "/store", note: "Store shortcut ready", color: "green" },
  { label: "Community Chat", href: "/chat", note: "Community and chat shortcut ready", color: "orange" },
  { label: "Upload", href: "/upload", note: "Upload center shortcut ready", color: "yellow" },
  { label: "Schedule", href: "/schedule", note: "Show schedule shortcut ready", color: "blue" },
  { label: "Promos", href: "/promos", note: "Promo tools shortcut ready", color: "red" },
];


type SmartDjControlPlaylistTrack = {
  id: string;
  title: string;
  artist?: string;
  source?: string;
  reason?: string;
  audioUrl?: string;
  url?: string;
  streamUrl?: string; isExplicit?: boolean; explicitWords?: string[]; };


function AutoDjGateStatusCard({ autoDj }: { autoDj: boolean }) {
  const [decision, setDecision] = useState("IDLE");

  useEffect(() => {
    let alive = true;

    async function loadDecision() {
      try {
        const res = await fetch("/api/autodj/gated-next", {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (alive) {
          setDecision(String(data?.lastDecision || "IDLE"));
        }
      } catch {
        if (alive) {
          setDecision("GATE_ERROR");
        }
      }
    }

    loadDecision();

    const timer = window.setInterval(loadDecision, 5000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const held =
    decision.includes("HELD") ||
    decision.includes("HOLD") ||
    decision.includes("BLOCK") ||
    decision.includes("ERROR");

  const value = !autoDj ? "OFF" : held ? "HELD" : "ACTIVE";
  const tone = !autoDj ? "red" : held ? "red" : "yellow";

  return <StatusCard label="AutoDJ" value={value} tone={tone} />;
}
function SmartZjRequestTimerPanel() {
  const [requestBlock, setRequestBlock] = useState<any>(null);
  const [status, setStatus] = useState("Loading SmartZJ request timer...");

  async function loadRequestTimer() {
    try {
      const response = await fetch(`/api/radio/smartzj-request-block?controlPanelTimer=${Date.now()}`, {
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!data?.ok) {
        setStatus("Request timer unavailable.");
        return;
      }

      setRequestBlock(data);
      setStatus("Request timer live.");
    } catch {
      setStatus("Request timer could not reach SmartZJ request block.");
    }
  }

  useEffect(() => {
    let alive = true;

    async function tick() {
      if (!alive) return;
      await loadRequestTimer();
    }

    void tick();

    const timer = window.setInterval(() => {
      void tick();
    }, 5000);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  const controlTimer = requestBlock?.controlPanelTimer || {};
  const nextReady = controlTimer?.nextReadyRequest || null;
  const queue = Array.isArray(requestBlock?.queue) ? requestBlock.queue : [];

  return (
    <section className="owner-request-timer-panel panel">
      <style jsx>{`
        .owner-request-timer-panel {
          border: 1px solid rgba(255, 215, 0, 0.35);
          border-radius: 18px;
          padding: 16px;
          margin: 14px 0;
          background: linear-gradient(135deg, rgba(20, 0, 0, 0.92), rgba(0, 0, 0, 0.96));
          box-shadow: 0 0 20px rgba(255, 0, 0, 0.18);
        }

        .request-timer-head {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .request-timer-head strong {
          display: block;
          color: #ffd54a;
          letter-spacing: 0.08em;
          font-size: 0.9rem;
        }

        .request-timer-head span,
        .request-timer-status {
          color: rgba(255, 255, 255, 0.72);
          font-size: 0.78rem;
        }

        .request-timer-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }

        .request-timer-box {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
        }

        .request-timer-box span {
          display: block;
          color: rgba(255, 255, 255, 0.62);
          font-size: 0.7rem;
          text-transform: uppercase;
        }

        .request-timer-box strong {
          color: #ffffff;
          font-size: 1rem;
        }

        .request-next {
          border: 1px solid rgba(0, 255, 136, 0.25);
          border-radius: 12px;
          padding: 10px;
          margin-bottom: 10px;
          background: rgba(0, 255, 136, 0.08);
        }

        .request-next strong {
          color: #7CFFB2;
        }

        .request-list {
          display: grid;
          gap: 8px;
        }

        .request-row {
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.04);
        }

        .request-row strong {
          display: block;
          color: #fff;
        }

        .request-row span {
          display: block;
          color: rgba(255, 255, 255, 0.68);
          font-size: 0.76rem;
          margin-top: 3px;
        }

        @media (max-width: 900px) {
          .request-timer-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
      `}</style>

      <div className="request-timer-head">
        <div>
          <strong>SMARTZJ REQUEST TIMER - CONTROL PANEL</strong>
          <span>Owner queue brain. Separate from listener/homepage timer.</span>
        </div>
        <div className="request-timer-status">{status}</div>
      </div>

      <div className="request-timer-grid">
        <div className="request-timer-box">
          <span>Active Requests</span>
          <strong>{controlTimer?.activeQueueCount ?? 0}</strong>
        </div>
        <div className="request-timer-box">
          <span>Ready Playable</span>
          <strong>{controlTimer?.readyPlayableCount ?? 0}</strong>
        </div>
        <div className="request-timer-box">
          <span>Schedule Allows</span>
          <strong>{controlTimer?.scheduleAllowsRequests ? "YES" : "WAIT"}</strong>
        </div>
        <div className="request-timer-box">
          <span>Current Remaining</span>
          <strong>{controlTimer?.currentBroadcast?.remainingSeconds ?? 0}s</strong>
        </div>
      </div>

      {controlTimer?.blockedReason && (
        <div className="request-next">
          <strong>REQUESTS WAITING:</strong> {controlTimer.blockedReason}
        </div>
      )}

      {nextReady ? (
        <div className="request-next">
          <strong>NEXT REQUEST:</strong> {nextReady.artist ? `${nextReady.artist} - ` : ""}{nextReady.title}
          <br />
          <span>Requested by {nextReady.requestedBy || "Listener"} - {nextReady.estimatedWaitLabel || "Waiting"}</span>
        </div>
      ) : (
        <div className="request-next">
          <strong>NEXT REQUEST:</strong> No READY request waiting for broadcast.
        </div>
      )}

      <div className="request-list">
        {queue.slice(0, 5).map((item: any) => {
          const timer = item?.controlPanelTimer || {};
          return (
            <div className="request-row" key={item.requestId || item.id || item.title}>
              <strong>
                #{timer.queuePosition || "-"} {item.artist ? `${item.artist} - ` : ""}{item.title || "Requested Song"}
              </strong>
              <span>Status: {timer.requestPlayStatus || item.status || "WAITING"}</span>
              <span>Wait: {timer.estimatedWaitLabel || "Waiting"} {timer.blockedReason ? `- ${timer.blockedReason}` : ""}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function SmartDjSafetyQueuePanel() {
  // Old duplicate SmartDJ Safety Queue removed.
  // AudioSafetyCenterPanel is now the only safety/queue brain.
  return null;
}
function SmartDjControlPlaylist() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<SmartDjControlPlaylistTrack[]>([]);
  const [playingId, setPlayingId] = useState("");
  const [status, setStatus] = useState("SmartDJ control playlist ready.");
  const [bleepStatusById, setBleepStatusById] = useState<Record<string, string>>({});
  const [queueStatusById, setQueueStatusById] = useState<Record<string, string>>({});

  useEffect(() => {
    loadSmartDjPlaylist();

    const timer = window.setInterval(() => {
      loadSmartDjPlaylist();
    }, 2500);

    return () => window.clearInterval(timer);
  }, []);

  function normalizeSmartDjTracks(payload: any): SmartDjControlPlaylistTrack[] {
    const rawList = Array.isArray(payload?.playlist)
      ? payload.playlist
      : Array.isArray(payload?.lastPlaylist)
        ? payload.lastPlaylist
        : Array.isArray(payload?.tracks)
          ? payload.tracks
          : Array.isArray(payload?.lastResult?.playlist)
            ? payload.lastResult.playlist
            : Array.isArray(payload?.result?.playlist)
              ? payload.result.playlist
              : [];

    return rawList.map((track: any, index: number) => ({
      id: String(track?.id ?? `smartdj-control-track-${index + 1}`),
      title: String(track?.title ?? track?.name ?? `SmartDJ Track ${index + 1}`),
      artist: String(track?.artist ?? track?.creator ?? "SmartDJ"),
      source: String(track?.source ?? "Tha Core SmartDJ"),
      reason: String(track?.reason ?? "Created by SmartDJ."),
      audioUrl: String(track?.audioUrl ?? track?.streamUrl ?? track?.url ?? ""),
      streamUrl: String(track?.streamUrl ?? ""),
      url: String(track?.url ?? ""),
      status: String(track?.status ?? ""),
      statusText: String(track?.statusText ?? ""),
      cleanStatus: String(track?.cleanStatus ?? ""),
      safetyStatus: String(track?.safetyStatus ?? ""),
      bleepJobStatus: String(track?.bleepJobStatus ?? ""),
      cleanAudioUrl: String(track?.cleanAudioUrl ?? ""),
      processedAudioUrl: String(track?.processedAudioUrl ?? ""),
      bleepedAudioUrl: String(track?.bleepedAudioUrl ?? ""),
      radioSafeAudioUrl: String(track?.radioSafeAudioUrl ?? ""),
      safeAudioUrl: String(track?.safeAudioUrl ?? ""),
      rawAudioBlocked: Boolean(track?.rawAudioBlocked),
      held: Boolean(track?.held),
      needsBleep: Boolean(track?.needsBleep),
      safetyNote: String(track?.safetyNote ?? ""),
    } as any));
  }

  function getTrackAudioUrl(track: SmartDjControlPlaylistTrack) {
    const item: any = track ?? {};
    return (
      item.safeAudioUrl ||
      item.radioSafeAudioUrl ||
      item.cleanAudioUrl ||
      item.bleepedAudioUrl ||
      item.processedAudioUrl ||
      track.audioUrl ||
      track.streamUrl ||
      track.url ||
      ""
    );
  }

  // SMARTDJ_DETECTOR_LIGHT_V1
  function getSmartDjDetectorState(track: SmartDjControlPlaylistTrack) {
    const item: any = track ?? {};

    const text = String(
      [
        item.status,
        item.statusText,
        item.cleanStatus,
        item.safetyStatus,
        item.bleepJobStatus,
        item.reason,
        item.safetyNote,
        item.action,
        item.message,
        item.decision,
      ]
        .filter(Boolean)
        .join(" ")
    ).toLowerCase();

    const hasCleanAudio = Boolean(
      item.safeAudioUrl ||
        item.radioSafeAudioUrl ||
        item.cleanAudioUrl ||
        item.bleepedAudioUrl ||
        item.processedAudioUrl ||
        text.includes("processed_audio_ready")
    );

    const secondScan =
      text.includes("second_scan") ||
      text.includes("no_explicit_cues") ||
      text.includes("second scan") ||
      text.includes("review");

    const processing =
      text.includes("processing") ||
      text.includes("transcrib") ||
      text.includes("local_whisper");

    if (hasCleanAudio) {
      return {
        label: "CLEAN READY",
        color: "#22c55e",
        flash: false,
      };
    }

    if (processing) {
      return {
        label: "SCANNING",
        color: "#38bdf8",
        flash: true,
      };
    }

    if (secondScan) {
      return {
        label: "SECOND SCAN",
        color: "#facc15",
        flash: true,
      };
    }

    if (isSmartDjTrackHeld(track)) {
      return {
        label: "HELD",
        color: "#ef4444",
        flash: true,
      };
    }

    return {
      label: "SCAN NEEDED",
      color: "#facc15",
      flash: true,
    };
  }


  async function attachReadyBleepJobsToSmartDjTracks(
    incomingTracks: SmartDjControlPlaylistTrack[]
  ): Promise<SmartDjControlPlaylistTrack[]> {
    try {
      const response = await fetch("/api/radio/bleep-job", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);
      const jobs = Array.isArray(data?.jobs) ? data.jobs : [];

      const readyJobs = jobs.filter((job: any) => {
        const statusText = String(
          `${job?.status ?? ""} ${job?.processorStatus ?? ""} ${job?.message ?? ""}`
        ).toUpperCase();

        const safeAudio =
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
          job?.track?.audioUrl ||
          job?.track?.url ||
          job?.track?.streamUrl ||
          "";

        return (
          Boolean(safeAudio) &&
          (statusText.includes("PROCESSED_AUDIO_READY") ||
            statusText.includes("PROCESSED_AUDIO_ATTACHED") ||
            statusText.includes("READY"))
        );
      });

      if (readyJobs.length === 0) return incomingTracks;

      return incomingTracks.map((track: any) => {
        const trackTitle = String(track?.title ?? "").trim().toLowerCase();

        const matchingJob = readyJobs.find((job: any) => {
          const jobTrackId = String(job?.track?.id ?? job?.trackId ?? "");
          const jobTitle = String(job?.track?.title ?? "").trim().toLowerCase();

          return (
            (track?.id && jobTrackId && jobTrackId === String(track.id)) ||
            (trackTitle && jobTitle && jobTitle === trackTitle)
          );
        });

        if (!matchingJob) return track;

        const safeAudio =
          matchingJob?.processedAudioUrl ||
          matchingJob?.bleepedAudioUrl ||
          matchingJob?.cleanAudioUrl ||
          matchingJob?.radioSafeAudioUrl ||
          matchingJob?.safeAudioUrl ||
          matchingJob?.track?.processedAudioUrl ||
          matchingJob?.track?.bleepedAudioUrl ||
          matchingJob?.track?.cleanAudioUrl ||
          matchingJob?.track?.radioSafeAudioUrl ||
          matchingJob?.track?.safeAudioUrl ||
          matchingJob?.track?.audioUrl ||
          matchingJob?.track?.url ||
          matchingJob?.track?.streamUrl ||
          "";

        if (!safeAudio) return track;

        return {
          ...track,
          audioUrl: safeAudio,
          url: safeAudio,
          streamUrl: safeAudio,
          cleanAudioUrl: safeAudio,
          bleepedAudioUrl: safeAudio,
          processedAudioUrl: safeAudio,
          radioSafeAudioUrl: safeAudio,
          safeAudioUrl: safeAudio,
          reason: "PROCESSED AUDIO READY - clean/bleeped copy attached.",
          statusText: "CLEAN/BLEEPED READY",
          action: "processed_audio_ready",
        } as SmartDjControlPlaylistTrack;
      });
    } catch {
      return incomingTracks;
    }
  }

  // OWNER_SYNC_READY_BLEEP_AUDIO_V1

  async function loadSmartDjPlaylist() {
    try {
      const response = await fetch(`/api/smartdj/command?refresh=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();
      const nextTracks = await attachReadyBleepJobsToSmartDjTracks(normalizeSmartDjTracks(data));

      setTracks(nextTracks);

      if (nextTracks.length > 0) {
        const heldCount = nextTracks.filter((track) =>
          String((track as any)?.action ?? (track as any)?.statusText ?? (track as any)?.reason ?? "")
            .toLowerCase()
            .includes("held")
        ).length;

        const loadedMessage = `SmartDJ playlist loaded: ${nextTracks.length} track(s).`;

        setStatus(`SmartDJ playlist loaded on control panel: ${nextTracks.length} track(s).`);
        window.dispatchEvent(new CustomEvent("tha-core-smartdj-status", { detail: loadedMessage }));
      } else {
        setStatus("No SmartDJ playlist created yet. Ask SmartDJ to build one.");
        window.dispatchEvent(new CustomEvent("tha-core-smartdj-status", { detail: "No SmartDJ playlist created yet. Ask SmartDJ to build one." }));
      }
    } catch {
      setStatus("Could not load SmartDJ playlist from command engine.");
    }
  }

  async function playSmartDjTrack(track: SmartDjControlPlaylistTrack) {
    try {
      if (isSmartDjTrackHeld(track)) {
        const blockedMessage = "PREVIEW BLOCKED - HELD until clean/bleep copy is ready.";
        setPlayingId("");
        setBleepStatusById((current) => ({
          ...current,
          [track.id]: blockedMessage,
        }));
        setStatus(blockedMessage);
        return;
      }
        if (isSmartDjTrackHeld(track)) {
          const heldMessage = "PREVIEW BLOCKED - HELD until clean/bleep copy is ready.";
          setBleepStatusById((current) => ({
            ...current,
            [track.id]: heldMessage,
          }));
          setStatus(heldMessage);
          return;
        }
      const audioUrl = getTrackAudioUrl(track);

      if (!audioUrl) {
        setStatus(
          `Preview failed: ${track.artist ?? "SmartDJ"} - ${track.title}. No audio URL attached.`
        );
        return;
      }

      setPlayingId(track.id);
      setStatus(`Preview loading: ${track.artist ?? "SmartDJ"} - ${track.title}`);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      const player = new Audio(audioUrl);
      audioRef.current = player;
      player.preload = "auto";
      player.volume = 1;

      player.onplaying = () => {
        setStatus(`Preview playing: ${track.artist ?? "SmartDJ"} - ${track.title}`);
      };

      player.onerror = () => {
        setPlayingId("");
        setStatus(`Preview failed: audio could not load for ${track.title}`);
      };

      player.onended = () => {
        setPlayingId("");
        setStatus(`Preview ended: ${track.title}`);
      };

      await player.play();
    } catch {
      setPlayingId("");
      setStatus("Preview blocked by browser or audio URL failed.");
    }
  }

  
  
  async function checkSmartDjTrackForBleep(track: SmartDjControlPlaylistTrack) {
      try {
        if (isSmartDjTrackHeld(track)) {
          const heldMessage = "HELD - needs clean/bleep copy before preview, queue, or broadcast.";
          setBleepStatusById((current) => ({
            ...current,
            [track.id]: heldMessage,
          }));
          setStatus(heldMessage);
          return;
        }
      setBleepStatusById((current) => ({
        ...current,
        [track.id]: "Checking track for explicit words...",
      }));

      const response = await fetch("/api/radio/bleep-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ track }),
      });

      const data = await response.json();

      const nextStatus = data?.message || "Bleep check finished.";

      setBleepStatusById((current) => ({
        ...current,
        [track.id]: nextStatus,
      }));

      setStatus(nextStatus);
    } catch {
      setBleepStatusById((current) => ({
        ...current,
        [track.id]: "Bleep check failed. Hold before broadcast.",
      }));

      setStatus("Bleep check failed. Hold before broadcast.");
    }
  }

  
  async function runGlobalSafeActionGate(payload: {
    source: string;
    action: string;
    track?: any;
    text?: string;
    requireClean?: boolean;
  }) {
    try {
      const response = await fetch("/api/radio/safe-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          source: payload.source,
          action: payload.action,
          mode: "pre_broadcast",
          requireClean: payload.requireClean !== false,
          track: payload.track,
          text: payload.text,
        }),
      });

      const data = await response.json();

      if (!data?.allowed) {
        const message =
          data?.message ||
          "BLEEP JOB CREATED - clean/bleeped copy required before broadcast.";
        setStatus(message);
      setStatus(message);
return {
          allowed: false,
          message,
          data,
        };
      }

      const message =
        data?.message || "Passed global radio bleep check. Action allowed.";
      setStatus(message);
return {
        allowed: true,
        message,
        data,
      };
    } catch {
      const message = "Global bleep gate failed. Action held before broadcast.";
        setStatus(message);
      setStatus(message);
return {
        allowed: false,
        message,
        data: null,
      };
    }
  }

  async function sendSmartDjTrackToQueue(track: SmartDjControlPlaylistTrack) {
      try {
        if (isSmartDjTrackHeld(track)) {
          const heldMessage = "QUEUE BLOCKED - HELD until clean/bleep copy is ready.";
          setQueueStatusById((current) => ({
            ...current,
            [track.id]: heldMessage,
          }));
          setStatus(heldMessage);
          return;
        }
      const checkingStatus = "SmartDJ running Global Bleep Gate before queue...";

      setQueueStatusById((current) => ({
        ...current,
        [track.id]: checkingStatus,
      }));

      setBleepStatusById((current) => ({
        ...current,
        [track.id]: checkingStatus,
      }));

      const safeResponse = await fetch("/api/radio/safe-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          source: "SMARTDJ",
          action: "smartdj_send_to_queue",
          mode: "pre_broadcast",
          requireClean: true,
          track,
          text: `${track.artist ?? "SmartDJ"} ${track.title ?? ""} ${track.source ?? ""}`,
        }),
      });

      const safeData = await safeResponse.json();

      const safeMessage =
        safeData?.message ||
        "Global Bleep Gate check finished.";

      setBleepStatusById((current) => ({
        ...current,
        [track.id]: safeMessage,
      }));

      if (!safeData?.allowed) {
        const holdStatus =
          safeMessage ||
          "BLEEP JOB CREATED - clean/bleeped copy required before SmartDJ queue.";

        setQueueStatusById((current) => ({
          ...current,
          [track.id]: holdStatus,
        }));

        setStatus(holdStatus);
        return;
      }

      const response = await fetch("/api/smartdj/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          track: {
            ...track,
            isExplicit: false,
            explicitWords: [],
          },
        }),
      });

      const data = await response.json();

      const queueMessage =
        data?.item?.queueStatus ||
        data?.message ||
        "Track sent to SmartDJ queue.";

      const finalStatus = `Passed Global Bleep Gate. ${queueMessage}`;

      setQueueStatusById((current) => ({
        ...current,
        [track.id]: finalStatus,
      }));

      setStatus(finalStatus);
    } catch {
      const failStatus =
        "SmartDJ queue blocked. Global Bleep Gate failed before queue.";

      setQueueStatusById((current) => ({
        ...current,
        [track.id]: failStatus,
      }));

      setBleepStatusById((current) => ({
        ...current,
        [track.id]: failStatus,
      }));

      setStatus(failStatus);
    }
  }

  async function fixHeldSmartDjTrack(track: any) {
    const startMessage = "FIX HELD - clean/bleep job requested. Track stays blocked until safe audio is ready.";

    setBleepStatusById((current) => ({
      ...current,
      [track.id]: startMessage,
    }));

    setQueueStatusById((current) => ({
      ...current,
      [track.id]: "QUEUE BLOCKED - waiting for clean/bleep copy.",
    }));

    setStatus(startMessage);

    try {
      const response = await fetch("/api/radio/bleep-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          source: "SMARTDJ",
          action: "create_bleep_job",
          track,
          text: `${track?.artist ?? "SmartDJ"} ${track?.title ?? ""}`,
        }),
      });

      const data = await response.json().catch(() => null);

      const nextMessage =
        data?.message ||
        data?.statusText ||
        data?.reply ||
        "FIX HELD - bleep/clean job saved. Waiting for processed clean/bleeped audio.";

      setBleepStatusById((current) => ({
        ...current,
        [track.id]: nextMessage,
      }));

      setQueueStatusById((current) => ({
        ...current,
        [track.id]: "QUEUE BLOCKED - clean/bleep copy still required before queue.",
      }));

      setStatus(nextMessage);
    } catch {
      const failMessage = "FIX HELD failed. Could not reach bleep-job route.";

      setBleepStatusById((current) => ({
        ...current,
        [track.id]: failMessage,
      }));

      setStatus(failMessage);
    }
  }

    // SMARTDJ_FIX_HELD_BUTTON_V2
  // SMARTDJ_ONE_MASTER_PLAYLIST_CONTROL_V2
  async function smartDjPlaylistMasterControl() {
    if (!tracks.length) {
      setStatus("No SmartDJ playlist tracks loaded.");
      return;
    }

    setStatus("SmartDJ auto clean + return running...");

    try {
      const response = await fetch("/api/radio/smartdj-auto-clean", {
        method: "POST",
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      await loadSmartDjPlaylist();

      const message =
        data?.message ||
        "SmartDJ auto clean + return complete. HELD tracks stay blocked until clean/bleeped audio is ready.";

      setStatus(message);

      window.dispatchEvent(
        new CustomEvent("tha-core-smartdj-status", {
          detail: message,
        })
      );
    } catch {
      setStatus("SmartDJ auto clean + return failed. No unsafe track was released.");
    }
  }



  async function refreshSmartDjPlaylistButton() {
    setStatus("Refreshing SmartDJ playlist from command engine...");
    setBleepStatusById({});
    setQueueStatusById({});

    await loadSmartDjPlaylist();

    setStatus("SmartDJ playlist refresh complete.");
  }

  // SMARTDJ_REFRESH_BUTTON_WIRED_V1

  function stopSmartDjTrack() {
    const player = audioRef.current;

    if (player) {
      player.pause();
      player.currentTime = 0;
      player.src = "";
      player.load();
    }

    audioRef.current = null;
    setPlayingId("");
    setStatus("SmartDJ preview stopped.");
  }

  return (
    <section className="owner-control-smartdj-playlist panel">
      <audio ref={audioRef} preload="none" />
      <style jsx>{`
        @keyframes smartDjDetectorBlink {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
            box-shadow: 0 0 14px currentColor;
          }
          50% {
            opacity: 0.35;
            transform: scale(0.96);
            box-shadow: 0 0 4px currentColor;
          }
        }
      `}</style>

      <div className="owner-control-smartdj-playlist-head">
        <div>
          <strong>SMARTDJ CREATED PLAYLIST</strong>
          <span>Playlist created by SmartDJ will show here and play from control panel.</span>
        </div>

        <div className="owner-control-smartdj-playlist-actions">
          <button type="button" onClick={refreshSmartDjPlaylistButton}>
            REFRESH STATUS
          </button>
          <button type="button" onClick={stopSmartDjTrack}>
            STOP
          </button>
        </div>
      </div>

      {tracks.length > 0 ? (
        <div className="owner-control-smartdj-playlist-list">
          {tracks.map((track, index) => {
            const isPlaying = playingId === track.id;
                  const isHeldTrack = isSmartDjTrackHeld(track);

            return (
              <div
                key={`${track.id}-${index}`}
                className={`owner-control-smartdj-playlist-row ${
                  isPlaying ? "is-playing" : ""
                }`}
              >
                <div className="owner-control-smartdj-playlist-info">
                  <b>
                    {index + 1}. {track.artist ?? "SmartDJ"} - {track.title}
                  </b>
                  <small>{track.source ?? "Tha Core SmartDJ"}</small>
                  {(() => {
                    const detector = getSmartDjDetectorState(track);

                    return (
                      <span
                        title="SmartDJ clean/bleep detector"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "7px",
                          marginTop: "7px",
                          width: "fit-content",
                          borderRadius: "999px",
                          border: `1px solid ${detector.color}`,
                          color: detector.color,
                          padding: "5px 10px",
                          fontSize: "11px",
                          fontWeight: 1000,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          background: "rgba(0,0,0,0.55)",
                        }}
                      >
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "999px",
                            background: detector.color,
                            color: detector.color,
                            display: "inline-block",
                            animation: detector.flash
                              ? "smartDjDetectorBlink 0.75s infinite"
                              : "none",
                          }}
                        />
                        {detector.label}
                      </span>
                    );
                  })()}
                </div>

                <div className="owner-control-smartdj-row-actions">
                  <button type="button" onClick={() => playSmartDjTrack(track)}>{isHeldTrack ? "PREVIEW BLOCKED" : isPlaying ? "PREVIEWING" : "PREVIEW"}</button>

                  <button type="button" onClick={() => checkSmartDjTrackForBleep(track)}>
                    BLEEP CHECK
                  </button>
                  {isHeldTrack && (
                    <button type="button" onClick={() => fixHeldSmartDjTrack(track)}>
                      FIX HELD
                    </button>
                  )}

                  <button type="button" onClick={() => sendSmartDjTrackToQueue(track)}>{isHeldTrack ? "QUEUE BLOCKED" : "SEND TO QUEUE"}</button>
                </div>

              {(bleepStatusById[track.id] || queueStatusById[track.id]) && (
                <div className="smartdj-row-status">
                  {bleepStatusById[track.id] && (
                    <div>BLEEP CHECK: {bleepStatusById[track.id]}</div>
                  )}
                  {queueStatusById[track.id] && (
                    <div>QUEUE: {queueStatusById[track.id]}</div>
                  )}
                </div>
              )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="owner-control-smartdj-empty">
          No playlist yet. Type a SmartDJ command below and press ASK SMARTDJ.
        </p>
      )}

      <p className="owner-control-smartdj-player-status">{status}</p>
    </section>
  );
}
function isSmartDjTrackHeld(track: SmartDjControlPlaylistTrack) {
  const item: any = track ?? {};

  const hasSafeAudio = Boolean(
    item.cleanAudioUrl ||
      item.bleepedAudioUrl ||
      item.processedAudioUrl ||
      item.radioSafeAudioUrl
  );

  if (hasSafeAudio) return false;

  const hasAnyAudio = Boolean(
    item.audioUrl ||
      item.url ||
      item.streamUrl ||
      item.rawUrl ||
      item.cleanAudioUrl ||
      item.bleepedAudioUrl ||
      item.processedAudioUrl ||
      item.radioSafeAudioUrl
  );

  const text = [
    item.id,
    item.title,
    item.artist,
    item.source,
    item.reason,
    item.statusText,
    item.action,
    item.message,
    item.decision,
    item.safetyStatus,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    !hasAnyAudio ||
    text.includes("held") ||
    text.includes("hold_dirty_audio") ||
    text.includes("needs clean") ||
    text.includes("clean/bleep") ||
    text.includes("no clean") ||
    text.includes("no audio") ||
    text.includes("dirty") ||
    text.includes("raw") ||
    text.includes("explicit") ||
    text.includes("unverified")
  );
}
// SMARTDJ_HELD_ROW_BUTTON_TRUTH_V1



function cleanSmartDjTopStatusText(text: string) {
  return String(text || "")
    .replace(/\.?\s*\d+\s+HELD waiting on clean\/bleep copy\.?/gi, ".")
    .replace(/\s+\./g, ".")
    .trim();
}

// SMARTDJ_RENDER_STRIP_HELD_TEXT_V1


function AiHostScriptPanel() {
  async function handleGenerateAiHostScript(event: any) {
    event.preventDefault();

    const form = event.currentTarget as HTMLFormElement;
    const fields = form.elements as any;
    const status = document.getElementById("ai-host-script-status");
    const output = document.getElementById("ai-host-script-output") as HTMLTextAreaElement | null;
    const button = form.querySelector("button[type='submit']") as HTMLButtonElement | null;

    if (status) status.textContent = "GENERATING_SCRIPT...";
    if (button) button.disabled = true;
    if (output) output.value = "";

    try {
      const payload = {
        hostName: fields.hostName?.value || "Tha Core AI Host",
        segmentType: fields.segmentType?.value || "general-talk",
        topic: fields.topic?.value || "Tha Core Radio clean music link",
        vibe: fields.vibe?.value || "warm Jamaican radio energy, professional, clean, confident",
        lane: fields.lane?.value || "current clean rotation",
        durationSeconds: Number(fields.durationSeconds?.value || 25),
        sponsorName: fields.sponsorName?.value || "",
        callToAction: fields.callToAction?.value || "Keep it locked to Tha Core Online Radio.",
        extraNotes: fields.extraNotes?.value || "",
      };

      const res = await fetch("/api/radio/ai-host-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (status) status.textContent = data?.error || "SCRIPT_GENERATION_FAILED";
        if (output) output.value = data?.message || data?.detail || "Script generation failed.";
        return;
      }

      if (status) {
        status.textContent = data.safety + " | " + data.estimatedSeconds + " sec | voice next phase";
      }

      if (output) {
        output.value = data.script || "";
      }
    } catch (err: any) {
      if (status) status.textContent = "SCRIPT_GENERATION_ERROR";
      if (output) output.value = err?.message || "Unknown script generation error.";
    } finally {
      if (button) button.disabled = false;
    }
  }

  function handleCopyAiHostScript() {
    const output = document.getElementById("ai-host-script-output") as HTMLTextAreaElement | null;
    const status = document.getElementById("ai-host-script-status");

    if (!output?.value) {
      if (status) status.textContent = "NO_SCRIPT_TO_COPY";
      return;
    }

    navigator.clipboard?.writeText(output.value);
    if (status) status.textContent = "SCRIPT_COPIED_FOR_APPROVAL";
  }

  return (
    <section
      data-ai-host-script-panel="AI_HOST_SCRIPT_PANEL_V1"
      style={{
        border: "1px solid rgba(255, 215, 0, 0.35)",
        borderRadius: 16,
        padding: 16,
        margin: "16px 0",
        background: "linear-gradient(135deg, rgba(20,0,0,0.94), rgba(0,0,0,0.94))",
        color: "#fff",
        boxShadow: "0 0 24px rgba(255,0,0,0.18)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, color: "#ffd700", fontSize: 22 }}>OpenAI AI Host — Script Generator</h2>
          <p style={{ margin: "6px 0 0", opacity: 0.82 }}>
            Phase 1: generate clean radio-ready scripts first. Voice/audio comes next after approval.
          </p>
        </div>
        <div
          id="ai-host-script-status"
          style={{
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 12,
            color: "#9cff9c",
            background: "rgba(0,0,0,0.55)",
          }}
        >
          SCRIPT_READY_IDLE
        </div>
      </div>

      <form onSubmit={handleGenerateAiHostScript} style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <label>
            Host
            <input name="hostName" defaultValue="Tha Core AI Host" style={{ width: "100%", padding: 10, borderRadius: 10 }} />
          </label>

          <label>
            Segment
            <select name="segmentType" defaultValue="song-intro" style={{ width: "100%", padding: 10, borderRadius: 10 }}>
              <option value="station-id">Station ID</option>
              <option value="song-intro">Song Intro</option>
              <option value="song-outro">Song Outro</option>
              <option value="jingle-link">Jingle Link</option>
              <option value="promo">Promo</option>
              <option value="sponsor-read">Sponsor Read</option>
              <option value="schedule-tease">Schedule Tease</option>
              <option value="community-message">Community Message</option>
              <option value="general-talk">General Talk</option>
            </select>
          </label>

          <label>
            Lane / Folder
            <input name="lane" defaultValue="current clean rotation" style={{ width: "100%", padding: 10, borderRadius: 10 }} />
          </label>

          <label>
            Seconds
            <input name="durationSeconds" type="number" min="8" max="90" defaultValue="25" style={{ width: "100%", padding: 10, borderRadius: 10 }} />
          </label>
        </div>

        <label>
          Topic
          <input
            name="topic"
            defaultValue="Big up the listeners and introduce the next clean music run"
            style={{ width: "100%", padding: 10, borderRadius: 10 }}
          />
        </label>

        <label>
          Vibe
          <input
            name="vibe"
            defaultValue="warm Jamaican radio energy, professional, clean, confident"
            style={{ width: "100%", padding: 10, borderRadius: 10 }}
          />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <label>
            Sponsor name
            <input name="sponsorName" placeholder="optional" style={{ width: "100%", padding: 10, borderRadius: 10 }} />
          </label>

          <label>
            Call to action
            <input
              name="callToAction"
              defaultValue="Keep it locked to Tha Core Online Radio."
              style={{ width: "100%", padding: 10, borderRadius: 10 }}
            />
          </label>
        </div>

        <label>
          Extra notes
          <textarea
            name="extraNotes"
            placeholder="Optional details: event, show name, sponsor wording, song title, clean warning, etc."
            style={{ width: "100%", minHeight: 70, padding: 10, borderRadius: 10 }}
          />
        </label>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="submit"
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,215,0,0.5)",
              background: "#ffd700",
              color: "#111",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Generate Clean Script
          </button>

          <button
            type="button"
            onClick={handleCopyAiHostScript}
            style={{
              padding: "10px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.25)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Copy Approved Script
          </button>
        </div>

        <label>
          Generated script
          <textarea
            id="ai-host-script-output"
            readOnly
            placeholder="Generated AI host script will appear here..."
            style={{
              width: "100%",
              minHeight: 170,
              padding: 12,
              borderRadius: 12,
              background: "rgba(255,255,255,0.96)",
              color: "#111",
              fontSize: 15,
              lineHeight: 1.45,
            }}
          />
        </label>
      </form>
    </section>
  );
}

export default function OwnerControlPanelPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const overlayAudioRef = useRef<HTMLAudioElement | null>(null);

  const [broadcast, setBroadcast] = useState<BroadcastState>("off");
  const [selectedMode, setSelectedMode] = useState<PadMode>("JINGLES");
  const [smartDjCommandText, setSmartDjCommandText] = useState("find and play mothers day song");
  const [smartDjCommandResult, setSmartDjCommandResult] = useState("SmartDJ command ready.");


  function isSmartDjTopTrackStillHeld(track: any, readyJobs: any[] = []) {
    const item: any = track ?? {};

    const hasSafeAudio = Boolean(
      item.safeAudioUrl ||
      item.radioSafeAudioUrl ||
      item.cleanAudioUrl ||
      item.bleepedAudioUrl ||
      item.processedAudioUrl ||
      item.audioUrl ||
      item.url ||
      item.streamUrl
    );

    const heldText = String(
      item.action ?? item.statusText ?? item.reason ?? ""
    ).toLowerCase();

    const trackId = String(item.id ?? "").trim().toLowerCase();
    const title = String(item.title ?? "").trim().toLowerCase();

    const hasReadyBleepJob = readyJobs.some((job: any) => {
      const jobTrack: any = job?.track ?? {};
      const jobText = String(
        `${job?.status ?? ""} ${job?.processorStatus ?? ""} ${job?.message ?? ""}`
      ).toLowerCase();

      const jobHasAudio = Boolean(
        job?.safeAudioUrl ||
        job?.radioSafeAudioUrl ||
        job?.cleanAudioUrl ||
        job?.bleepedAudioUrl ||
        job?.processedAudioUrl ||
        jobTrack?.safeAudioUrl ||
        jobTrack?.radioSafeAudioUrl ||
        jobTrack?.cleanAudioUrl ||
        jobTrack?.bleepedAudioUrl ||
        jobTrack?.processedAudioUrl ||
        jobTrack?.audioUrl ||
        jobTrack?.url ||
        jobTrack?.streamUrl
      );

      const jobTrackId = String(jobTrack?.id ?? "").trim().toLowerCase();
      const jobTitle = String(jobTrack?.title ?? "").trim().toLowerCase();

      const matchesTrack =
        (trackId && jobTrackId && trackId === jobTrackId) ||
        (title && jobTitle && title === jobTitle);

      const ready =
        jobText.includes("processed_audio_ready") ||
        jobText.includes("processed_audio_attached") ||
        jobText.includes("ready");

      return matchesTrack && ready && jobHasAudio;
    });

    return heldText.includes("held") && !hasSafeAudio && !hasReadyBleepJob;
  }

  // SMARTDJ_TOP_STALE_HELD_FIX_V1

  // SMARTDJ_TOP_FORCE_SYNC_V2
  useEffect(() => {
    let alive = true;

    async function forceSyncSmartDjTopStatus() {
      try {
        const response = await fetch(`/api/smartdj/command?refresh=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json().catch(() => null);

        if (!alive || !response.ok || !data) return;

        const playlist = Array.isArray(data.playlist)
          ? data.playlist
          : Array.isArray(data.lastPlaylist)
            ? data.lastPlaylist
            : [];

        if (playlist.length > 0) {
          const readyJobsResponse = await fetch(`/api/radio/bleep-job?topStatus=${Date.now()}`, {
          cache: "no-store",
        }).catch(() => null);

        const readyJobsData = readyJobsResponse
          ? await readyJobsResponse.json().catch(() => null)
          : null;

        const readyJobs = Array.isArray(readyJobsData?.jobs)
          ? readyJobsData.jobs
          : [];

        const heldCount = playlist.filter((track: any) =>
          isSmartDjTopTrackStillHeld(track, readyJobs)
        ).length;

          setSmartDjCommandResult(`SmartDJ playlist loaded: ${playlist.length} track(s).`);
          return;
        }

        const fallbackMessage = String(
          data?.statusText ||
            data?.message ||
            "No SmartDJ playlist created yet. Ask SmartDJ to build one."
        );

        if (
          fallbackMessage &&
          !fallbackMessage.toLowerCase().includes("returned 0 result")
        ) {
          setSmartDjCommandResult(fallbackMessage.replace(/\. \d+ HELD waiting on clean\/bleep copy\.$/, "."));
        }
      } catch {
        // Keep the last good message. Do not replace it with a false 0-result message.
      }
    }

    forceSyncSmartDjTopStatus();
    const timer = window.setInterval(forceSyncSmartDjTopStatus, 1500);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function cleanSmartDjTopHeldStatus() {
      try {
        const [smartResponse, jobsResponse] = await Promise.all([
          fetch(`/api/smartdj/command?topClean=${Date.now()}`, {
            cache: "no-store",
          }),
          fetch(`/api/radio/bleep-job?topClean=${Date.now()}`, {
            cache: "no-store",
          }),
        ]);

        const smartData = await smartResponse.json().catch(() => null);
        const jobsData = await jobsResponse.json().catch(() => null);

        if (!alive || !smartData) return;

        const playlist = Array.isArray(smartData?.playlist)
          ? smartData.playlist
          : Array.isArray(smartData?.lastPlaylist)
            ? smartData.lastPlaylist
            : Array.isArray(smartData?.lastResult?.playlist)
              ? smartData.lastResult.playlist
              : [];

        if (!playlist.length) return;

        const jobs = Array.isArray(jobsData?.jobs) ? jobsData.jobs : [];

        const readyJobs = jobs.filter((job: any) => {
          const jobTrack: any = job?.track ?? {};
          const text = String(
            `${job?.status ?? ""} ${job?.processorStatus ?? ""} ${job?.message ?? ""}`
          ).toLowerCase();

          const hasAudio = Boolean(
            job?.safeAudioUrl ||
            job?.radioSafeAudioUrl ||
            job?.cleanAudioUrl ||
            job?.bleepedAudioUrl ||
            job?.processedAudioUrl ||
            jobTrack?.safeAudioUrl ||
            jobTrack?.radioSafeAudioUrl ||
            jobTrack?.cleanAudioUrl ||
            jobTrack?.bleepedAudioUrl ||
            jobTrack?.processedAudioUrl ||
            jobTrack?.audioUrl ||
            jobTrack?.url ||
            jobTrack?.streamUrl
          );

          return hasAudio && (
            text.includes("processed_audio_ready") ||
            text.includes("processed_audio_attached") ||
            text.includes("ready")
          );
        });

        const stillHeldCount = playlist.filter((track: any) => {
          const trackText = String(
            `${track?.action ?? ""} ${track?.statusText ?? ""} ${track?.reason ?? ""}`
          ).toLowerCase();

          if (!trackText.includes("held")) return false;

          const hasTrackAudio = Boolean(
            track?.safeAudioUrl ||
            track?.radioSafeAudioUrl ||
            track?.cleanAudioUrl ||
            track?.bleepedAudioUrl ||
            track?.processedAudioUrl ||
            track?.audioUrl ||
            track?.url ||
            track?.streamUrl
          );

          if (hasTrackAudio) return false;

          const trackId = String(track?.id ?? "").trim().toLowerCase();
          const title = String(track?.title ?? "").trim().toLowerCase();

          const hasMatchingReadyJob = readyJobs.some((job: any) => {
            const jobTrack: any = job?.track ?? {};
            const jobTrackId = String(jobTrack?.id ?? "").trim().toLowerCase();
            const jobTitle = String(jobTrack?.title ?? "").trim().toLowerCase();

            return (
              (trackId && jobTrackId && trackId === jobTrackId) ||
              (title && jobTitle && title === jobTitle)
            );
          });

          return !hasMatchingReadyJob;
        }).length;

        setSmartDjCommandResult(`SmartDJ playlist loaded: ${playlist.length} track(s).`);
      } catch {
        // Keep existing status if cleaner cannot check.
      }
    }

    cleanSmartDjTopHeldStatus();

    const timer = window.setInterval(cleanSmartDjTopHeldStatus, 2500);

    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  // SMARTDJ_TOP_STATUS_READY_CLEANER_V2

const SELECTED_DISPLAY_MEMORY_KEY = "tha-core-owner-selected-display-v1";

  useEffect(() => {
    try {
      const savedDisplay = window.localStorage.getItem(SELECTED_DISPLAY_MEMORY_KEY);

      if (
        savedDisplay === "JINGLES" ||
        savedDisplay === "DROPS" ||
        savedDisplay === "COM" ||
        savedDisplay === "ADS" ||
        savedDisplay === "SMARTDJ" ||
        savedDisplay === "AUTODJ" ||
        savedDisplay === "LIVEDJ"
      ) {
        setSelectedMode(savedDisplay);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SELECTED_DISPLAY_MEMORY_KEY, selectedMode);
    } catch {
      // ignore storage errors
    }
  }, [selectedMode]);

  const [autoDj, setAutoDj] = useState(true);
  const [smartDj, setSmartDj] = useState(false);
  const [liveDj, setLiveDj] = useState(false);

  const DJ_MODE_MEMORY_KEY = "tha-core-owner-dj-mode-v1";

  useEffect(() => {
    try {
      const savedMode = window.localStorage.getItem(DJ_MODE_MEMORY_KEY);

      if (savedMode === "AUTODJ") {
        setAutoDj(true);
        setSmartDj(false);
        setLiveDj(false);
        setSelectedMode("AUTODJ");
      }

      if (savedMode === "SMARTDJ") {
        setAutoDj(false);
        setSmartDj(true);
        setLiveDj(false);
        setSelectedMode("SMARTDJ");
      }

      if (savedMode === "LIVEDJ") {
        setAutoDj(false);
        setSmartDj(false);
        setLiveDj(true);
        setSelectedMode("LIVEDJ");
      }
    } catch {
      // Ignore browser storage errors.
    }
  }, []);

  useEffect(() => {
    try {
      const currentMode = smartDj ? "SMARTDJ" : liveDj ? "LIVEDJ" : "AUTODJ";
      window.localStorage.setItem(DJ_MODE_MEMORY_KEY, currentMode);
    } catch {
      // Ignore browser storage errors.
    }
  }, [autoDj, smartDj, liveDj]);
  const [micLive, setMicLive] = useState(false);
  const [monitorOn, setMonitorOn] = useState(true);

  const [screenTitle, setScreenTitle] = useState("STUDIO READY");
  const [screenText, setScreenText] = useState(
    "Control panel ready. Now Playing auto-updates. Jingles, drops, commercials, and ads are wired to the broadcast pad bridge."
  );

  const [nowPlayingText, setNowPlayingText] = useState("Loading current song...");
  const [listenerText, setListenerText] = useState("Checking listeners...");
  const [stationText, setStationText] = useState("Tha Core Online Radio");
  const [lastUpdatedText, setLastUpdatedText] = useState("Auto refresh active");

  const [volume, setVolume] = useState(72);
  const [monitorVol, setMonitorVol] = useState(65);
  const [micGain, setMicGain] = useState(45);
  const [musicGain, setMusicGain] = useState(70);
  const [tempo, setTempo] = useState(50);
  const [bass, setBass] = useState(64);
  const [mid, setMid] = useState(58);
  const [high, setHigh] = useState(61);
  const [reverb, setReverb] = useState(20);
  const [delay, setDelay] = useState(12);
  const [echo, setEcho] = useState(18);
  const [crossfade, setCrossfade] = useState(50);
  const [deckAGain, setDeckAGain] = useState(72);
  const [deckBGain, setDeckBGain] = useState(72);
  const [adBed, setAdBed] = useState(38);
  const [jingleBed, setJingleBed] = useState(48);


  useEffect(() => {
    function getSafetyQueueAudioUrl(item: any) {
      const track = item?.track ?? item ?? {};

      return (
        track.safeAudioUrl ||
        track.radioSafeAudioUrl ||
        track.cleanAudioUrl ||
        track.bleepedAudioUrl ||
        track.processedAudioUrl ||
        track.audioUrl ||
        track.url ||
        track.streamUrl ||
        ""
      );
    }

    async function handleSafetyQueueBroadcast(event: Event) {
      const detail = (event as CustomEvent<any>).detail ?? {};
      const item = detail.item ?? {};
      const track = detail.track ?? item.track ?? {};
      const audioUrl = detail.audioUrl || getSafetyQueueAudioUrl(item);
      const title = track?.title || item?.track?.title || "approved safety queue track";
      const artist = track?.artist || item?.track?.artist || item?.source || "SmartDJ";

      if (!audioUrl) {
        setScreenTitle("BROADCAST HANDOFF BLOCKED");
        setScreenText("Approved queue item has no clean/bleeped audio URL.");
        addLog("Broadcast handoff blocked: missing clean/bleeped audio URL.");
        return;
      }

      try {
        const audio = audioRef.current;

        if (!audio) {
          setScreenTitle("BROADCAST HANDOFF ERROR");
          setScreenText("Main broadcast audio monitor is not ready.");
          addLog("Broadcast handoff failed: main audioRef not ready.");
          return;
        }

        audio.pause();
        audio.src = audioUrl;
        audio.preload = "auto";
        audio.volume = volume / 100;
        audio.muted = !monitorOn;

        setAutoDj(false);
        setSmartDj(true);
        setLiveDj(false);
        setMicLive(false);
        setSelectedMode("SMARTDJ");
        setBroadcast("live");

        setScreenTitle("SMARTDJ QUEUE LIVE");
        setScreenText(`${artist} - ${title} loaded from approved Audio Safety Center queue.`);
        addLog(`Approved safety queue handoff loaded: ${artist} - ${title}.`);

        await audio.play();

        setScreenTitle("SMARTDJ BROADCASTING");
        setScreenText(`${artist} - ${title} is playing from approved clean/bleeped queue audio.`);
        addLog(`Broadcast handoff playing: ${artist} - ${title}.`);
      } catch {
        setBroadcast("cue");
        setScreenTitle("BROADCAST HANDOFF CUED");
        setScreenText("Browser blocked autoplay. Press main Play / Pause to start the approved queue audio.");
        addLog("Broadcast handoff cued. User gesture needed to play.");
      }
    }

    window.addEventListener(
      "tha-core-safety-queue-broadcast",
      handleSafetyQueueBroadcast as EventListener
    );

    return () => {
      window.removeEventListener(
        "tha-core-safety-queue-broadcast",
        handleSafetyQueueBroadcast as EventListener
      );
    };
  }, [volume, monitorOn]);

  // OWNER_RECEIVE_SAFETY_QUEUE_BROADCAST_V1

  useEffect(() => {
    function handleSafetyQueueStopPlayback() {
      stopBroadcast();
    }

    window.addEventListener(
      "tha-core-safety-queue-stop-playback",
      handleSafetyQueueStopPlayback as EventListener
    );

    return () => {
      window.removeEventListener(
        "tha-core-safety-queue-stop-playback",
        handleSafetyQueueStopPlayback as EventListener
      );
    };
  }, []);

  // OWNER_RECEIVE_SAFETY_QUEUE_STOP_PLAYBACK_V1

  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: 1,
      time: "Now",
      message: "Latest studio panel loaded with auto now-playing and filled deck controls.",
    },
  ]);

  const isLive = broadcast === "live";
  const isCue = broadcast === "cue";
  const visiblePads = pads.filter((pad) => pad.mode === selectedMode);
  const currentDjMode: DjMode = smartDj ? "SMARTDJ" : liveDj ? "LIVEDJ" : "AUTODJ";
  const activeOwnerPanel =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("panel") || "main"
      : "main";
  const showCleanBleepPanel = activeOwnerPanel === "smartzj-clean-bleep";
  const showAudioSafetyPanel = activeOwnerPanel === "audio-safety";
  const showSongRequestsPanel = activeOwnerPanel === "song-requests";

  const broadcastLabel = useMemo(() => {
    if (broadcast === "live" && liveDj) return "LIVE DJ ON AIR";
    if (broadcast === "live" && smartDj) return "SMARTDJ BROADCASTING";
    if (broadcast === "live" && autoDj) return "AUTODJ BROADCASTING";
    if (broadcast === "live") return "BROADCAST LIVE";
    if (broadcast === "paused") return "BROADCAST PAUSED";
    if (broadcast === "cue") return "BROADCAST CUED";
    return "OFF AIR";
  }, [broadcast, liveDj, smartDj, autoDj]);

  function stamp() {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function addLog(message: string) {
    setLogs((current) => [
      { id: Date.now() + Math.floor(Math.random() * 1000000), time: stamp(), message },
      ...current.slice(0, 5),
    ]);
  }

  function getPadSlug(label: string) {
    return label
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getPad(label: string) {
    return pads.find((pad) => pad.label === label) || pads[0];
  }

  function setMainVolume(value: number) {
    setVolume(value);

    if (audioRef.current) {
      audioRef.current.volume = value / 100;
    }
  }

  function setDjMode(mode: DjMode) {
    const nextAutoDj = mode === "AUTODJ";
    const nextSmartDj = mode === "SMARTDJ";
    const nextLiveDj = mode === "LIVEDJ";

    setAutoDj(nextAutoDj);
    setSmartDj(nextSmartDj);
    setLiveDj(nextLiveDj);
    setMicLive(nextLiveDj);
    setSelectedMode(mode);

    setScreenTitle(`${mode} ACTIVE`);

    if (mode === "AUTODJ") {
      setScreenText("AutoDJ is active. Playlist flow and automatic rotation are selected.");
      addLog("All-in-one smart switch changed to AutoDJ.");
    }

    if (mode === "SMARTDJ") {
      setScreenText("SmartDJ is active. Smart jingles, drops, ads, and talk timing are selected.");
      addLog("All-in-one smart switch changed to SmartDJ.");
    }

    if (mode === "LIVEDJ") {
      setScreenText("LiveDJ is active. Manual DJ control and mic channel are armed.");
      addLog("All-in-one smart switch changed to LiveDJ.");
    }
  }

  async function callRadioAction(action: "skip" | "restart" | "start" | "stop") {
    setScreenTitle(`${action.toUpperCase()} SENT`);
    setScreenText(`Sending ${action} command to radio backend...`);
    addLog(`${action.toUpperCase()} command sending.`);

    try {
      const response = await fetch("/api/radio/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setScreenTitle(`${action.toUpperCase()} FAILED`);
        setScreenText(data?.error || `Could not complete ${action}. Check AzuraCast settings.`);
        addLog(`${action.toUpperCase()} failed.`);
        return;
      }

      setScreenTitle(`${action.toUpperCase()} COMPLETE`);
      setScreenText(data?.message || `${action} command completed.`);
      addLog(`${action.toUpperCase()} completed.`);
      refreshNowPlaying();
    } catch {
      setScreenTitle(`${action.toUpperCase()} ERROR`);
      setScreenText("Could not reach the radio action API route.");
      addLog(`${action.toUpperCase()} API error.`);
    }
  }

  async function sendPadToBroadcast(pad: Pad) {
    const slug = getPadSlug(pad.label);

    setScreenTitle(`${pad.mode} SENDING`);
    setScreenText(`Sending ${pad.label} to AzuraCast broadcast queue...`);
    addLog(`Sending ${pad.label} to broadcast.`);

    try {
      const response = await fetch("/api/radio/pad", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setScreenTitle(`${pad.mode} NOT LIVE YET`);
        setScreenText(data?.error || `${pad.label} is not mapped to AzuraCast yet.`);
        addLog(`${pad.label} needs AzuraCast request mapping.`);
        return;
      }

      setScreenTitle(`${pad.mode} LIVE SENT`);
      setScreenText(data?.message || `${pad.label} sent to AzuraCast.`);
      addLog(`${pad.label} sent to AzuraCast broadcast.`);
      refreshNowPlaying();
    } catch {
      setScreenTitle(`${pad.mode} ERROR`);
      setScreenText("Could not reach the pad broadcast API route.");
      addLog(`${pad.label} broadcast API error.`);
    }
  }

  async function refreshNowPlaying() {
    try {
      const response = await fetch("/api/listener/now-playing", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setNowPlayingText("Now-playing failed to load.");
        setListenerText("Check API route.");
        setLastUpdatedText(`Failed ${stamp()}`);
        addLog("Auto now-playing refresh failed.");
        return;
      }

      const text = data?.nowPlaying?.text || "Unknown song";
      const listeners = data?.listeners?.current ?? 0;
      const unique = data?.listeners?.unique ?? 0;
      const station = data?.station?.name || "Tha Core Online Radio";

      setNowPlayingText(text);
      setListenerText(`${listeners} current \u2022 ${unique} unique`);
      setStationText(station);
      setLastUpdatedText(`Updated ${stamp()}`);
    } catch {
      setNowPlayingText("Could not reach now-playing API.");
      setListenerText("API error.");
      setLastUpdatedText(`Error ${stamp()}`);
      addLog("Now-playing API error.");
    }
  }

  useEffect(() => {
    refreshNowPlaying();

    const timer = window.setInterval(() => {
      refreshNowPlaying();
    }, 20000);

    return () => window.clearInterval(timer);
  }, []);

  function cueBroadcast() {
    setBroadcast("cue");
    setScreenTitle("BROADCAST CUED");
    setScreenText("Broadcast is cued. Turntables slow spin. Hit main Play / Pause to start the full broadcast monitor.");
    addLog("Broadcast cued.");
  }

  async function playPauseBroadcast() {
  const audio = audioRef.current;

  if (isLive) {
    try {
      if (audio) audio.pause();
    } catch {
      // Ignore pause errors.
    }

    setBroadcast("paused");
    setScreenTitle("OWNER MONITOR PAUSED");
    setScreenText("Owner monitor paused. Public broadcast continues from the SmartZJ broadcast brain.");
    addLog("Owner monitor paused. Public broadcast was not reset.");
    return;
  }

  async function attachOwnerMonitorFromNowPlaying(sourceLabel: string) {
    const response = await fetch(`/api/listener/now-playing?ownerPlayAll=${Date.now()}`, {
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    const currentBroadcast = data?.currentBroadcast || {};

    const audioUrl = String(
      data?.streamUrl ||
        data?.audioUrl ||
        data?.listen_url ||
        currentBroadcast?.audioUrl ||
        ""
    ).trim();

    const startedAt = String(
      currentBroadcast?.startedAt ||
        data?.live?.broadcast_start ||
        ""
    );

    if (!audioUrl || !audioUrl.startsWith("/audio/smartdj/clean/")) {
      return false;
    }

    const monitor = audioRef.current || new Audio();
    audioRef.current = monitor;

    const absoluteUrl = new URL(audioUrl, window.location.origin).href;

    if (!monitor.src || monitor.src !== absoluteUrl) {
      monitor.src = audioUrl;
      monitor.load();
    }

    if (monitor.readyState < 1) {
      await new Promise<void>((resolve) => {
        let done = false;

        const finish = () => {
          if (done) return;
          done = true;
          monitor.removeEventListener("loadedmetadata", finish);
          monitor.removeEventListener("canplay", finish);
          resolve();
        };

        monitor.addEventListener("loadedmetadata", finish);
        monitor.addEventListener("canplay", finish);
        window.setTimeout(finish, 1800);
      });
    }

    const started = Date.parse(startedAt);
    const duration = Number(monitor.duration || 0);

    if (Number.isFinite(started)) {
      const elapsed = Math.max(0, Math.floor((Date.now() - started) / 1000));

      // OWNER_MONITOR_LOW_LAG_V1
      // Owner/control panel is the command booth, so its monitor should feel slightly ahead,
      // while the backend current-broadcast remains the one truth listeners follow.
      const ownerMonitorLeadSeconds = 8; // OWNER_MONITOR_8_SECOND_BOOTH_LEAD_V1
      let target = elapsed + ownerMonitorLeadSeconds;

      if (Number.isFinite(duration) && duration > 5) {
        target = Math.min(target, Math.max(0, duration - 2));

        const nearEnd = target >= duration - 3;
        if (nearEnd) {
          return false;
        }
      }

      if (target > 0 && Math.abs(monitor.currentTime - target) > 2) {
        monitor.currentTime = target;
      }
    }

    monitor.onended = () => {
      setBroadcast("cue");
      setScreenTitle("OWNER MONITOR RESYNCING");
      setScreenText("Track ended. Owner monitor is syncing back to the SmartZJ broadcast brain.");
      addLog("Owner monitor ended. Resyncing to current broadcast only.");

      void (async () => {
        // OWNER_MONITOR_ENDED_RESYNC_BRAIN_V1
        // Owner monitor must not pick a separate next track directly.
        // It asks the backend ended-resync brain to advance Current Broadcast safely,
        // then it re-attaches from /api/listener/now-playing.
        await fetch(`/api/listener/smartzj-ended-resync?ownerMonitorEnded=${Date.now()}`, {
          method: "POST",
          cache: "no-store",
        }).catch(() => null);

        await new Promise((resolve) => window.setTimeout(resolve, 100)); // OWNER_MONITOR_FAST_AUTONEXT_V1

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const attached = await attachOwnerMonitorFromNowPlaying("owner-monitor-ended");

          if (attached) return;

          await new Promise((resolve) => window.setTimeout(resolve, 250)); // OWNER_MONITOR_FAST_AUTONEXT_V1
        }

        setBroadcast("paused");
        setScreenTitle("OWNER MONITOR WAITING");
        setScreenText("Owner monitor is waiting for the SmartZJ watchdog to start the next clean broadcast.");
        addLog("Owner monitor could not resync yet. Public broadcast brain remains in control.");
      })();
    };

    monitor.onerror = () => {
      setBroadcast("paused");
      setScreenTitle("OWNER MONITOR ERROR");
      setScreenText("Owner monitor could not play the current clean broadcast. Public broadcast remains protected.");
      addLog("Owner monitor playback error. No raw audio fallback was used.");
    };

    monitor.volume = monitorOn ? 1 : 0;
    monitor.muted = !monitorOn;

    await monitor.play();

    const title = String(data?.now_playing?.song?.title || currentBroadcast?.title || "Current SmartZJ broadcast");
    const artist = String(data?.now_playing?.song?.artist || currentBroadcast?.artist || "SmartZJ");
    const itemNumber = Number(currentBroadcast?.sequence?.itemNumber || 0);
    const total = Number(currentBroadcast?.sequence?.total || 0);

    setAutoDj(false);
    setSmartDj(true);
    setLiveDj(false);
    setMicLive(false);
    setSelectedMode("SMARTDJ");
    setBroadcast("live");
    setScreenTitle("PLAY ALL FOLLOWING LIVE BROADCAST");
    setScreenText(`${artist} - ${title} is playing from the current SmartZJ broadcast${itemNumber && total ? ` (${itemNumber} of ${total})` : ""}.`);
    addLog(`PLAY ALL attached owner monitor to current broadcast via ${sourceLabel}.`);
    // OWNER_MONITOR_FOLLOW_WATCHDOG_V1
    // Keep the owner/control-panel monitor following the backend Current Broadcast truth.
    // If the backend moves to another clean broadcast file, or this monitor pauses/ends,
    // reattach from /api/listener/now-playing. Do not release raw Azura fallback.
    const ownerFollowWindow = window as Window & {
      __thaCoreOwnerFollowTimer?: number;
      __thaCoreOwnerFollowBusy?: boolean;
      __thaCoreOwnerFollowBroadcastKey?: string;
    };

    if (ownerFollowWindow.__thaCoreOwnerFollowTimer) {
      window.clearInterval(ownerFollowWindow.__thaCoreOwnerFollowTimer);
    }

    ownerFollowWindow.__thaCoreOwnerFollowBroadcastKey = `${audioUrl}|${startedAt}`;

    ownerFollowWindow.__thaCoreOwnerFollowTimer = window.setInterval(() => {
      if (ownerFollowWindow.__thaCoreOwnerFollowBusy) return;

      const activeMonitor = audioRef.current;
      if (!activeMonitor) return;

      ownerFollowWindow.__thaCoreOwnerFollowBusy = true;

      void (async () => {
        try {
          const response = await fetch(`/api/listener/now-playing?ownerFollowWatch=${Date.now()}`, {
            cache: "no-store",
          });

          const latest = await response.json().catch(() => null);
          const latestBroadcast = latest?.currentBroadcast || {};
          const latestAudioUrl = String(
            latest?.streamUrl ||
              latest?.audioUrl ||
              latest?.listen_url ||
              latestBroadcast?.audioUrl ||
              ""
          ).trim();

          if (!latestAudioUrl || !latestAudioUrl.startsWith("/audio/smartdj/clean/")) return;

          const latestStartedAt = String(
            latestBroadcast?.startedAt ||
              latest?.live?.broadcast_start ||
              ""
          );

          const latestAbsoluteUrl = new URL(latestAudioUrl, window.location.origin).href;
          const latestBroadcastKey = `${latestAudioUrl}|${latestStartedAt}`;
          const knownBroadcastKey = ownerFollowWindow.__thaCoreOwnerFollowBroadcastKey || "";
          const currentMonitorUrl = activeMonitor.currentSrc || activeMonitor.src || "";
          const needsReattach =
            latestBroadcastKey !== knownBroadcastKey ||
            latestAbsoluteUrl !== currentMonitorUrl ||
            activeMonitor.paused ||
            activeMonitor.ended ||
            Boolean(activeMonitor.error);

          if (needsReattach) {
            const reattached = await attachOwnerMonitorFromNowPlaying("owner-follow-watchdog");
            if (reattached) {
              ownerFollowWindow.__thaCoreOwnerFollowBroadcastKey = latestBroadcastKey;
            }
          }
        } catch {
          addLog("Owner follow watchdog could not check current broadcast.");
        } finally {
          ownerFollowWindow.__thaCoreOwnerFollowBusy = false;
        }
      })();
    }, 1000); // OWNER_MONITOR_FOLLOW_WATCHDOG_FAST_V2

    await refreshNowPlaying();
    return true;
  }

  try {
    const attached = await attachOwnerMonitorFromNowPlaying("now-playing");

    if (attached) return;

    setScreenTitle("STARTING SCHEDULE BROADCAST");
    setScreenText("No current clean broadcast was ready. Asking SmartZJ schedule brain for the next clean track.");
    addLog("PLAY ALL requested schedule-selected SmartZJ track.");

    await fetch(`/api/listener/smartzj-clean-next?lane=schedule&ownerPlayAll=${Date.now()}`, {
      method: "POST",
      cache: "no-store",
    });

    const started = await attachOwnerMonitorFromNowPlaying("schedule-start");

    if (!started) {
      setBroadcast("off");
      setScreenTitle("PLAY ALL BLOCKED");
      setScreenText("No approved clean SmartZJ broadcast track is ready. Raw audio was not released.");
      addLog("PLAY ALL blocked. No clean schedule track ready.");
      await refreshNowPlaying();
    }
  } catch {
    setBroadcast("off");
    setScreenTitle("PLAY ALL ERROR");
    setScreenText("Could not attach to the SmartZJ broadcast brain. No raw audio was released.");
    addLog("PLAY ALL current broadcast attach error.");
    await refreshNowPlaying();
  }
}

  async function stopBroadcast() {
    const ownerFollowWindow = window as Window & { __thaCoreOwnerFollowTimer?: number };
    if (ownerFollowWindow.__thaCoreOwnerFollowTimer) {
      window.clearInterval(ownerFollowWindow.__thaCoreOwnerFollowTimer);
      ownerFollowWindow.__thaCoreOwnerFollowTimer = undefined;
    }

    const audio = audioRef.current;
    const overlayAudio = overlayAudioRef.current;

    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.removeAttribute("src");
        audio.load();
      } catch {
        // Live stream reset may not be allowed.
      }
    }

    if (overlayAudio) {
      try {
        overlayAudio.pause();
        overlayAudio.currentTime = 0;
        overlayAudio.removeAttribute("src");
        overlayAudio.load();
      } catch {
        // Overlay reset may not be allowed.
      }
    }

    try {
      await fetch("/api/radio/current-broadcast", {
        method: "DELETE",
        cache: "no-store",
      });
    } catch {
      // Stop All should still stop local audio even if reset route fails.
    }

    setBroadcast("off");
    setMicLive(false);
    setSmartDj(false);
    setLiveDj(false);
    setAutoDj(true);
    setSelectedMode("AUTODJ");

    setScreenTitle("STOP ALL");
    setScreenText("Stop All stopped the owner monitor and cleared the active SmartDJ broadcast handoff.");
    addLog("Stop All pressed. Audio stopped and current broadcast handoff cleared.");

    refreshNowPlaying();
  }

  async function returnToLiveStream() {
    try {
      setScreenTitle("CURRENT BROADCAST CLEARING");
      setScreenText("Clearing SmartZJ current-broadcast handoff. Owner monitor will not load old Azura direct stream.");
      addLog("Return/Clear current broadcast requested.");

      const response = await fetch("/api/radio/current-broadcast", {
        method: "DELETE",
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || data?.ok === false) {
        setScreenTitle("CLEAR CURRENT BROADCAST FAILED");
        setScreenText(data?.message || "Could not clear current broadcast handoff.");
        addLog("Clear current broadcast failed.");
        return;
      }

      const audio = audioRef.current;

      setAutoDj(true);
      setSmartDj(false);
      setLiveDj(false);
      setMicLive(false);
      setSelectedMode("AUTODJ");

      if (audio) {
        try {
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
        } catch {
          // Monitor cleanup only. Do not fall back to raw Azura here.
        }
      }

      setBroadcast("cue");
      setScreenTitle("CURRENT BROADCAST CLEARED");
      setScreenText("SmartZJ current-broadcast handoff cleared. Owner monitor will follow /api/listener/now-playing only.");
      addLog("Current broadcast cleared. Old Azura direct monitor fallback blocked.");

      refreshNowPlaying();
    } catch {
      setScreenTitle("CLEAR CURRENT BROADCAST ERROR");
      setScreenText("Could not reach current-broadcast reset route.");
      addLog("Clear current broadcast API error.");
    }
  }

  function skipNext() {
    callRadioAction("skip");
  }

  function studioSkip() {
    setScreenTitle("STUDIO SKIP");
    setScreenText("Studio Skip pressed. Ready for clean SmartDJ / AutoDJ transition.");
    addLog("Studio Skip pressed.");
  }

  function toggleMonitor() {
    setMonitorOn((current) => {
      const next = !current;

      if (audioRef.current) {
        audioRef.current.muted = !next;
      }

      setScreenTitle(next ? "MONITOR ON" : "MONITOR MUTED");
      setScreenText(
        next
          ? "In-house studio monitor is on."
          : "In-house monitor is muted. Public stream is not affected."
      );
      addLog(next ? "Monitor turned on." : "Monitor muted.");

      return next;
    });
  }

  function effectPunch(type: "reverb" | "delay" | "echo" | "bass" | "ad" | "jingle") {
    if (type === "reverb") setReverb((value) => Math.min(value + 12, 100));
    if (type === "delay") setDelay((value) => Math.min(value + 12, 100));
    if (type === "echo") setEcho((value) => Math.min(value + 12, 100));
    if (type === "bass") setBass((value) => Math.min(value + 10, 100));
    if (type === "ad") setAdBed((value) => Math.min(value + 10, 100));
    if (type === "jingle") setJingleBed((value) => Math.min(value + 10, 100));

    setScreenTitle("EFFECT ADJUSTED");
    setScreenText(`${type.toUpperCase()} control adjusted from the main broadcast section.`);
    addLog(`${type.toUpperCase()} adjusted.`);
  }


  async function runGlobalSafeActionGate(payload: {
    source: string;
    action: string;
    track?: any;
    text?: string;
    requireClean?: boolean;
  }) {
    try {
      const response = await fetch("/api/radio/safe-action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          source: payload.source,
          action: payload.action,
          mode: "pre_broadcast",
          requireClean: payload.requireClean !== false,
          track: payload.track,
          text: payload.text,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.allowed) {
        const message =
          data?.message ||
          "Global Bleep Gate blocked this action before broadcast.";

        setScreenTitle("GLOBAL BLEEP HOLD");
        setScreenText(message);
        addLog(message);

        return {
          allowed: false,
          message,
          data,
        };
      }

      const message =
        data?.message || "Passed global radio bleep check. Action allowed.";

      addLog(message);

      return {
        allowed: true,
        message,
        data,
      };
    } catch {
      const message = "Global bleep gate failed. Action held before broadcast.";

      setScreenTitle("GLOBAL BLEEP ERROR");
      setScreenText(message);
      addLog(message);

      return {
        allowed: false,
        message,
        data: null,
      };
    }
  }

  // OWNER_PARENT_SAFE_GATE_HELPER_V1
  async function firePad(pad: Pad) {
    const gate = await runGlobalSafeActionGate({
      source: pad.mode || "CONTROL_PANEL",
      action: "fire_pad",
      requireClean: true,
      track: {
        id: pad.label,
        title: pad.label,
        artist: pad.mode,
        source: "Owner Control Panel Pad",
        reason: pad.message,
      },
      text: `${pad.mode} ${pad.label} ${pad.message}`,
    });

    if (!gate.allowed) {
      return;
    }

    if (audioRef.current) {
      const next = !audioRef.current.paused;

      if (next) {
        audioRef.current.pause();
      }
    }

    setSelectedMode(pad.mode);
    setScreenTitle(`${pad.mode}: ${pad.label}`);
    setScreenText(pad.message);

    if (pad.mode === "SMARTDJ") setDjMode("SMARTDJ");
    if (pad.mode === "AUTODJ") setDjMode("AUTODJ");
    if (pad.mode === "LIVEDJ") setDjMode("LIVEDJ");

    sendPadToBroadcast(pad);
    addLog(`${pad.mode}: ${pad.label}`);
  }

  function selectDisplay(mode: PadMode, label: string) {
    setSelectedMode(mode);
    setScreenTitle(`${label.toUpperCase()} DISPLAY`);
    setScreenText(`${label} display buttons are now loaded in the hero page.`);
    addLog(`${label} display selected.`);
  }

  function selectTool(tool: FooterTool) {
    setScreenTitle(`${tool.label.toUpperCase()} DOCK`);
    setScreenText(tool.note);
    addLog(`${tool.label} footer dock selected.`);
  }

  const deckAQuickPads = [
    getPad("Station ID"),
    getPad("Big Intro"),
    getPad("DJ Drop"),
    getPad("Com Break"),
    getPad("Store Ad"),
    getPad("Sponsor Ad"),
  ];

  const deckBQuickPads = [
    getPad("Back To Back"),
    getPad("Pull Up"),
    getPad("Radio Promo"),
    getPad("Music Promo"),
    getPad("Smart Jingle"),
    getPad("Auto Next"),
  ];

  return (
    <main className="control-page">
      <AiHostScriptPanel />
      <SmartDJAutoBrain />
      <audio ref={audioRef} src={STREAM_URL} preload="none" />
      <audio ref={overlayAudioRef} preload="auto" />

      <section className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">THA CORE ONLINE RADIO</p>
            <h1>Studio Control Panel</h1>
            <p className="subtitle">
              Jet black and blood red studio layout with live auto-updating now-playing status,
              all-in-one AutoDJ / SmartDJ / LiveDJ switch, filled broadcast controls, deck quick
              pads, jingles, drops, commercials, ads, sliders, and radio API buttons.
            </p>
          </div>

          <div className="brand-badge">
            <span className="crown">LIVE CONTROL ROOM</span>
            <strong>TC</strong>
            <small>STUDIO LIVE</small>
          </div>
        </header>

        <section className="status-row">
          <StatusCard label="Broadcast" value={broadcastLabel} tone={isLive ? "green" : isCue ? "yellow" : "red"} />
          <AutoDjGateStatusCard autoDj={autoDj} />
          <StatusCard label="SmartDJ" value={smartDj ? "ACTIVE" : "OFF"} tone={smartDj ? "blue" : "red"} />
          <StatusCard label="LiveDJ" value={liveDj ? "LIVE" : "OFF"} tone={liveDj ? "green" : "red"} />
          <StatusCard label="Mic" value={micLive ? "ARMED" : "MUTED"} tone={micLive ? "purple" : "red"} />
          <StatusCard label="Monitor" value={monitorOn ? "ON" : "MUTED"} tone={monitorOn ? "green" : "red"} />
        </section>

        {showAudioSafetyPanel ? (
          <section className="owner-panel-focus panel">
            <PanelHeading left="Audio Safety Center" right="Held - Clean/Bleep Jobs - Safe Queue" />
            <AudioSafetyCenterPanel />
          </section>
        ) : null}
{/* OWNER_CLEAN_BLEEP_DEDICATED_PANEL_V1 */}
        {showCleanBleepPanel ? (
          <section className="owner-panel-focus panel">
            <PanelHeading left="Clean / Bleep Tracks" right="Playlist - Bleep Check - Safety Queue" />
            <OwnerSmartDjCommand />
            <SmartDjControlPlaylist />
            <SmartDjSafetyQueuePanel />
          </section>
        ) : null}

        {/* OWNER_SONG_REQUESTS_DEDICATED_PANEL_V1 */}
        {showSongRequestsPanel ? (
          <section className="owner-panel-focus panel">
            <PanelHeading left="Song Requests" right="Request timer - Clean gate - Owner queue control" />
            <SmartZjRequestTimerPanel />
            <div className="owner-admin-menu-grid">
              <a href="/requests">Open Public Request Page</a>
              <a href="/owner?panel=smartzj-clean-bleep">Open Clean / Bleep Tracks</a>
            </div>
          </section>
        ) : null}

      <section className="central-log">
          {/* OWNER_ADMIN_MENU_V1 */}
          <details className="owner-admin-menu">
            <summary>OWNER MENU</summary>
            <div className="owner-admin-menu-grid">
              <a href="/schedule">Schedule Editor</a>
              <a href="/owner?panel=smartzj-clean-bleep">Clean / Bleep Tracks</a>
              <a href="/owner?panel=song-requests">Song Requests</a>
              <a href="/owner?panel=audio-safety">Audio Safety Center</a>
              {footerTools
                .filter((tool) => tool.label !== "Schedule")
                .map((tool) => (
                  <a
                    key={`owner-menu-${tool.label}`}
                    href={tool.href}
                    onClick={() => selectTool(tool)}
                  >
                    {tool.label}
                  </a>
                ))}
            </div>
          </details>
          <PanelHeading left="Central Control Log" right="Above Studio" />

          <div className="log-row">
            {logs.slice(0, 4).map((log, index) => (
              <div key={`${log.id}-${index}`} className="log-card">
                <span>{log.time}</span>
                <p>{log.message}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="now-playing-bar">
          <div>
            <span>Now Playing</span>
            <strong>{nowPlayingText}</strong>
          </div>

          <div>
            <span>Listeners</span>
            <strong>{listenerText}</strong>
          </div>

          <div>
            <span>Station</span>
            <strong>{stationText}</strong>
          </div>

          <button type="button" onClick={refreshNowPlaying}>REFRESH SAFETY</button>
        </section>

        <section className="main-studio">
          <section className="left-display panel">
            <PanelHeading left={screenTitle} right={broadcastLabel} />

            <div className="screen">
              <p className="screen-kicker">LIVE DISPLAY</p>
              <h2>{broadcastLabel}</h2>
              <p>{screenText}</p>

              <div className="lamp-grid">
                <span className={autoDj ? "lamp on yellow" : "lamp"}>AUTODJ</span>
                <span className={smartDj ? "lamp on blue" : "lamp"}>SMARTDJ</span>
                <span className={liveDj ? "lamp on green" : "lamp"}>LIVEDJ</span>
                <span className={micLive ? "lamp on purple" : "lamp"}>MIC</span>
              </div>
            </div>

            <div className="hero-smart-area">
              <PanelHeading left="All-In-One Smart Switch" right={currentDjMode} />

              <div className="smart-mode-switch">
                <button
                  type="button"
                  onClick={async () => {
                      addLog("AutoDJ gate checking next clean/bleeped track...");

                      try {
                        const response = await fetch("/api/autodj/gated-next", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          cache: "no-store",
                          body: JSON.stringify({
                            action: "next",
                          }),
                        });

                        const data = await response.json();

                        if (data?.allowAutoDj && data?.safe) {
                          setDjMode("AUTODJ");
                          addLog(
                            `AutoDJ gate approved: ${
                              data?.track?.artist || "AutoDJ"
                            } - ${data?.track?.title || "clean/bleeped track"}`
                          );
                        } else {
                          addLog(
                            `AutoDJ gate blocked track: ${
                              data?.message ||
                              "Needs clean version or bleeped copy before rotation."
                            }`
                          );
                        }
                      } catch {
                        addLog("AutoDJ gate error. AutoDJ was not switched on.");
                      }
                    }}
                  className={currentDjMode === "AUTODJ" ? "active auto" : "auto"}
                >
                  <span>AutoDJ</span>
                  <b>Playlist</b>
                </button>

                <button
                  type="button"
                  onClick={() => setDjMode("SMARTDJ")}
                  className={currentDjMode === "SMARTDJ" ? "active smart" : "smart"}
                >
                  <span>SmartDJ</span>
                  <b>Smart Flow</b>
                </button>

                <button
                  type="button"
                  onClick={() => setDjMode("LIVEDJ")}
                  className={currentDjMode === "LIVEDJ" ? "active live" : "live"}
                >
                  <span>LiveDJ</span>
                  <b>Mic / Manual</b>
                </button>
              </div>

              <div className="display-switches">
                <button type="button" onClick={() => selectDisplay("JINGLES", "Jingles")} className="display-btn blood">
                  Jingles Display
                </button>

                <button type="button" onClick={() => selectDisplay("COM", "Commercial")} className="display-btn dark">
                  Commercial Display
                </button>
              </div>

              <div className="hero-tabs">
                {padModes.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => selectDisplay(mode, mode)}
                    className={selectedMode === mode ? "active" : ""}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="hero-pad-grid">
                {visiblePads.map((pad) => (
                  <button
                    key={`${pad.mode}-${pad.label}`}
                    type="button"
                    onClick={() => firePad(pad)}
                    className={`pad ${pad.color}`}
                  >
                    <small>{pad.mode}</small>
                    <strong>{pad.label}</strong>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="turntable-stage">
            <Turntable
              title="DECK A"
              label="MAIN BROADCAST"
              state={broadcast}
              quickPads={deckAQuickPads}
              onPad={firePad}
              onCue={cueBroadcast}
              onSync={studioSkip}
              onLoad={() => selectDisplay("JINGLES", "Deck A")}
            />

            <section className="broadcast-center">
              <div className="cam-box">
                <PanelHeading left="Studio Cam" right={micLive ? "MIC LIVE" : "READY"} />

                <div className="cam-view">
                  <div className={isLive ? "cam-bars active" : "cam-bars"}>
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>

                  <p>Camera / video call / live studio window</p>
                </div>
              </div>

              <button type="button" onClick={playPauseBroadcast} className={isLive ? "main-play active" : "main-play"}>
                <span>MAIN BROADCAST</span>
                <b>{isLive ? "PAUSE ALL" : "PLAY ALL"}</b>
              </button>

              <div className="broadcast-buttons">
                <button type="button" onClick={cueBroadcast} className="btn blood">LEFT CUE</button>
                <button type="button" onClick={stopBroadcast} className="btn red">Stop All</button>
                <button type="button" onClick={skipNext} className="btn blue">Skip</button>
                <button type="button" onClick={studioSkip} className="btn purple">Studio Skip</button>
                <button type="button" onClick={toggleMonitor} className="btn green">Monitor</button>
                <button
                  type="button"
                  onClick={() => {
                    setMicLive((current) => !current);
                    addLog("Mic toggled.");
                  }}
                  className="btn orange"
                >
                  Mic
                </button>
              </div>
              {/* Duplicate center pad bank removed. Main pad grid is the one true pad section. */}
              {/* Duplicate mode buttons removed. Smart switch and pad tabs are the single source of truth. */}
              {/* Duplicate effect buttons removed until effects are wired to real audio processing. */}
<div className="crossfader">
                <span>Deck A</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={crossfade}
                  onChange={(event) => setCrossfade(Number(event.target.value))}
                />
                <span>Deck B</span>
              </div>

              <div className="slider-bank">
                <ControlSlider label="Main" value={volume} setValue={setMainVolume} />
                <ControlSlider label="Mon" value={monitorVol} setValue={setMonitorVol} />
                <ControlSlider label="Mic" value={micGain} setValue={setMicGain} />
                <ControlSlider label="Music" value={musicGain} setValue={setMusicGain} />
                <ControlSlider label="Tempo" value={tempo} setValue={setTempo} />
                <ControlSlider label="Bass" value={bass} setValue={setBass} />
                <ControlSlider label="Mid" value={mid} setValue={setMid} />
                <ControlSlider label="High" value={high} setValue={setHigh} />
                <ControlSlider label="Rev" value={reverb} setValue={setReverb} />
                <ControlSlider label="Delay" value={delay} setValue={setDelay} />
                <ControlSlider label="Echo" value={echo} setValue={setEcho} />
                <ControlSlider label="Deck A" value={deckAGain} setValue={setDeckAGain} />
                <ControlSlider label="Deck B" value={deckBGain} setValue={setDeckBGain} />
                <ControlSlider label="Ads" value={adBed} setValue={setAdBed} />
                <ControlSlider label="Jing" value={jingleBed} setValue={setJingleBed} />
              </div>
            </section>

            <Turntable
              title="DECK B"
              label="AUTODJ / JINGLES"
              state={broadcast}
              quickPads={deckBQuickPads}
              onPad={firePad}
              onCue={cueBroadcast}
              onSync={studioSkip}
              onLoad={() => selectDisplay("ADS", "Deck B")}
            />
          </section>

          <section className="right-pads panel">
            <PanelHeading left="Studio Meter / Mode Display" right={selectedMode} />

            <div className="mode-display">
              <h3>{currentDjMode}</h3>
              <p>All-in-one smart switch controls AutoDJ, SmartDJ, and LiveDJ from the hero page.</p>

              <button type="button" onClick={() => firePad(visiblePads[0] || pads[0])}>
                Fire First {selectedMode}
              </button>
            </div>

            <div className="meter">
              <PanelHeading left="Studio Meter" right={isLive ? "Moving" : "Idle"} />

              <div className={isLive ? "meter-bars active" : "meter-bars"}>
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className="side-fill-buttons">
              <button type="button" onClick={() => callRadioAction("restart")}>Restart Backend</button>
              <button type="button" onClick={() => callRadioAction("start")}>Start Backend</button>
              <button type="button" onClick={() => callRadioAction("stop")}>Stop Backend</button>
              <button type="button" onClick={refreshNowPlaying}>Refresh Status</button>
            </div>
          </section>
        </section>

        <footer className="footer-dock panel">
          <PanelHeading left="SmartDJ Command" right="Main command input" />
            <OwnerSmartDjCommand />
        </footer>
      </section>

      <style jsx global>{`
        * { box-sizing: border-box; }

        /* OWNER_FOCUS_HIDE_MAIN_STUDIO_GLOBAL_RULE_V1 */
        .owner-panel-focus ~ section,
        .owner-panel-focus ~ footer {
          display: none !important;
        }

        /* OWNER_FOCUS_HIDE_TOP_STUDIO_HEADER_V2 */
        .shell:has(.owner-panel-focus) > .topbar,
        .shell:has(.owner-panel-focus) > .status-row,
        .shell:has(.owner-panel-focus) > .now-playing-bar,
        .shell:has(.owner-panel-focus) > .main-studio,
        .shell:has(.owner-panel-focus) > .central-log,
        .shell:has(.owner-panel-focus) > .footer-dock {
          display: none !important;
        }
        body { margin: 0; }

        .owner-admin-menu {
          margin: 14px 0 18px;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 18px;
          background: rgba(0,0,0,0.72);
          padding: 14px;
          box-shadow: 0 0 24px rgba(255,0,0,0.18);
        }

        .owner-admin-menu summary {
          cursor: pointer;
          list-style: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(255,223,46,0.55);
          background: linear-gradient(135deg, #180000, #450000);
          color: #ffdf2e;
          padding: 12px 18px;
          font-weight: 1000;
          letter-spacing: 0.12em;
        }

        .owner-admin-menu summary::-webkit-details-marker {
          display: none;
        }

        .owner-admin-menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 10px;
          margin-top: 14px;
        }

        .owner-admin-menu-grid a {
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 14px;
          padding: 13px;
          background: rgba(255,255,255,0.06);
          color: #fff;
          font-weight: 900;
          text-align: center;
        }

        .control-page {
          min-height: 100vh;
          padding: 22px;
          color: #ffe9e9;
          background:
            radial-gradient(circle at top left, rgba(155, 0, 0, 0.35), transparent 28%),
            radial-gradient(circle at top right, rgba(95, 0, 0, 0.44), transparent 32%),
            linear-gradient(135deg, #000000 0%, #070000 38%, #160000 68%, #000000 100%);
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .shell {
          width: min(1850px, 100%);
          margin: 0 auto;
          padding: 22px;
          border-radius: 34px;
          background:
            linear-gradient(180deg, rgba(190, 0, 0, 0.12), transparent),
            rgba(0, 0, 0, 0.94);
          border: 1px solid rgba(185, 0, 0, 0.72);
          box-shadow:
            0 0 100px rgba(120, 0, 0, 0.44),
            inset 0 0 55px rgba(150, 0, 0, 0.12);
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          gap: 22px;
          align-items: center;
          padding: 20px;
          border-radius: 28px;
          background:
            linear-gradient(90deg, rgba(120, 0, 0, 0.7), rgba(0, 0, 0, 0.9)),
            #030000;
          border: 1px solid rgba(190, 0, 0, 0.68);
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #ff2b2b;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.25em;
        }

        h1 {
          margin: 0;
          color: #ffffff;
          font-size: clamp(34px, 5vw, 78px);
          line-height: 0.9;
          text-transform: uppercase;
          text-shadow: 0 0 16px rgba(255, 0, 0, 0.95), 0 0 40px rgba(120, 0, 0, 0.65);
        }

        .subtitle {
          margin: 12px 0 0;
          max-width: 980px;
          color: #ffc9c9;
          font-size: 15px;
          line-height: 1.5;
        }

        .brand-badge {
          min-width: 190px;
          min-height: 118px;
          display: grid;
          place-items: center;
          text-align: center;
          border-radius: 24px;
          background: radial-gradient(circle, rgba(190, 0, 0, 0.34), transparent 58%), #000;
          border: 1px solid rgba(255, 0, 0, 0.6);
          box-shadow: 0 0 34px rgba(160, 0, 0, 0.4);
        }

        .brand-badge .crown { color: #ff2b2b; font-size: 26px; line-height: 1; }
        .brand-badge strong { color: #ff1f1f; font-size: 40px; line-height: 1; text-shadow: 0 0 15px rgba(255, 0, 0, 0.9); }
        .brand-badge small { color: #ffd7d7; font-size: 11px; font-weight: 950; letter-spacing: 0.12em; }

        .status-row {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin: 16px 0;
        }

        .status-card {
          position: relative;
          min-height: 88px;
          padding: 15px;
          border-radius: 21px;
          background: linear-gradient(145deg, rgba(170, 0, 0, 0.15), rgba(255, 255, 255, 0.018)), #030000;
          border: 1px solid rgba(180, 0, 0, 0.48);
          overflow: hidden;
        }

        .status-light {
          position: absolute;
          top: 15px;
          left: 15px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 18px currentColor;
        }

        .status-light.green { color: #00ff76; }
        .status-light.red { color: #ff1b1b; }
        .status-light.yellow { color: #ff3b3b; }
        .status-light.orange { color: #ff4f00; }

        .status-card small {
          display: block;
          margin-left: 26px;
          color: #ff6b6b;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .status-card strong {
          display: block;
          margin-top: 13px;
          color: #fff;
          font-size: 18px;
          text-transform: uppercase;
        }

        .panel,
        .central-log {
          border-radius: 26px;
          background: linear-gradient(145deg, rgba(140, 0, 0, 0.18), rgba(0, 0, 0, 0.8)), #030000;
          border: 1px solid rgba(180, 0, 0, 0.48);
          box-shadow: inset 0 0 30px rgba(255, 0, 0, 0.06);
          overflow: hidden;
        }

        .panel-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          padding: 13px 15px;
          border-bottom: 1px solid rgba(180, 0, 0, 0.42);
        }

        .panel-heading span {
          color: #ff3b3b;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .panel-heading b {
          color: #fff;
          font-size: 10px;
          text-transform: uppercase;
          text-align: right;
        }

        .central-log { margin-bottom: 16px; }

        .log-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          padding: 12px;
        }

        .log-card {
          display: grid;
          grid-template-columns: 54px 1fr;
          gap: 8px;
          align-items: center;
          min-height: 48px;
          padding: 8px;
          border-radius: 14px;
          background: rgba(255, 0, 0, 0.055);
          border: 1px solid rgba(180, 0, 0, 0.26);
        }

        .log-card span { color: #ff3b3b; font-size: 11px; font-weight: 950; }
        .log-card p { margin: 0; color: #ffd7d7; font-size: 12px; line-height: 1.3; }

        .now-playing-bar {
          display: grid;
          grid-template-columns: 1.3fr 0.7fr 0.9fr 220px;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
          padding: 14px;
          border-radius: 24px;
          background: linear-gradient(90deg, rgba(180, 0, 0, 0.42), rgba(0, 0, 0, 0.92)), #030000;
          border: 1px solid rgba(190, 0, 0, 0.6);
          box-shadow: 0 0 38px rgba(160, 0, 0, 0.22);
        }

        .now-playing-bar div {
          min-height: 58px;
          display: grid;
          align-content: center;
          padding: 10px 14px;
          border-radius: 18px;
          background: rgba(0, 0, 0, 0.46);
          border: 1px solid rgba(180, 0, 0, 0.28);
        }

        .now-playing-bar span {
          color: #ff4b4b;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .now-playing-bar strong {
          margin-top: 4px;
          color: #fff;
          font-size: 15px;
          text-transform: uppercase;
        }

        .now-playing-bar button {
          min-height: 58px;
          border: 0;
          border-radius: 18px;
          color: #fff;
          background: linear-gradient(180deg, #d90000, #580000);
          font-weight: 950;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 6px 0 #050000;
        }

        .main-studio {
          display: grid;
          grid-template-columns: 0.98fr 2.28fr 0.9fr;
          gap: 16px;
          align-items: start;
        }

        .screen {
          min-height: 245px;
          padding: 24px 18px;
          background: repeating-linear-gradient(0deg, rgba(255, 0, 0, 0.04), rgba(255, 0, 0, 0.04) 1px, transparent 1px, transparent 8px);
        }

        .screen-kicker {
          margin: 0 0 12px;
          color: #ff3434;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.18em;
        }

        .screen h2 {
          margin: 0;
          color: #fff;
          font-size: clamp(24px, 2.6vw, 43px);
          line-height: 1;
          text-transform: uppercase;
        }

        .screen p { color: #ffd7d7; font-size: 15px; line-height: 1.5; }

        .lamp-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-top: 18px;
        }

        .lamp {
          display: grid;
          place-items: center;
          min-height: 37px;
          border-radius: 999px;
          color: #777;
          background: #080808;
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 10px;
          font-weight: 950;
        }

        .lamp.on.orange { background: #ff4f00; color: #fff; box-shadow: 0 0 15px rgba(255, 79, 0, 0.55); }
        .lamp.on.green { background: #00ff76; color: #00170b; box-shadow: 0 0 15px rgba(0, 255, 118, 0.55); }
        .lamp.on.red { background: #a40000; color: #fff; box-shadow: 0 0 15px rgba(255, 0, 0, 0.55); }
        .lamp.on.yellow { background: #ff1b1b; color: #fff; box-shadow: 0 0 15px rgba(255, 27, 27, 0.55); }

        .hero-smart-area { border-top: 1px solid rgba(180, 0, 0, 0.4); }

        .smart-mode-switch {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 12px 12px 0;
        }

        .smart-mode-switch button {
          min-height: 62px;
          border: 0;
          border-radius: 16px;
          background: linear-gradient(180deg, #111, #000);
          color: #ff7a7a;
          border: 1px solid rgba(180, 0, 0, 0.4);
          cursor: pointer;
          text-transform: uppercase;
          font-weight: 950;
          box-shadow: 0 5px 0 rgba(0, 0, 0, 0.45);
        }

        .smart-mode-switch button span { display: block; font-size: 13px; }
        .smart-mode-switch button b { display: block; margin-top: 4px; font-size: 10px; color: #ffd7d7; }

        .smart-mode-switch button.active.auto {
          background: linear-gradient(180deg, #ff4f00, #5b1700);
          color: #fff;
          box-shadow: 0 0 22px rgba(255, 79, 0, 0.35), 0 5px 0 #050000;
        }

        .smart-mode-switch button.active.smart {
          background: linear-gradient(180deg, #ff1b1b, #5b0000);
          color: #fff;
          box-shadow: 0 0 22px rgba(255, 0, 0, 0.42), 0 5px 0 #050000;
        }

        .smart-mode-switch button.active.live {
          background: linear-gradient(180deg, #00ff76, #004b23);
          color: #00170b;
          box-shadow: 0 0 22px rgba(0, 255, 118, 0.32), 0 5px 0 #050000;
        }

        .display-switches,
        .center-pad-bank,
        .effect-buttons,
        .side-fill-buttons {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          padding: 10px;
          border-radius: 18px;
          background: rgba(255, 0, 0, 0.035);
          border: 1px solid rgba(180, 0, 0, 0.18);
        }

        .display-switches {
          padding: 12px 12px 0;
          border: 0;
          background: transparent;
        }

        .display-btn {
          min-height: 44px;
          border: 0;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 950;
          text-transform: uppercase;
          box-shadow: 0 5px 0 rgba(0, 0, 0, 0.45);
        }

        .display-btn.blood { background: linear-gradient(180deg, #d90000, #580000); color: #fff; }
        .display-btn.dark { background: linear-gradient(180deg, #151515, #000); color: #ff3b3b; border: 1px solid rgba(190, 0, 0, 0.55); }

        .hero-tabs {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 7px;
          padding: 12px;
        }

        .hero-tabs button,
        .center-pad-bank button,
        .effect-buttons button,
        .side-fill-buttons button {
          min-height: 35px;
          border-radius: 12px;
          background: #090909;
          color: #ff4b4b;
          border: 1px solid rgba(180, 0, 0, 0.38);
          font-size: 10px;
          cursor: pointer;
          font-weight: 950;
          text-transform: uppercase;
        }

        .center-pad-bank button,
        .effect-buttons button {
          min-height: 38px;
          color: #fff;
          background: linear-gradient(180deg, #a40000, #330000);
        }

        .hero-tabs button.active {
          background: #a40000;
          color: #fff;
          box-shadow: 0 0 18px rgba(255, 0, 0, 0.25);
        }

        .hero-pad-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          padding: 0 12px 12px;
          max-height: 350px;
          overflow: auto;
        }

        .turntable-stage {
          display: grid;
          grid-template-columns: 1fr 390px 1fr;
          gap: 14px;
          align-items: stretch;
          padding: 18px;
          border-radius: 34px;
          background: radial-gradient(circle at center, rgba(150, 0, 0, 0.28), transparent 55%), linear-gradient(160deg, #100000, #000 52%, #120000);
          border: 1px solid rgba(190, 0, 0, 0.58);
        }

        .deck {
          position: relative;
          min-height: 760px;
          padding: 18px;
          overflow: hidden;
          border-radius: 32px;
          background: radial-gradient(circle at 50% 42%, rgba(160, 0, 0, 0.24), transparent 55%), linear-gradient(145deg, #090909, #000);
          border: 1px solid rgba(180, 0, 0, 0.48);
          box-shadow: inset 0 0 30px rgba(255, 0, 0, 0.045), 0 18px 30px rgba(0, 0, 0, 0.45);
        }

        .deck-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
        .deck-head strong { color: #ff3b3b; font-size: 22px; }
        .deck-head span { padding: 7px 11px; border-radius: 999px; color: #fff; font-size: 11px; border: 1px solid rgba(180, 0, 0, 0.55); }

        .platter-wrap {
          position: relative;
          width: min(360px, 100%);
          aspect-ratio: 1 / 1;
          display: grid;
          place-items: center;
          margin: 34px auto 18px;
        }

        .platter {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background:
            radial-gradient(circle, #ff1b1b 0 4%, #090909 5% 10%, #222 11% 12%, #050505 13% 22%, #202020 23% 24%, #050505 25% 35%, #232323 36% 37%, #050505 38% 48%, #202020 49% 50%, #050505 51% 62%, #242424 63% 64%, #050505 65%),
            repeating-radial-gradient(circle, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 7px),
            conic-gradient(from 40deg, rgba(255, 0, 0, 0.85), transparent, rgba(120, 0, 0, 0.75), transparent, rgba(255, 0, 0, 0.85));
          border: 14px solid #111;
          box-shadow: 0 0 0 4px rgba(180, 0, 0, 0.2), 0 18px 35px rgba(0, 0, 0, 0.65), inset 0 0 45px rgba(0, 0, 0, 0.9);
        }

        .record-label {
          position: absolute;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: radial-gradient(circle, #fff, #ff1b1b 58%, #420000);
          display: grid;
          place-items: center;
          color: #160000;
          font-weight: 950;
          box-shadow: 0 0 20px rgba(255, 0, 0, 0.35);
        }

        .deck.live .platter,
        .deck.live .record-label { animation: spin 0.9s linear infinite; }

        .deck.cue .platter,
        .deck.cue .record-label { animation: spin 2.6s linear infinite; }

        .needle {
          position: absolute;
          top: 20%;
          right: -2%;
          width: 44%;
          height: 9px;
          border-radius: 999px;
          transform: rotate(27deg);
          transform-origin: right center;
          background: linear-gradient(90deg, #ff1b1b, #650000);
          box-shadow: 0 0 16px rgba(255, 0, 0, 0.45);
        }

        .needle::after {
          content: "";
          position: absolute;
          right: -16px;
          top: -17px;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #ff1b1b;
          box-shadow: 0 0 18px rgba(255, 0, 0, 0.55);
        }

        .deck-label { text-align: center; }
        .deck-label b { display: block; color: #fff; font-size: 19px; }
        .deck-label span { display: block; margin-top: 7px; color: #ff8f8f; font-size: 11px; font-weight: 950; letter-spacing: 0.15em; text-transform: uppercase; }

        .deck-wheel-sliders {
          display: grid;
          gap: 8px;
          margin: 15px 0 12px;
          padding: 12px;
          border-radius: 18px;
          background: rgba(255, 0, 0, 0.045);
          border: 1px solid rgba(180, 0, 0, 0.24);
        }

        .deck-wheel-slider {
          display: grid;
          grid-template-columns: 58px 1fr 36px;
          gap: 8px;
          align-items: center;
        }

        .deck-wheel-slider label { color: #ff6868; font-size: 10px; font-weight: 950; text-transform: uppercase; }
        .deck-wheel-slider input { width: 100%; accent-color: #ff1b1b; }
        .deck-wheel-slider span { color: #fff; font-size: 10px; font-weight: 950; text-align: right; }

        .deck-buttons,
        .deck-quick-pads {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 12px;
        }

        .deck-quick-pads {
          grid-template-columns: repeat(2, 1fr);
        }

        button { font-family: inherit; }

        .deck-buttons button,
        .deck-quick-pads button,
        .btn,
        .mode-buttons button,
        .pad,
        .main-play,
        .footer-tool,
        .display-btn {
          cursor: pointer;
          font-weight: 950;
          text-transform: uppercase;
          transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
        }

        .deck-buttons button,
        .deck-quick-pads button {
          min-height: 42px;
          border: 0;
          border-radius: 14px;
          color: #fff;
          background: linear-gradient(180deg, #b00000, #3b0000);
          box-shadow: 0 6px 0 #050000;
          font-size: 11px;
        }

        .deck-quick-pads button {
          min-height: 44px;
          background: linear-gradient(180deg, #181818, #000);
          border: 1px solid rgba(190, 0, 0, 0.5);
          color: #ff5959;
        }

        .broadcast-center {
          min-height: 760px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 13px;
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(120, 0, 0, 0.18), transparent), #020202;
          border: 1px solid rgba(180, 0, 0, 0.52);
        }

        .cam-box {
          border-radius: 20px;
          overflow: hidden;
          background: #020000;
          border: 1px solid rgba(180, 0, 0, 0.42);
        }

        .cam-view {
          min-height: 148px;
          display: grid;
          place-items: center;
          text-align: center;
          padding: 14px;
          background: radial-gradient(circle, rgba(180, 0, 0, 0.32), transparent 60%), linear-gradient(135deg, #151515, #000);
        }

        .cam-view p { margin: 6px 0 0; color: #ffd7d7; font-size: 13px; }

        .cam-bars,
        .meter-bars {
          display: flex;
          align-items: end;
          gap: 6px;
        }

        .cam-bars { height: 70px; }

        .cam-bars i {
          width: 11px;
          height: 26px;
          border-radius: 999px;
          background: linear-gradient(#ff5a5a, #6f0000);
        }

        .cam-bars.active i,
        .meter-bars.active i { animation: meter 0.7s infinite ease-in-out; }

        .main-play {
          min-height: 72px;
          border: 0;
          border-radius: 20px;
          color: #fff;
          background: linear-gradient(180deg, #b00000, #3a0000);
          box-shadow: 0 7px 0 #050000, 0 0 28px rgba(180, 0, 0, 0.3);
        }

        .main-play.active {
          background: linear-gradient(180deg, #ff1b1b, #650000);
          box-shadow: 0 7px 0 #050000, 0 0 35px rgba(255, 0, 0, 0.45);
        }

        .main-play span { display: block; font-size: 11px; letter-spacing: 0.16em; }
        .main-play b { display: block; margin-top: 3px; font-size: 25px; }

        .broadcast-buttons,
        .mode-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
        }

        .btn {
          min-height: 44px;
          border: 0;
          border-radius: 14px;
          font-size: 10px;
          box-shadow: 0 5px 0 rgba(0, 0, 0, 0.4);
        }

        .btn.blood { background: #9b0000; color: #fff; }

        .mode-buttons button {
          min-height: 36px;
          border-radius: 12px;
          background: #080808;
          color: #ff4b4b;
          border: 1px solid rgba(180, 0, 0, 0.38);
          font-size: 10px;
        }

        .crossfader {
          display: grid;
          grid-template-columns: 58px 1fr 58px;
          align-items: center;
          gap: 8px;
          padding: 11px;
          border-radius: 18px;
          background: #070000;
          border: 1px solid rgba(180, 0, 0, 0.36);
        }

        .crossfader span {
          color: #ff4b4b;
          font-size: 10px;
          font-weight: 950;
          text-transform: uppercase;
          text-align: center;
        }

        .crossfader input { width: 100%; accent-color: #ff1b1b; }

        .slider-bank {
          display: grid;
          grid-template-columns: repeat(15, minmax(34px, 1fr));
          gap: 5px;
          min-height: 200px;
          padding: 7px;
          overflow-x: auto;
          border-radius: 18px;
          background: rgba(255, 0, 0, 0.035);
          border: 1px solid rgba(180, 0, 0, 0.18);
        }

        .control-slider {
          display: grid;
          justify-items: center;
          gap: 5px;
          padding: 6px 3px;
          border-radius: 13px;
          background: rgba(0, 0, 0, 0.56);
          border: 1px solid rgba(180, 0, 0, 0.18);
        }

        .control-slider label {
          color: #ff4b4b;
          font-size: 8px;
          font-weight: 950;
          text-transform: uppercase;
          text-align: center;
        }

        .control-slider input {
          writing-mode: bt-lr;
          -webkit-appearance: slider-vertical;
          width: 25px;
          height: 122px;
          accent-color: #ff1b1b;
        }

        .control-slider strong { color: #fff; font-size: 9px; }

        .pad {
          min-height: 56px;
          border: 0;
          border-radius: 16px;
          box-shadow: 0 5px 0 rgba(0, 0, 0, 0.42);
        }

        .pad small { display: block; font-size: 8px; letter-spacing: 0.14em; }
        .pad strong { display: block; margin-top: 4px; font-size: 12px; }

        .yellow { background: #ff4b4b; color: #fff; }
        .red { background: #9b0000; color: #fff; }
        .green { background: #00ff76; color: #00170b; }
        .blue { background: #00d1ff; color: #001014; }
        .purple { background: #7d1fff; color: #fff; }
        .orange { background: #ff4f00; color: #fff; }

        .mode-display { padding: 18px; }
        .mode-display h3 { margin: 0; color: #ff3b3b; font-size: 34px; line-height: 1; }
        .mode-display p { color: #ffd7d7; line-height: 1.45; }

        .mode-display button {
          width: 100%;
          min-height: 46px;
          border: 0;
          border-radius: 14px;
          background: linear-gradient(180deg, #b00000, #3b0000);
          color: #fff;
          font-weight: 950;
          text-transform: uppercase;
          cursor: pointer;
        }

        .meter { border-top: 1px solid rgba(180, 0, 0, 0.35); }
        .meter-bars { height: 120px; padding: 14px; }

        .meter-bars i {
          flex: 1;
          min-width: 7px;
          height: 22%;
          border-radius: 999px 999px 0 0;
          background: linear-gradient(#ff1b1b, #570000);
          opacity: 0.35;
        }

        .meter-bars.active i { opacity: 1; }

        .side-fill-buttons {
          margin: 14px;
          grid-template-columns: 1fr;
        }

        .footer-dock { margin-top: 16px; }

        .footer-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 9px;
          padding: 13px;
        }

        .footer-tool {
          min-height: 64px;
          border: 0;
          border-radius: 16px;
          display: grid;
          place-items: center;
          text-align: center;
          text-decoration: none;
          box-shadow: 0 5px 0 rgba(0, 0, 0, 0.45);
        }

        .footer-tool strong { display: block; font-size: 12px; }
        .footer-tool span { display: block; margin-top: 3px; font-size: 9px; line-height: 1.2; text-transform: none; opacity: 0.86; }

        button:hover,
        .footer-tool:hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
        }

        /* BIGGER TEXT + REQUESTED STATUS COLORS */
        .control-page {
          font-size: 18px;
        }

        .subtitle {
          font-size: 18px;
          line-height: 1.65;
        }

        .status-card {
          min-height: 104px;
          padding: 18px;
        }

        .status-card small {
          font-size: 13px;
        }

        .status-card strong {
          font-size: 24px;
        }

        .status-light.yellow {
          color: #ffd000;
        }

        .status-light.blue {
          color: #00d1ff;
        }

        .status-light.purple {
          color: #a855ff;
        }

        .panel-heading span {
          font-size: 14px;
        }

        .panel-heading b {
          font-size: 13px;
        }

        .screen h2 {
          font-size: clamp(32px, 3.2vw, 52px);
        }

        .screen p {
          font-size: 19px;
        }

        .now-playing-bar span {
          font-size: 13px;
        }

        .now-playing-bar strong {
          font-size: 20px;
        }

        .now-playing-bar button {
          font-size: 14px;
        }

        .lamp {
          min-height: 48px;
          font-size: 14px;
        }

        .lamp.on.yellow {
          background: #ffd000;
          color: #170b00;
          box-shadow: 0 0 18px rgba(255, 208, 0, 0.65);
        }

        .lamp.on.blue {
          background: #00d1ff;
          color: #001014;
          box-shadow: 0 0 18px rgba(0, 209, 255, 0.65);
        }

        .lamp.on.green {
          background: #00ff76;
          color: #00170b;
          box-shadow: 0 0 18px rgba(0, 255, 118, 0.65);
        }

        .lamp.on.purple {
          background: #a855ff;
          color: #fff;
          box-shadow: 0 0 18px rgba(168, 85, 255, 0.65);
        }

        .smart-mode-switch button span {
          font-size: 17px;
        }

        .smart-mode-switch button b {
          font-size: 13px;
        }

        .hero-tabs button,
        .mode-buttons button,
        .center-pad-bank button,
        .effect-buttons button,
        .side-fill-buttons button {
          font-size: 13px;
        }

        .pad small {
          font-size: 11px;
        }

        .pad strong {
          font-size: 16px;
        }

        .deck-head strong {
          font-size: 28px;
        }

        .deck-head span {
          font-size: 14px;
        }

        .deck-label b {
          font-size: 24px;
        }

        .deck-label span {
          font-size: 13px;
        }

        .deck-buttons button,
        .deck-quick-pads button,
        .btn {
          font-size: 13px;
        }

        .control-slider label {
          font-size: 10px;
        }

        .control-slider strong {
          font-size: 11px;
        }

        .deck-wheel-slider label,
        .deck-wheel-slider span {
          font-size: 12px;
        }

        .mode-display h3 {
          font-size: 42px;
        }

        .mode-display p {
          font-size: 18px;
        }

        .footer-grid {
          grid-template-columns: repeat(11, minmax(110px, 1fr));
        }

        .footer-tool strong {
          font-size: 15px;
        }

        .footer-tool span {
          font-size: 12px;
        }
        .owner-smartdj-command-box {
          display: grid;
          grid-template-columns: 160px 1fr 145px 180px;
          gap: 10px;
          align-items: center;
          margin: 12px 0 14px;
          padding: 12px;
          border-radius: 18px;
          background: rgba(0, 209, 255, 0.08);
          border: 1px solid rgba(0, 209, 255, 0.35);
        }

        .owner-smartdj-command-box strong {
          color: #00d1ff;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: 0.12em;
        }

        .owner-smartdj-command-box input {
          min-height: 42px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,.18);
          padding: 0 12px;
          font-weight: 900;
          color: #111;
        }

        .owner-smartdj-command-box button {
          min-height: 42px;
          border: 0;
          border-radius: 12px;
          background: linear-gradient(180deg, #00d1ff, #00677a);
          color: #001014;
          font-weight: 950;
          text-transform: uppercase;
          cursor: pointer;
        }

        .owner-smartdj-command-box button:nth-of-type(2) {
          background: linear-gradient(180deg, #ffcc00, #9c5b00);
          color: #120700;
        }

        .owner-smartdj-command-box span {
          grid-column: 1 / -1;
          color: #fff;
          font-size: 13px;
          font-weight: 850;
        }
        
.owner-control-smartdj-playlist {
  margin: 14px 0;
  padding: 14px;
  border: 1px solid rgba(0, 217, 255, 0.45);
  border-radius: 18px;
  background: rgba(0, 12, 18, 0.92);
  box-shadow: 0 0 18px rgba(0, 217, 255, 0.12);
  color: #fff;
}

.owner-control-smartdj-playlist-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
}

.owner-control-smartdj-playlist-head strong {
  display: block;
  color: #00d9ff;
  font-size: 14px;
  font-weight: 950;
  letter-spacing: 0.12em;
}

.owner-control-smartdj-playlist-head span {
  display: block;
  margin-top: 3px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
}

.owner-control-smartdj-playlist-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.owner-control-smartdj-playlist-actions button,
.owner-control-smartdj-playlist-row button {
  border: 0;
  border-radius: 12px;
  padding: 9px 14px;
  background: linear-gradient(180deg, #ffcc00, #b98500);
  color: #120700;
  font-weight: 950;
  cursor: pointer;
  text-transform: uppercase;
}

.owner-control-smartdj-playlist-list {
  display: grid;
  gap: 8px;
}

.owner-control-smartdj-playlist-row {
  display: grid;
  grid-template-columns: 1fr 430px;
  align-items: center;
  gap: 10px;
  border: 1px solid rgba(255, 0, 0, 0.45);
  border-radius: 14px;
  padding: 9px;
  background: rgba(24, 0, 0, 0.82);
}

.owner-control-smartdj-playlist-row.is-playing {
  border-color: #00ff73;
  box-shadow: 0 0 16px rgba(0, 255, 115, 0.35);
}

.owner-control-smartdj-playlist-info b {
  display: block;
  color: #fff;
  font-size: 13px;
  font-weight: 950;
}

.owner-control-smartdj-playlist-info small {
  display: block;
  margin-top: 3px;
  color: #9ff3ff;
  font-size: 11px;
  font-weight: 800;
}

.owner-control-smartdj-empty,
.owner-control-smartdj-player-status {
  margin: 8px 0 0;
  color: #fff;
  font-size: 12px;
  font-weight: 850;
}


.owner-control-smartdj-bleep-note {
  display: block;
  margin-top: 4px;
  color: #ff4d4d !important;
  font-size: 11px;
  font-weight: 950;
}

@keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes meter {
          0%, 100% { height: 24%; }
          50% { height: 96%; }
        }

        @media (max-width: 1500px) {
          .status-row { grid-template-columns: repeat(3, 1fr); }
          .now-playing-bar { grid-template-columns: 1fr 1fr; }
          .main-studio { grid-template-columns: 1fr; }
          .turntable-stage { grid-template-columns: 1fr; }
          .deck,
          .broadcast-center { min-height: auto; }
          .log-row { grid-template-columns: repeat(2, 1fr); }
          .footer-grid { grid-template-columns: repeat(5, 1fr); }
        }

        @media (max-width: 760px) {
          .control-page { padding: 12px; }
          .shell { padding: 12px; border-radius: 24px; }
          .topbar { flex-direction: column; align-items: stretch; }
          .brand-badge { width: 100%; }

          .status-row,
          .log-row,
          .now-playing-bar,
          .lamp-grid,
          .hero-pad-grid,
          .smart-mode-switch {
            grid-template-columns: 1fr;
          }

          .broadcast-buttons,
          .mode-buttons,
          .hero-tabs,
          .display-switches,
          .footer-grid,
          .center-pad-bank,
          .effect-buttons {
            grid-template-columns: repeat(2, 1fr);
          }

          .slider-bank {
            grid-template-columns: repeat(15, 42px);
          }
        }
      `}</style>
    </main>
  );
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "green" | "red" | "yellow" | "orange" | "blue" | "purple";
}) {
  return (
    <div className="status-card">
      <span className={`status-light ${tone}`} />
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function PanelHeading({ left, right }: { left: string; right: string }) {
  return (
    <div className="panel-heading">
      <span>{left}</span>
      <b>{right}</b>
    </div>
  );
}

function Turntable({
  title,
  label,
  state,
  quickPads,
  onPad,
  onCue,
  onSync,
  onLoad,
}: {
  title: string;
  label: string;
  state: BroadcastState;
  quickPads: Pad[];
  onPad: (pad: Pad) => void;
  onCue: () => void;
  onSync: () => void;
  onLoad: () => void;
}) {
  const deckClass =
    state === "live" ? "deck live" : state === "cue" ? "deck cue" : "deck";

  return (
    <div className={deckClass}>
      <div className="deck-head">
        <strong>{title}</strong>
        <span>{state === "live" ? "SPINNING" : state === "cue" ? "CUED" : "READY"}</span>
      </div>

      <div className="platter-wrap">
        <div className="platter" />
        <div className="record-label">TC</div>
        <div className="needle" />
      </div>

      <div className="deck-label">
        <b>{label}</b>
        <span>
          {state === "live"
            ? "turntable spinning live"
            : state === "cue"
              ? "slow cue spin"
              : "ready"}
        </span>
      </div>

      <div className="deck-wheel-sliders">
        <DeckWheelSlider label="Pitch" defaultValue={52} />
        <DeckWheelSlider label="Trim" defaultValue={62} />
        <DeckWheelSlider label="Brake" defaultValue={36} />
        <DeckWheelSlider label="Scratch" defaultValue={48} />
        <DeckWheelSlider label="Torque" defaultValue={66} />
        <DeckWheelSlider label="Level" defaultValue={72} />
      </div>

      <div className="deck-buttons">
        <button type="button" onClick={onCue}>RIGHT CUE</button>
        <button type="button" onClick={onSync}>Sync</button>
        <button type="button" onClick={onLoad}>Load</button>
      </div>

      <div className="deck-quick-pads">
        {quickPads.map((pad) => (
          <button key={`${title}-${pad.label}`} type="button" onClick={() => onPad(pad)}>
            {pad.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function DeckWheelSlider({
  label,
  defaultValue,
}: {
  label: string;
  defaultValue: number;
}) {
  const sliderInstanceId = useId();
  const storageKey = `tha-core-deck-slider-${sliderInstanceId}-${label}-${defaultValue}`;
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === null) return;

      const savedNumber = Number(saved);
      if (!Number.isNaN(savedNumber)) {
        setValue(savedNumber);
      }
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(value));
    } catch {
      // ignore storage errors
    }
  }, [storageKey, value]);

  return (
    <div className="deck-wheel-slider">
      <label>{label}</label>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
      />
      <span>{value}%</span>
    </div>
  );
}

function ControlSlider({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
}) {
  const storageKey = `tha-core-owner-slider-${label}`;
  const [localValue, setLocalValue] = useState(value);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);

      if (saved !== null) {
        const savedNumber = Number(saved);

        if (!Number.isNaN(savedNumber)) {
          setLocalValue(savedNumber);
          setValue(savedNumber);
        }
      }
    } catch {
      // ignore storage errors
    }

    setLoaded(true);
  }, [storageKey, setValue]);

  useEffect(() => {
    if (!loaded) return;

    setValue(localValue);

    try {
      window.localStorage.setItem(storageKey, String(localValue));
    } catch {
      // ignore storage errors
    }
  }, [loaded, localValue, setValue, storageKey]);

  return (
    <div className="control-slider">
      <label>{label}</label>
      <input
        type="range"
        min="0"
        max="100"
        value={localValue}
        onChange={(event) => {
          const nextValue = Number(event.target.value);
          setLocalValue(nextValue);
          setValue(nextValue);
        }}
      />
      <strong>{localValue}%</strong>
    </div>
  );
}






































































// SMARTDJ_TOP_STATUS_COUNT_ONLY_V1


// SMARTDJ_TOP_HELD_TEXT_REMOVED_FINAL_V1


// SMARTDJ_LAST_STALE_HELD_TOP_LINE_REMOVED_V1


// SMARTDJ_DISPATCH_LOADED_MESSAGE_COUNT_ONLY_V1

