"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type RadioStatus = {
  ok?: boolean;
  connected?: boolean;
  stationName?: string;
  streamUrl?: string;
  isOnAir?: boolean;
  isLive?: boolean;
  autoDj?: boolean;
  liveDjName?: string | null;
  listeners?: {
    current?: number;
    unique?: number;
    total?: number;
  };
  nowPlaying?: {
    artist?: string;
    title?: string;
    text?: string;
    albumArt?: string | null;
  };
  checkedAt?: string;
  message?: string;
};

const STREAM_URL =
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

const smartPads = [
  "All-In-One Smart",
  "Smart DJ",
  "AutoDJ",
  "Live DJ",
  "Jingles",
  "Ads",
  "Commercial",
  "Birthday Shout",
  "Station ID",
  "Sponsor Tag",
  "Weather Drop",
  "Time Drop",
  "Store Promo",
  "Cash Pot Call",
  "Rewind FX",
  "Air Horn",
];

const shortcuts = [
  { label: "Upload Music", href: "/upload" },
  { label: "Playlists", href: "/radio" },
  { label: "Messages", href: "/chat" },
  { label: "Store", href: "/store" },
  { label: "News", href: "/news" },
  { label: "Blog", href: "/blog" },
  { label: "Weather", href: "/weather-reader" },
  { label: "Time", href: "/time-reader" },
];

export default function OwnerControlPanel() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<RadioStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [adminKey, setAdminKey] = useState("");

  const [monitorPlaying, setMonitorPlaying] = useState(false);
  const [smartDjOn, setSmartDjOn] = useState(true);
  const [autoDjOn, setAutoDjOn] = useState(true);
  const [liveDjArmed, setLiveDjArmed] = useState(false);
  const [commandLoading, setCommandLoading] = useState(false);

  const [masterVolume, setMasterVolume] = useState(80);
  const [deckA, setDeckA] = useState(82);
  const [deckB, setDeckB] = useState(74);
  const [mic, setMic] = useState(55);
  const [jingleLevel, setJingleLevel] = useState(70);
  const [adsLevel, setAdsLevel] = useState(66);
  const [commercialLevel, setCommercialLevel] = useState(64);
  const [bass, setBass] = useState(58);
  const [mid, setMid] = useState(50);
  const [treble, setTreble] = useState(60);
  const [gain, setGain] = useState(62);
  const [echo, setEcho] = useState(22);
  const [reverb, setReverb] = useState(18);
  const [delay, setDelay] = useState(26);
  const [filter, setFilter] = useState(52);
  const [tempo, setTempo] = useState(100);
  const [crossfade, setCrossfade] = useState(50);

  const [lastAction, setLastAction] = useState(
    "Owner command center ready. Skip is real. Monitor is safe. Visitor homepage untouched."
  );

  const stationOnline = Boolean(status?.isOnAir);
  const liveDj = Boolean(status?.isLive);
  const autoDj = Boolean(status?.autoDj);
  const listeners = status?.listeners?.current ?? 0;

  const nowPlaying = useMemo(() => {
    if (status?.nowPlaying?.text) return status.nowPlaying.text;

    const artist = status?.nowPlaying?.artist || "Tha Core";
    const title = status?.nowPlaying?.title || "Live Radio";

    return `${artist} - ${title}`;
  }, [status]);

  async function loadStatus() {
    try {
      setStatusError("");

      const response = await fetch("/api/status", {
        cache: "no-store",
      });

      const data = (await response.json()) as RadioStatus;

      if (!response.ok) {
        setStatus(data);
        setStatusError(data?.message || "Unable to load station status.");
        return;
      }

      setStatus(data);
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Unable to load station status."
      );
    }
  }

  useEffect(() => {
    loadStatus();

    const timer = window.setInterval(() => {
      loadStatus();
    }, 8000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = masterVolume / 100;
    audio.playbackRate = tempo / 100;
  }, [masterVolume, tempo]);

  async function toggleMonitor() {
    const audio = audioRef.current;

    if (!audio) {
      setLastAction("Audio monitor is not ready.");
      return;
    }

    try {
      if (monitorPlaying) {
        audio.pause();
        setMonitorPlaying(false);
        setLastAction("Owner live monitor paused. Listener broadcast was not touched.");
        return;
      }

      audio.src = STREAM_URL;
      audio.volume = masterVolume / 100;
      audio.playbackRate = tempo / 100;

      await audio.play();

      setMonitorPlaying(true);
      setLastAction("Owner live monitor playing. This lets you hear the station inside the panel.");
    } catch {
      setMonitorPlaying(false);
      setLastAction("Monitor failed. Check browser audio permission or stream.");
    }
  }

  async function sendRadioCommand(command: string, successMessage: string) {
    if (!adminKey.trim()) {
      setLastAction("Enter your admin control key before sending this command.");
      return;
    }

    try {
      setCommandLoading(true);
      setLastAction(`Sending ${command} command...`);

      const response = await fetch("/api/control/radio-command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({ command }),
      });

      let data: { ok?: boolean; message?: string; warning?: string } = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok || data?.ok === false) {
        setLastAction(data?.message || `${command} command failed.`);
        return;
      }

      setLastAction(data?.warning ? `${successMessage} ${data.warning}` : successMessage);
      await loadStatus();
    } catch (error) {
      setLastAction(
        error instanceof Error ? error.message : `${command} command error.`
      );
    } finally {
      setCommandLoading(false);
    }
  }

  async function skipSong() {
    await sendRadioCommand("skip", "Skip command sent to AzuraCast.");
  }

  async function restartAutoDj() {
    await sendRadioCommand("backend_restart", "AutoDJ/backend restart command sent.");
  }

  function runAllInOneSmart() {
    setSmartDjOn(true);
    setAutoDjOn(true);
    setLiveDjArmed(true);
    setJingleLevel(75);
    setAdsLevel(65);
    setCommercialLevel(68);
    setEcho(28);
    setReverb(24);
    setDelay(30);
    setLastAction(
      "All-In-One Smart armed: Smart DJ ON, AutoDJ ON, Live DJ armed, jingle/ads/commercial/effects levels prepared."
    );
  }

  async function handlePad(label: string) {
    if (label === "All-In-One Smart") {
      runAllInOneSmart();
      return;
    }

    if (label === "Smart DJ") {
      setSmartDjOn((value) => !value);
      setLastAction(`Smart DJ switched ${smartDjOn ? "OFF" : "ON"}.`);
      return;
    }

    if (label === "AutoDJ") {
      setAutoDjOn((value) => !value);
      setLastAction(`AutoDJ local control switched ${autoDjOn ? "OFF" : "ON"}.`);
      return;
    }

    if (label === "Live DJ") {
      setLiveDjArmed((value) => !value);
      setLastAction(`Live DJ mode ${liveDjArmed ? "disarmed" : "armed"}.`);
      return;
    }

    if (label === "Jingles") {
      await sendRadioCommand("jingles", "Jingle request sent to AzuraCast.");
      return;
    }

    if (label === "Ads") {
      await sendRadioCommand("ads", "Ad request sent to AzuraCast.");
      return;
    }

    if (label === "Commercial") {
      await sendRadioCommand("commercial", "Commercial request sent to AzuraCast.");
      return;
    }

    if (label === "Birthday Shout") {
      await sendRadioCommand("birthday", "Birthday shoutout request sent to AzuraCast.");
      return;
    }

    setLastAction(`${label} button fired.`);
  }

  function padStyle(label: string): CSSProperties {
    if (label === "All-In-One Smart") {
      return {
        ...styles.padButton,
        gridColumn: "span 2",
        background: "linear-gradient(135deg, #ffd400, #ff3131)",
        color: "#160000",
        borderColor: "rgba(255,212,0,0.95)",
        boxShadow: "0 0 28px rgba(255,212,0,0.28)",
      };
    }

    if (label === "Smart DJ") {
      return {
        ...styles.padButton,
        background: smartDjOn
          ? "linear-gradient(135deg, #ffd400, #ff8c00)"
          : "linear-gradient(135deg, #252525, #050505)",
        color: smartDjOn ? "#160000" : "#ffd400",
        borderColor: "rgba(255,212,0,0.75)",
      };
    }

    if (label === "AutoDJ") {
      return {
        ...styles.padButton,
        background: autoDjOn
          ? "linear-gradient(135deg, #00ff7f, #ffd400)"
          : "linear-gradient(135deg, #252525, #050505)",
        color: autoDjOn ? "#001d0e" : "#ffd400",
        borderColor: autoDjOn ? "rgba(0,255,127,0.8)" : "rgba(255,212,0,0.4)",
      };
    }

    if (label === "Live DJ") {
      return {
        ...styles.padButton,
        background: liveDjArmed
          ? "linear-gradient(135deg, #ff3131, #ffd400)"
          : "linear-gradient(135deg, #9d0000, #300000)",
        color: liveDjArmed ? "#160000" : "#fff",
        borderColor: "rgba(255,49,49,0.9)",
      };
    }

    if (label.includes("Birthday")) {
      return {
        ...styles.padButton,
        background: "linear-gradient(135deg, #ff4fd8, #ffd400)",
        color: "#160000",
        borderColor: "rgba(255,79,216,0.9)",
      };
    }

    if (label.includes("Ads")) {
      return {
        ...styles.padButton,
        background: "linear-gradient(135deg, #00d9ff, #ffd400)",
        color: "#001017",
        borderColor: "rgba(0,217,255,0.9)",
      };
    }

    if (label.includes("Commercial")) {
      return {
        ...styles.padButton,
        background: "linear-gradient(135deg, #ff3131, #8b0000)",
        color: "#fff",
        borderColor: "rgba(255,49,49,0.9)",
      };
    }

    return styles.padButton;
  }

  return (
    <main style={styles.page}>
      <audio ref={audioRef} preload="none" />

      <section style={styles.shell}>
        <section style={styles.cameraTopPanel}>
          <div>
            <p style={styles.yellowTiny}>LIVE STUDIO CAM</p>
            <h2 style={styles.sectionTitle}>DJ Cam / Caller Screen</h2>
          </div>

          <div style={styles.cameraScreen}>
            <span style={styles.recordingLight} />
            <p style={styles.cameraTitle}>Studio Feed Ready</p>
            <p style={styles.muted}>
              Camera/call-in section is above the hero page.
            </p>
          </div>

          <div style={styles.cameraButtons}>
            <button
              type="button"
              onClick={() => setLastAction("Video call selected.")}
              style={styles.yellowButton}
            >
              Video Call
            </button>

            <button
              type="button"
              onClick={() => setLastAction("Listener call-in selected.")}
              style={styles.redButton}
            >
              Call-In
            </button>
          </div>
        </section>

        <header style={styles.hero}>
          <div style={styles.heroTop}>
            <div>
              <p style={styles.kicker}>THA CORE OWNER CONTROL PANEL</p>
              <h1 style={styles.title}>Red & Black Smart DJ Board</h1>
              <p style={styles.subtitle}>
                Big turntables, safe Play Monitor button, real Skip command,
                AutoDJ restart, All-In-One Smart, Smart DJ, AutoDJ, Live DJ,
                jingles, ads, commercials, compact yellow sliders, and effects.
              </p>
            </div>

            <div style={styles.statusGrid}>
              <StatusLight
                label="Station"
                value={stationOnline ? "ON AIR" : "OFF AIR"}
                color={stationOnline ? "#00ff7f" : "#ff3131"}
              />
              <StatusLight
                label="Azura AutoDJ"
                value={autoDj ? "ON" : "OFF"}
                color={autoDj ? "#ffd400" : "#ff3131"}
              />
              <StatusLight
                label="Live DJ"
                value={liveDj ? "LIVE" : "NO"}
                color={liveDj ? "#00ff7f" : "#ff3131"}
              />
              <StatusLight
                label="Listeners"
                value={`${listeners}`}
                color="#00d9ff"
              />
            </div>
          </div>

          <section style={styles.controlBar}>
            <button
              type="button"
              onClick={toggleMonitor}
              style={styles.broadcastPlayButton}
            >
              {monitorPlaying ? "Pause Live Monitor" : "Play Live Monitor"}
            </button>

            <button
              type="button"
              onClick={skipSong}
              disabled={commandLoading}
              style={styles.skipButtonTop}
            >
              {commandLoading ? "Sending..." : "Skip Song"}
            </button>

            <button
              type="button"
              onClick={restartAutoDj}
              disabled={commandLoading}
              style={styles.restartButton}
            >
              Restart AutoDJ
            </button>

            <label style={styles.adminHeroLabel}>
              Admin Key
              <input
                type="password"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                placeholder="Private key"
                style={styles.adminHeroInput}
              />
            </label>
          </section>

          <section style={styles.smartHeroPanel}>
            <div style={styles.smartHeader}>
              <div>
                <p style={styles.yellowTiny}>ONE-CLICK COMMAND BUTTONS</p>
                <h2 style={styles.sectionTitle}>
                  Smart DJ / AutoDJ / Live DJ / Jingles / Ads / Commercials
                </h2>
              </div>

              <div style={styles.modePills}>
                <span
                  style={{
                    ...styles.modePill,
                    color: smartDjOn ? "#ffd400" : "#ff8080",
                    borderColor: smartDjOn
                      ? "rgba(255,212,0,0.7)"
                      : "rgba(255,49,49,0.55)",
                  }}
                >
                  Smart DJ: {smartDjOn ? "ON" : "OFF"}
                </span>
                <span
                  style={{
                    ...styles.modePill,
                    color: autoDjOn ? "#00ff7f" : "#ff8080",
                    borderColor: autoDjOn
                      ? "rgba(0,255,127,0.7)"
                      : "rgba(255,49,49,0.55)",
                  }}
                >
                  AutoDJ: {autoDjOn ? "ON" : "OFF"}
                </span>
                <span
                  style={{
                    ...styles.modePill,
                    color: liveDjArmed ? "#ffd400" : "#ff8080",
                    borderColor: liveDjArmed
                      ? "rgba(255,212,0,0.7)"
                      : "rgba(255,49,49,0.55)",
                  }}
                >
                  Live DJ: {liveDjArmed ? "ARMED" : "OFF"}
                </span>
              </div>
            </div>

            <div style={styles.padGrid}>
              {smartPads.map((pad) => (
                <button
                  key={pad}
                  type="button"
                  onClick={() => handlePad(pad)}
                  style={padStyle(pad)}
                >
                  {pad}
                </button>
              ))}
            </div>
          </section>
        </header>

        <section style={styles.nowPanel}>
          <div>
            <p style={styles.yellowTiny}>NOW PLAYING</p>
            <h2 style={styles.nowTitle}>{nowPlaying}</h2>
            <p style={styles.muted}>
              Station: {status?.stationName || "Tha Core Online Radio"}
            </p>
          </div>

          <div style={styles.nowButtons}>
            <button type="button" onClick={loadStatus} style={styles.yellowButton}>
              Refresh Status
            </button>

            <button
              type="button"
              onClick={() =>
                setLastAction(
                  "Skip is confirmed working through AzuraCast. Broadcast start returned 500 from Azura, so Play/Pause is owner monitor only until backend start is inspected."
                )
              }
              style={styles.darkButton}
            >
              Help
            </button>
          </div>
        </section>

        {statusError ? <p style={styles.errorBox}>{statusError}</p> : null}

        <section style={styles.boardGrid}>
          <TurntableDeck
            title="Deck A"
            subtitle="Live Stream"
            active={monitorPlaying}
            level={deckA}
            setLevel={setDeckA}
            onAction={setLastAction}
          />

          <section style={styles.mixer}>
            <p style={styles.yellowTiny}>MAIN MIXER</p>
            <h2 style={styles.mixerTitle}>Compact Yellow Slider Bank</h2>

            <div style={styles.sliderBank}>
              <MixerSlider label="Master" value={masterVolume} setValue={setMasterVolume} />
              <MixerSlider label="Deck A" value={deckA} setValue={setDeckA} />
              <MixerSlider label="Deck B" value={deckB} setValue={setDeckB} />
              <MixerSlider label="Mic" value={mic} setValue={setMic} />
              <MixerSlider label="Jingle" value={jingleLevel} setValue={setJingleLevel} />
              <MixerSlider label="Ads" value={adsLevel} setValue={setAdsLevel} />
              <MixerSlider
                label="Comm"
                value={commercialLevel}
                setValue={setCommercialLevel}
              />
              <MixerSlider label="Bass" value={bass} setValue={setBass} />
              <MixerSlider label="Mid" value={mid} setValue={setMid} />
              <MixerSlider label="Treble" value={treble} setValue={setTreble} />
              <MixerSlider label="Gain" value={gain} setValue={setGain} />
              <MixerSlider label="Echo" value={echo} setValue={setEcho} />
              <MixerSlider label="Reverb" value={reverb} setValue={setReverb} />
              <MixerSlider label="Delay" value={delay} setValue={setDelay} />
              <MixerSlider label="Filter" value={filter} setValue={setFilter} />
              <MixerSlider label="Tempo" value={tempo} setValue={setTempo} />
            </div>

            <label style={styles.crossLabel}>
              Crossfader: {crossfade}%
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={crossfade}
                onChange={(event) => setCrossfade(Number(event.target.value))}
                style={styles.crossSlider}
              />
            </label>
          </section>

          <TurntableDeck
            title="Deck B"
            subtitle="Jingles / Ads"
            active={smartDjOn}
            level={deckB}
            setLevel={setDeckB}
            onAction={setLastAction}
          />
        </section>

        <section style={styles.effectsAndLog}>
          <section style={styles.fxRack}>
            <p style={styles.yellowTiny}>EFFECTS RACK</p>
            <h2 style={styles.sectionTitle}>Echo / Reverb / Delay Controls</h2>

            <div style={styles.fxButtons}>
              {[
                "Echo Throw",
                "Reverb Room",
                "Delay Freeze",
                "Filter Sweep",
                "Bass Drop",
                "Treble Cut",
                "Mic Duck",
                "Limiter Hit",
              ].map((effect) => (
                <button
                  key={effect}
                  type="button"
                  onClick={() => setLastAction(`${effect} selected.`)}
                  style={styles.fxButton}
                >
                  {effect}
                </button>
              ))}
            </div>
          </section>

          <section style={styles.logPanel}>
            <p style={styles.yellowTiny}>PANEL LOG</p>
            <h2 style={styles.sectionTitle}>Last Action</h2>
            <p style={styles.lastAction}>{lastAction}</p>

            <div style={styles.quickRow}>
              <button
                type="button"
                onClick={() => setLastAction("Go Live selected.")}
                style={styles.greenCommand}
              >
                Go Live
              </button>
              <button
                type="button"
                onClick={() => setLastAction("AutoDJ selected.")}
                style={styles.yellowCommand}
              >
                AutoDJ
              </button>
              <button
                type="button"
                onClick={() => setLastAction("Commercial break selected.")}
                style={styles.redCommand}
              >
                Commercial
              </button>
              <button
                type="button"
                onClick={() => setLastAction("All status refreshed.")}
                style={styles.darkCommand}
              >
                Refresh All
              </button>
            </div>
          </section>
        </section>

        <section style={styles.shortcutGrid}>
          {shortcuts.map((item) => (
            <a key={item.href} href={item.href} style={styles.shortcutCard}>
              <span style={styles.shortcutTitle}>{item.label}</span>
              <span style={styles.shortcutOpen}>Open</span>
            </a>
          ))}
        </section>
      </section>

      <style jsx global>{`
        @keyframes spinRecord {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulseGlow {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(0.92);
          }

          50% {
            opacity: 1;
            transform: scale(1.14);
          }
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #030000;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </main>
  );
}

function StatusLight({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <article style={styles.statusCard}>
      <span
        style={{
          ...styles.statusDot,
          background: color,
          boxShadow: `0 0 18px ${color}`,
        }}
      />
      <div>
        <p style={styles.statusLabel}>{label}</p>
        <p style={{ ...styles.statusValue, color }}>{value}</p>
      </div>
    </article>
  );
}

function MixerSlider({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
}) {
  return (
    <label style={styles.sliderWrap}>
      <span style={styles.sliderLabel}>{label}</span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        style={styles.verticalSlider}
      />
      <span style={styles.sliderValue}>{value}</span>
    </label>
  );
}

function TurntableDeck({
  title,
  subtitle,
  active,
  level,
  setLevel,
  onAction,
}: {
  title: string;
  subtitle: string;
  active: boolean;
  level: number;
  setLevel: (value: number) => void;
  onAction: (message: string) => void;
}) {
  const deckButtons = [
    "Cue",
    "Stop",
    "Loop",
    "Scratch",
    "Brake",
    "Reverse",
    "Sync",
    "Hot Cue",
  ];

  return (
    <section style={styles.deck}>
      <div style={styles.deckHeader}>
        <div>
          <p style={styles.yellowTiny}>{title}</p>
          <h2 style={styles.deckTitle}>{subtitle}</h2>
        </div>

        <span
          style={{
            ...styles.deckLight,
            background: active ? "#ffd400" : "#ff3131",
            boxShadow: active
              ? "0 0 24px rgba(255,212,0,0.9)"
              : "0 0 24px rgba(255,49,49,0.9)",
          }}
        />
      </div>

      <div style={styles.turntableArea}>
        <div
          style={{
            ...styles.record,
            animationPlayState: active ? "running" : "paused",
          }}
        >
          <div style={styles.recordLineOne} />
          <div style={styles.recordLineTwo} />
          <div style={styles.recordLineThree} />
          <div style={styles.recordCenter}>TC</div>
        </div>
      </div>

      <div style={styles.deckButtonGrid}>
        {deckButtons.map((button, index) => (
          <button
            key={button}
            type="button"
            onClick={() => onAction(`${title} ${button} selected.`)}
            style={index % 2 === 0 ? styles.deckYellowButton : styles.deckRedButton}
          >
            {button}
          </button>
        ))}
      </div>

      <label style={styles.deckLevelLabel}>
        Deck Level: {level}%
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={level}
          onChange={(event) => setLevel(Number(event.target.value))}
          style={styles.deckSlider}
        />
      </label>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(255,0,0,0.26), transparent 30%), radial-gradient(circle at top right, rgba(255,212,0,0.12), transparent 28%), linear-gradient(180deg, #030000 0%, #170000 48%, #050000 100%)",
    color: "#fff",
    fontFamily:
      "Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "28px",
  },

  shell: {
    width: "100%",
    maxWidth: "1920px",
    margin: "0 auto",
  },

  cameraTopPanel: {
    marginBottom: "20px",
    borderRadius: "32px",
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.92), rgba(80,0,0,0.55))",
    border: "2px solid rgba(255,49,49,0.48)",
    boxShadow: "0 20px 55px rgba(0,0,0,0.44)",
    padding: "24px",
    display: "grid",
    gridTemplateColumns: "330px 1fr 260px",
    gap: "18px",
    alignItems: "center",
  },

  cameraScreen: {
    minHeight: "170px",
    borderRadius: "24px",
    background:
      "radial-gradient(circle at center, rgba(255,0,0,0.18), transparent 44%), linear-gradient(135deg, #050505, #181818)",
    border: "1px solid rgba(255,49,49,0.34)",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    position: "relative",
    padding: "20px",
  },

  recordingLight: {
    position: "absolute",
    top: "18px",
    right: "18px",
    width: "16px",
    height: "16px",
    borderRadius: "999px",
    background: "#ff3131",
    boxShadow: "0 0 18px rgba(255,49,49,0.95)",
    animationName: "pulseGlow",
    animationDuration: "1s",
    animationIterationCount: "infinite",
  },

  cameraTitle: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 1000,
  },

  cameraButtons: {
    display: "grid",
    gap: "12px",
  },

  hero: {
    borderRadius: "36px",
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.97), rgba(100,0,0,0.72))",
    border: "2px solid rgba(255,49,49,0.55)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.58)",
    padding: "34px",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "28px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },

  kicker: {
    margin: "0 0 14px",
    color: "#ffd400",
    fontSize: "14px",
    letterSpacing: "0.34em",
    fontWeight: 1000,
  },

  title: {
    margin: 0,
    fontSize: "clamp(42px, 5vw, 84px)",
    lineHeight: 0.95,
    fontWeight: 1000,
  },

  subtitle: {
    margin: "18px 0 0",
    maxWidth: "980px",
    color: "rgba(255,255,255,0.76)",
    fontSize: "20px",
    lineHeight: 1.45,
    fontWeight: 800,
  },

  statusGrid: {
    minWidth: "460px",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  statusCard: {
    minHeight: "84px",
    borderRadius: "20px",
    background: "rgba(0,0,0,0.62)",
    border: "1px solid rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px",
  },

  statusDot: {
    width: "15px",
    height: "15px",
    borderRadius: "999px",
    flex: "0 0 auto",
    animationName: "pulseGlow",
    animationDuration: "1.2s",
    animationIterationCount: "infinite",
  },

  statusLabel: {
    margin: "0 0 5px",
    color: "rgba(255,255,255,0.62)",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  statusValue: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 1000,
  },

  controlBar: {
    marginTop: "26px",
    display: "grid",
    gridTemplateColumns: "230px 150px 170px 1fr",
    gap: "12px",
    alignItems: "end",
    borderRadius: "24px",
    background: "rgba(0,0,0,0.62)",
    border: "1px solid rgba(255,212,0,0.35)",
    padding: "18px",
  },

  broadcastPlayButton: {
    border: "2px solid rgba(255,212,0,0.8)",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #ffd400, #ff3131)",
    color: "#160000",
    padding: "18px",
    fontSize: "16px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  skipButtonTop: {
    border: 0,
    borderRadius: "18px",
    background: "linear-gradient(135deg, #9d0000, #ff3131)",
    color: "#fff",
    padding: "18px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  restartButton: {
    border: "1px solid rgba(255,212,0,0.65)",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #ffd400, #b8860b)",
    color: "#170000",
    padding: "18px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  adminHeroLabel: {
    display: "block",
    color: "rgba(255,255,255,0.76)",
    fontWeight: 900,
  },

  adminHeroInput: {
    width: "100%",
    marginTop: "8px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    borderRadius: "16px",
    padding: "14px 15px",
    outline: "none",
    fontSize: "15px",
  },

  smartHeroPanel: {
    marginTop: "24px",
    borderRadius: "30px",
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.72), rgba(25,0,0,0.72))",
    border: "1px solid rgba(255,212,0,0.35)",
    padding: "22px",
  },

  smartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },

  yellowTiny: {
    margin: "0 0 8px",
    color: "#ffd400",
    fontSize: "13px",
    fontWeight: 1000,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 1000,
  },

  modePills: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },

  modePill: {
    border: "1px solid",
    borderRadius: "999px",
    background: "rgba(0,0,0,0.5)",
    padding: "10px 13px",
    fontWeight: 1000,
  },

  padGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
    gap: "12px",
  },

  padButton: {
    minHeight: "82px",
    border: "2px solid rgba(255,212,0,0.6)",
    borderRadius: "20px",
    background: "linear-gradient(135deg, #ffd400, #b8860b)",
    color: "#160000",
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: "0 14px 30px rgba(0,0,0,0.34)",
  },

  nowPanel: {
    marginTop: "20px",
    borderRadius: "30px",
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.88), rgba(120,0,0,0.38))",
    border: "1px solid rgba(255,212,0,0.35)",
    padding: "24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "18px",
    flexWrap: "wrap",
  },

  nowTitle: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 1000,
  },

  muted: {
    margin: "10px 0 0",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.45,
    fontWeight: 750,
  },

  nowButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  yellowButton: {
    border: "1px solid rgba(255,212,0,0.55)",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #ffd400, #b8860b)",
    color: "#180000",
    padding: "15px 22px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  redButton: {
    border: 0,
    borderRadius: "999px",
    background: "linear-gradient(135deg, #9d0000, #ff3131)",
    color: "#fff",
    padding: "15px 22px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  darkButton: {
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    padding: "15px 22px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  errorBox: {
    marginTop: "18px",
    borderRadius: "18px",
    background: "rgba(255,0,0,0.14)",
    border: "1px solid rgba(255,0,0,0.35)",
    color: "#ffb3b3",
    padding: "14px 18px",
    fontWeight: 800,
  },

  boardGrid: {
    marginTop: "20px",
    display: "grid",
    gridTemplateColumns: "1.08fr 1.1fr 1.08fr",
    gap: "18px",
  },

  deck: {
    borderRadius: "36px",
    background:
      "radial-gradient(circle at center, rgba(255,212,0,0.11), transparent 58%), linear-gradient(180deg, rgba(20,0,0,0.96), rgba(0,0,0,0.96))",
    border: "2px solid rgba(255,49,49,0.45)",
    padding: "24px",
    boxShadow: "0 22px 60px rgba(0,0,0,0.46)",
  },

  deckHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
  },

  deckTitle: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 1000,
  },

  deckLight: {
    width: "20px",
    height: "20px",
    borderRadius: "999px",
    animationName: "pulseGlow",
    animationDuration: "1.2s",
    animationIterationCount: "infinite",
  },

  turntableArea: {
    minHeight: "430px",
    display: "grid",
    placeItems: "center",
  },

  record: {
    width: "350px",
    height: "350px",
    borderRadius: "999px",
    background:
      "radial-gradient(circle, #111 0 12%, #2b2b2b 13% 16%, #050505 17% 100%)",
    border: "10px solid rgba(255,255,255,0.08)",
    boxShadow:
      "inset 0 0 60px rgba(255,255,255,0.08), 0 30px 70px rgba(0,0,0,0.65), 0 0 35px rgba(255,49,49,0.25)",
    position: "relative",
    animationName: "spinRecord",
    animationDuration: "8s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },

  recordLineOne: {
    position: "absolute",
    inset: "55px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  recordLineTwo: {
    position: "absolute",
    inset: "108px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  recordLineThree: {
    position: "absolute",
    inset: "146px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  recordCenter: {
    position: "absolute",
    inset: "132px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #ffd400, #9d0000)",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: "42px",
    fontWeight: 1000,
    boxShadow: "0 0 30px rgba(255,0,0,0.6)",
  },

  deckButtonGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "10px",
    marginBottom: "14px",
  },

  deckYellowButton: {
    border: "1px solid rgba(255,212,0,0.55)",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #ffd400, #b8860b)",
    color: "#180000",
    padding: "13px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  deckRedButton: {
    border: 0,
    borderRadius: "16px",
    background: "linear-gradient(135deg, #9d0000, #ff3131)",
    color: "#fff",
    padding: "13px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  deckLevelLabel: {
    display: "block",
    color: "#fff",
    fontWeight: 900,
  },

  deckSlider: {
    width: "100%",
    marginTop: "10px",
    accentColor: "#ffd400",
  },

  mixer: {
    borderRadius: "36px",
    background:
      "linear-gradient(180deg, rgba(20,20,20,0.98), rgba(0,0,0,0.98))",
    border: "2px solid rgba(255,212,0,0.25)",
    padding: "24px",
    boxShadow: "0 22px 60px rgba(0,0,0,0.46)",
  },

  mixerTitle: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 1000,
  },

  sliderBank: {
    marginTop: "22px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "10px",
  },

  sliderWrap: {
    borderRadius: "16px",
    background: "rgba(255,255,255,0.045)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "10px",
    color: "#fff",
    fontWeight: 900,
  },

  sliderLabel: {
    display: "block",
    color: "#ffd400",
    fontSize: "12px",
    fontWeight: 1000,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    textAlign: "center",
  },

  verticalSlider: {
    width: "100%",
    marginTop: "10px",
    accentColor: "#ffd400",
  },

  sliderValue: {
    display: "block",
    marginTop: "5px",
    color: "rgba(255,255,255,0.7)",
    fontSize: "12px",
    textAlign: "center",
  },

  crossLabel: {
    display: "block",
    color: "#fff",
    fontWeight: 900,
    marginTop: "18px",
  },

  crossSlider: {
    width: "100%",
    marginTop: "10px",
    accentColor: "#ffd400",
  },

  effectsAndLog: {
    marginTop: "20px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
  },

  fxRack: {
    borderRadius: "30px",
    background: "rgba(0,0,0,0.78)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "24px",
  },

  fxButtons: {
    marginTop: "18px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
  },

  fxButton: {
    minHeight: "66px",
    border: "1px solid rgba(255,212,0,0.55)",
    borderRadius: "16px",
    background: "linear-gradient(135deg, #ffd400, #b8860b)",
    color: "#180000",
    padding: "12px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  logPanel: {
    borderRadius: "30px",
    background: "rgba(0,0,0,0.78)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "24px",
  },

  lastAction: {
    minHeight: "110px",
    margin: "18px 0",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "16px",
    fontWeight: 850,
    lineHeight: 1.45,
  },

  quickRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "10px",
  },

  greenCommand: {
    border: "1px solid rgba(0,255,127,0.45)",
    borderRadius: "16px",
    background: "rgba(0,255,127,0.14)",
    color: "#00ff7f",
    padding: "14px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  yellowCommand: {
    border: "1px solid rgba(255,212,0,0.55)",
    borderRadius: "16px",
    background: "rgba(255,212,0,0.16)",
    color: "#ffd400",
    padding: "14px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  redCommand: {
    border: "1px solid rgba(255,49,49,0.55)",
    borderRadius: "16px",
    background: "rgba(255,49,49,0.16)",
    color: "#ff8080",
    padding: "14px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  darkCommand: {
    border: "1px solid rgba(255,255,255,0.14)",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.08)",
    color: "#fff",
    padding: "14px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  shortcutGrid: {
    marginTop: "20px",
    display: "grid",
    gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
    gap: "12px",
  },

  shortcutCard: {
    textDecoration: "none",
    color: "#fff",
    borderRadius: "18px",
    background: "rgba(0,0,0,0.72)",
    border: "1px solid rgba(255,212,0,0.25)",
    padding: "16px",
    minHeight: "105px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  shortcutTitle: {
    color: "#fff",
    fontWeight: 1000,
    fontSize: "16px",
  },

  shortcutOpen: {
    color: "#ffd400",
    fontWeight: 1000,
    fontSize: "13px",
  },
};