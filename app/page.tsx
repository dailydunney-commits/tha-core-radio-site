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
    elapsed?: number;
    remaining?: number;
  };
  checkedAt?: string;
  message?: string;
};

const FALLBACK_STREAM =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

export default function HomePage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<RadioStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [isPanelMusicOn, setIsPanelMusicOn] = useState(false);
  const [monitorMusic, setMonitorMusic] = useState(true);
  const [volume, setVolume] = useState(0.75);
  const [tempo, setTempo] = useState(1);
  const [skipLoading, setSkipLoading] = useState(false);
  const [adminKey, setAdminKey] = useState("");

  const streamUrl = status?.streamUrl || FALLBACK_STREAM;

  const nowPlayingText = useMemo(() => {
    const artist = status?.nowPlaying?.artist || "Tha Core";
    const title = status?.nowPlaying?.title || "Live Radio";

    if (status?.nowPlaying?.text) {
      return status.nowPlaying.text;
    }

    return `${artist} - ${title}`;
  }, [status]);

  async function loadRadioStatus() {
    try {
      const response = await fetch("/api/radio/status", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatus(data);
        setStatusError(data?.message || "Unable to connect to radio status.");
        return;
      }

      setStatus(data);
      setStatusError("");
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Radio status error."
      );
    }
  }

  useEffect(() => {
    loadRadioStatus();

    const timer = window.setInterval(() => {
      loadRadioStatus();
    }, 8000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.volume = volume;
    audioRef.current.playbackRate = tempo;
  }, [volume, tempo]);

  useEffect(() => {
    if (!audioRef.current) return;

    if (!monitorMusic) {
      audioRef.current.pause();
      setIsPanelMusicOn(false);
    }
  }, [monitorMusic]);

  async function togglePanelMusic() {
    if (!audioRef.current || !monitorMusic) return;

    try {
      if (isPanelMusicOn) {
        audioRef.current.pause();
        setIsPanelMusicOn(false);
      } else {
        audioRef.current.src = streamUrl;
        audioRef.current.volume = volume;
        audioRef.current.playbackRate = tempo;
        await audioRef.current.play();
        setIsPanelMusicOn(true);
      }
    } catch {
      setIsPanelMusicOn(false);
      setStatusError("Browser blocked playback. Click Play again.");
    }
  }

  async function sendSkipCommand() {
    if (!adminKey.trim()) {
      setStatusError("Enter your admin control key before sending command.");
      return;
    }

    try {
      setSkipLoading(true);
      setStatusError("");

      const response = await fetch("/api/control/radio-command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey.trim(),
        },
        body: JSON.stringify({
          command: "skip",
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        setStatusError(data?.message || "Skip command failed.");
        return;
      }

      await loadRadioStatus();
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Skip command error."
      );
    } finally {
      setSkipLoading(false);
    }
  }

  const onAir = Boolean(status?.isOnAir);
  const isLive = Boolean(status?.isLive);
  const autoDj = Boolean(status?.autoDj);
  const connected = Boolean(status?.connected);

  return (
    <main style={styles.page}>
      <audio ref={audioRef} preload="none" />

      <section style={styles.shell}>
        <section style={styles.hero}>
          <div style={styles.heroGlow} />

          <img
            src="/logo.png"
            alt="Tha Core Online Radio Logo"
            style={styles.logo}
          />

          <div style={styles.heroContent}>
            <div style={styles.topBadgeRow}>
              <span style={styles.liveBadge}>LIVE FROM THA CORE</span>
              <span style={styles.connectedBadge}>
                {connected ? "CONNECTED" : "CONNECTING"}
              </span>
            </div>

            <h1 style={styles.title}>Tha Core Online Radio</h1>

            <p style={styles.subtitle}>
              Control panel connection, live radio status, AutoDJ monitoring,
              and listener stream control in one clean dashboard.
            </p>

            <div style={styles.lightRail}>
              {Array.from({ length: 12 }).map((_, index) => (
                <span
                  key={index}
                  style={{
                    ...styles.redBroadcastLight,
                    animationDelay: `${index * 0.08}s`,
                  }}
                />
              ))}
            </div>

            <div style={styles.ticker}>
              <span style={styles.tickerLabel}>NOW PLAYING</span>
              <span style={styles.tickerText}>{nowPlayingText}</span>
            </div>

            <div style={styles.heroButtons}>
              <button
                type="button"
                onClick={togglePanelMusic}
                disabled={!monitorMusic}
                style={{
                  ...styles.mainButton,
                  opacity: monitorMusic ? 1 : 0.45,
                }}
              >
                {isPanelMusicOn ? "Pause Panel Music" : "Play Panel Music"}
              </button>

              <button
                type="button"
                onClick={loadRadioStatus}
                style={styles.secondaryButton}
              >
                Refresh Status
              </button>

              <a href="/cashpot" style={styles.cashpotButton}>
                Cash Pot
              </a>
            </div>
          </div>
        </section>

        <section style={styles.statusGrid}>
          <StatusCard
            title="On Air"
            value={onAir ? "Online" : "Offline"}
            color={onAir ? "#00ff7f" : "#ff2d2d"}
            description="This shows if the station stream is reachable."
          />

          <StatusCard
            title="Go Live"
            value={isLive ? "Live DJ" : "Not Live"}
            color={isLive ? "#00ff7f" : "#ff2d2d"}
            description={
              isLive
                ? status?.liveDjName || "Live broadcaster connected."
                : "AutoDJ or station stream is active."
            }
          />

          <StatusCard
            title="AutoDJ"
            value={autoDj ? "AutoDJ On" : "AutoDJ Off"}
            color={autoDj ? "#ffcc00" : "#ff2d2d"}
            description="Yellow means AutoDJ is running."
          />

          <StatusCard
            title="Listeners"
            value={`${status?.listeners?.current ?? 0}`}
            color="#00d9ff"
            description="Current live listeners from AzuraCast."
          />
        </section>

        <section style={styles.controlPanel}>
          <div style={styles.panelHeader}>
            <div>
              <p style={styles.kicker}>Private Control Panel</p>
              <h2 style={styles.panelTitle}>Radio Control</h2>
            </div>

            <div style={styles.statusPills}>
              <span
                style={{
                  ...styles.statusPill,
                  background: onAir
                    ? "rgba(0,255,127,0.16)"
                    : "rgba(255,0,0,0.18)",
                  borderColor: onAir
                    ? "rgba(0,255,127,0.5)"
                    : "rgba(255,0,0,0.5)",
                  color: onAir ? "#00ff7f" : "#ff6b6b",
                }}
              >
                On Air: {onAir ? "Green" : "Red"}
              </span>

              <span
                style={{
                  ...styles.statusPill,
                  background: autoDj
                    ? "rgba(255,204,0,0.16)"
                    : "rgba(255,0,0,0.18)",
                  borderColor: autoDj
                    ? "rgba(255,204,0,0.5)"
                    : "rgba(255,0,0,0.5)",
                  color: autoDj ? "#ffcc00" : "#ff6b6b",
                }}
              >
                AutoDJ: {autoDj ? "Yellow" : "Red"}
              </span>
            </div>
          </div>

          <div style={styles.controlGrid}>
            <div style={styles.turntableCard}>
              <div style={styles.turntable}>
                <div style={styles.record}>
                  <div style={styles.recordRingOne} />
                  <div style={styles.recordRingTwo} />
                  <div style={styles.recordCenter}>
                    <span>TC</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={togglePanelMusic}
                  disabled={!monitorMusic}
                  style={{
                    ...styles.turntableButton,
                    opacity: monitorMusic ? 1 : 0.45,
                  }}
                >
                  {isPanelMusicOn ? "Pause" : "Play"}
                </button>
              </div>

              <p style={styles.helperText}>
                This button only controls what you hear inside the control
                panel. It does not shut down AzuraCast.
              </p>
            </div>

            <div style={styles.mixerCard}>
              <label style={styles.label}>
                Music Monitoring
                <button
                  type="button"
                  onClick={() => setMonitorMusic((value) => !value)}
                  style={{
                    ...styles.toggleButton,
                    background: monitorMusic
                      ? "linear-gradient(135deg, #00ff7f, #00b85c)"
                      : "linear-gradient(135deg, #ff2d2d, #8b0000)",
                  }}
                >
                  {monitorMusic ? "ON" : "OFF"}
                </button>
              </label>

              <label style={styles.sliderLabel}>
                Volume: {Math.round(volume * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(event) => setVolume(Number(event.target.value))}
                  style={styles.slider}
                />
              </label>

              <label style={styles.sliderLabel}>
                Tempo: {tempo.toFixed(2)}x
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.01"
                  value={tempo}
                  onChange={(event) => setTempo(Number(event.target.value))}
                  style={styles.slider}
                />
              </label>

              <div style={styles.commandBox}>
                <label style={styles.inputLabel}>
                  Admin Control Key
                  <input
                    type="password"
                    value={adminKey}
                    onChange={(event) => setAdminKey(event.target.value)}
                    placeholder="Enter private admin key"
                    style={styles.input}
                  />
                </label>

                <button
                  type="button"
                  onClick={sendSkipCommand}
                  disabled={skipLoading}
                  style={styles.dangerButton}
                >
                  {skipLoading ? "Sending..." : "Skip Current Song"}
                </button>
              </div>
            </div>

            <div style={styles.cameraCard}>
              <div style={styles.cameraScreen}>
                <div style={styles.cameraPulse} />
                <p style={styles.cameraText}>DJ / Studio Cam</p>
                <span style={styles.cameraSubText}>Ready for live feed</span>
              </div>

              <div style={styles.quickButtons}>
                <button type="button" style={styles.smallButton}>
                  Jingles
                </button>
                <button type="button" style={styles.smallButton}>
                  Drops
                </button>
                <button type="button" style={styles.smallButton}>
                  Ads
                </button>
                <button type="button" style={styles.smallButton}>
                  Community Chat
                </button>
              </div>
            </div>
          </div>

          {statusError ? <p style={styles.errorBox}>{statusError}</p> : null}
        </section>

        <section style={styles.infoGrid}>
          <InfoBox
            title="Station"
            value={status?.stationName || "Tha Core Online Radio"}
          />
          <InfoBox title="Stream" value={streamUrl} />
          <InfoBox
            title="Recent Check"
            value={
              status?.checkedAt
                ? new Date(status.checkedAt).toLocaleString()
                : "Waiting..."
            }
          />
        </section>
      </section>

      <style jsx global>{`
        @keyframes redBroadcastPulse {
          0% {
            opacity: 0.35;
            transform: scale(0.85);
            filter: brightness(0.8);
          }

          100% {
            opacity: 1;
            transform: scale(1.25);
            filter: brightness(1.8);
          }
        }

        @keyframes softSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes cameraBlink {
          0%,
          100% {
            opacity: 0.35;
            transform: scale(0.9);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #080808;
        }

        * {
          box-sizing: border-box;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
    </main>
  );
}

function StatusCard({
  title,
  value,
  color,
  description,
}: {
  title: string;
  value: string;
  color: string;
  description: string;
}) {
  return (
    <article style={styles.statusCard}>
      <div style={styles.statusCardTop}>
        <span
          style={{
            ...styles.dot,
            background: color,
            boxShadow: `0 0 18px ${color}`,
          }}
        />
        <p style={styles.statusTitle}>{title}</p>
      </div>

      <h3 style={{ ...styles.statusValue, color }}>{value}</h3>
      <p style={styles.statusDescription}>{description}</p>
    </article>
  );
}

function InfoBox({ title, value }: { title: string; value: string }) {
  return (
    <article style={styles.infoBox}>
      <p style={styles.infoTitle}>{title}</p>
      <p style={styles.infoValue}>{value}</p>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100%",
    background:
      "radial-gradient(circle at top left, rgba(255,0,0,0.22), transparent 34%), radial-gradient(circle at top right, rgba(255,215,0,0.18), transparent 30%), linear-gradient(135deg, #070707, #17120b 48%, #080808)",
    color: "#fff",
    fontFamily:
      "Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "28px",
  },

  shell: {
    width: "100%",
    maxWidth: "1800px",
    margin: "0 auto",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    minHeight: "520px",
    borderRadius: "34px",
    background:
      "linear-gradient(135deg, #fff3a8 0%, #ffe05b 42%, #ffc400 100%)",
    border: "1px solid rgba(255,255,255,0.5)",
    boxShadow:
      "0 25px 80px rgba(0,0,0,0.42), inset 0 0 60px rgba(255,255,255,0.35)",
    padding: "48px",
    display: "flex",
    alignItems: "center",
  },

  heroGlow: {
    position: "absolute",
    inset: "-40%",
    background:
      "radial-gradient(circle, rgba(255,255,255,0.75), transparent 34%)",
    opacity: 0.28,
    pointerEvents: "none",
  },

  logo: {
    position: "absolute",
    top: "34px",
    right: "42px",
    width: "190px",
    height: "190px",
    objectFit: "contain",
    zIndex: 3,
    filter:
      "drop-shadow(0 0 16px rgba(255,0,0,0.8)) drop-shadow(0 0 28px rgba(255,255,255,0.7))",
  },

  heroContent: {
    position: "relative",
    zIndex: 2,
    maxWidth: "1050px",
    color: "#180000",
  },

  topBadgeRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "22px",
  },

  liveBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 16px",
    borderRadius: "999px",
    background: "#b00000",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: "0.08em",
    boxShadow: "0 0 22px rgba(176,0,0,0.45)",
  },

  connectedBadge: {
    display: "inline-flex",
    alignItems: "center",
    padding: "10px 16px",
    borderRadius: "999px",
    background: "rgba(0,0,0,0.72)",
    color: "#00ff7f",
    fontWeight: 900,
    letterSpacing: "0.08em",
  },

  title: {
    fontSize: "clamp(44px, 6vw, 96px)",
    lineHeight: 0.95,
    margin: "0 0 18px",
    color: "#160000",
    textShadow: "0 4px 0 rgba(255,255,255,0.35)",
    fontWeight: 1000,
    maxWidth: "920px",
  },

  subtitle: {
    maxWidth: "780px",
    fontSize: "clamp(18px, 2vw, 25px)",
    lineHeight: 1.45,
    color: "rgba(35,0,0,0.82)",
    fontWeight: 800,
    margin: "0 0 20px",
  },

  lightRail: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: "10px",
    width: "100%",
    marginTop: "18px",
    marginBottom: "18px",
  },

  redBroadcastLight: {
    width: "13px",
    height: "13px",
    borderRadius: "999px",
    display: "inline-block",
    background: "#ff1f1f",
    boxShadow:
      "0 0 8px rgba(255, 0, 0, 0.95), 0 0 18px rgba(255, 0, 0, 0.65)",
    animationName: "redBroadcastPulse",
    animationDuration: "1.2s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationDirection: "alternate",
  },

  ticker: {
    width: "100%",
    maxWidth: "900px",
    minHeight: "58px",
    display: "flex",
    alignItems: "center",
    gap: "14px",
    borderRadius: "999px",
    background: "rgba(0,0,0,0.76)",
    border: "1px solid rgba(255,255,255,0.24)",
    color: "#fff",
    padding: "10px 20px",
    overflow: "hidden",
    boxShadow: "0 14px 32px rgba(0,0,0,0.28)",
  },

  tickerLabel: {
    flex: "0 0 auto",
    fontSize: "13px",
    fontWeight: 1000,
    color: "#ffcc00",
    letterSpacing: "0.1em",
  },

  tickerText: {
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    fontSize: "18px",
    fontWeight: 900,
  },

  heroButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    marginTop: "26px",
  },

  mainButton: {
    border: "0",
    borderRadius: "999px",
    padding: "17px 28px",
    background: "linear-gradient(135deg, #b00000, #ff3030)",
    color: "#fff",
    fontWeight: 1000,
    fontSize: "16px",
    cursor: "pointer",
    boxShadow: "0 16px 32px rgba(176,0,0,0.36)",
  },

  secondaryButton: {
    border: "1px solid rgba(0,0,0,0.22)",
    borderRadius: "999px",
    padding: "17px 28px",
    background: "rgba(255,255,255,0.72)",
    color: "#160000",
    fontWeight: 1000,
    fontSize: "16px",
    cursor: "pointer",
  },

  cashpotButton: {
    textDecoration: "none",
    borderRadius: "999px",
    padding: "17px 28px",
    background: "linear-gradient(135deg, #101010, #333)",
    color: "#ffcc00",
    fontWeight: 1000,
    fontSize: "16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 16px 30px rgba(0,0,0,0.3)",
  },

  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "18px",
    marginTop: "22px",
  },

  statusCard: {
    borderRadius: "26px",
    background: "rgba(18,18,18,0.9)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "22px",
    boxShadow: "0 18px 42px rgba(0,0,0,0.34)",
  },

  statusCardTop: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  dot: {
    width: "13px",
    height: "13px",
    borderRadius: "999px",
    display: "inline-block",
  },

  statusTitle: {
    margin: 0,
    color: "rgba(255,255,255,0.72)",
    fontWeight: 900,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    fontSize: "13px",
  },

  statusValue: {
    margin: "12px 0 8px",
    fontSize: "30px",
    fontWeight: 1000,
  },

  statusDescription: {
    margin: 0,
    color: "rgba(255,255,255,0.68)",
    lineHeight: 1.45,
    fontSize: "14px",
  },

  controlPanel: {
    marginTop: "22px",
    borderRadius: "34px",
    background:
      "linear-gradient(135deg, rgba(20,20,20,0.97), rgba(9,9,9,0.97))",
    border: "1px solid rgba(255,255,255,0.13)",
    boxShadow: "0 22px 70px rgba(0,0,0,0.42)",
    padding: "28px",
  },

  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
    flexWrap: "wrap",
    marginBottom: "22px",
  },

  kicker: {
    margin: "0 0 6px",
    color: "#ffcc00",
    fontWeight: 1000,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontSize: "13px",
  },

  panelTitle: {
    margin: 0,
    fontSize: "42px",
    lineHeight: 1,
  },

  statusPills: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },

  statusPill: {
    border: "1px solid",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 1000,
    fontSize: "13px",
  },

  controlGrid: {
    display: "grid",
    gridTemplateColumns: "1.05fr 1fr 1.1fr",
    gap: "18px",
  },

  turntableCard: {
    borderRadius: "28px",
    background:
      "radial-gradient(circle at center, rgba(255,204,0,0.12), transparent 58%), rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "24px",
  },

  turntable: {
    minHeight: "390px",
    display: "grid",
    placeItems: "center",
    position: "relative",
  },

  record: {
    width: "300px",
    height: "300px",
    borderRadius: "999px",
    background:
      "radial-gradient(circle, #111 0 14%, #282828 15% 18%, #080808 19% 100%)",
    border: "8px solid rgba(255,255,255,0.08)",
    boxShadow:
      "inset 0 0 45px rgba(255,255,255,0.08), 0 25px 55px rgba(0,0,0,0.55)",
    position: "relative",
    animationName: "softSpin",
    animationDuration: "8s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
    animationPlayState: "running",
  },

  recordRingOne: {
    position: "absolute",
    inset: "48px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  recordRingTwo: {
    position: "absolute",
    inset: "92px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.13)",
  },

  recordCenter: {
    position: "absolute",
    inset: "112px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #ffcc00, #b00000)",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: "32px",
    fontWeight: 1000,
    boxShadow: "0 0 24px rgba(255,0,0,0.5)",
  },

  turntableButton: {
    position: "absolute",
    bottom: "10px",
    border: 0,
    borderRadius: "999px",
    padding: "16px 34px",
    background: "linear-gradient(135deg, #00ff7f, #007a3d)",
    color: "#001f0f",
    fontWeight: 1000,
    fontSize: "17px",
    cursor: "pointer",
    boxShadow: "0 16px 34px rgba(0,255,127,0.23)",
  },

  helperText: {
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.5,
    margin: "14px 0 0",
  },

  mixerCard: {
    borderRadius: "28px",
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "24px",
  },

  label: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    color: "#fff",
    fontWeight: 1000,
    marginBottom: "24px",
  },

  toggleButton: {
    border: 0,
    borderRadius: "999px",
    padding: "12px 22px",
    color: "#071107",
    fontWeight: 1000,
    cursor: "pointer",
  },

  sliderLabel: {
    display: "block",
    color: "rgba(255,255,255,0.86)",
    fontWeight: 900,
    marginBottom: "22px",
  },

  slider: {
    width: "100%",
    marginTop: "12px",
    accentColor: "#ffcc00",
    cursor: "pointer",
  },

  commandBox: {
    marginTop: "24px",
    paddingTop: "20px",
    borderTop: "1px solid rgba(255,255,255,0.11)",
  },

  inputLabel: {
    display: "block",
    color: "rgba(255,255,255,0.82)",
    fontWeight: 900,
    marginBottom: "14px",
  },

  input: {
    width: "100%",
    marginTop: "10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.42)",
    borderRadius: "16px",
    padding: "15px 16px",
    color: "#fff",
    outline: "none",
    fontSize: "15px",
  },

  dangerButton: {
    width: "100%",
    border: 0,
    borderRadius: "18px",
    padding: "16px 18px",
    background: "linear-gradient(135deg, #b00000, #ff3030)",
    color: "#fff",
    fontWeight: 1000,
    fontSize: "16px",
    cursor: "pointer",
  },

  cameraCard: {
    borderRadius: "28px",
    background: "rgba(255,255,255,0.055)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "24px",
  },

  cameraScreen: {
    minHeight: "250px",
    borderRadius: "24px",
    background:
      "radial-gradient(circle at center, rgba(0,255,127,0.18), transparent 44%), linear-gradient(135deg, #050505, #181818)",
    border: "1px solid rgba(0,255,127,0.25)",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    position: "relative",
    overflow: "hidden",
    marginBottom: "18px",
  },

  cameraPulse: {
    position: "absolute",
    top: "18px",
    right: "18px",
    width: "18px",
    height: "18px",
    borderRadius: "999px",
    background: "#ff2d2d",
    boxShadow: "0 0 18px rgba(255,0,0,0.9)",
    animationName: "cameraBlink",
    animationDuration: "1.1s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },

  cameraText: {
    margin: 0,
    color: "#fff",
    fontSize: "30px",
    fontWeight: 1000,
  },

  cameraSubText: {
    color: "rgba(255,255,255,0.62)",
    fontWeight: 800,
  },

  quickButtons: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },

  smallButton: {
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: "16px",
    padding: "14px 12px",
    background: "rgba(0,0,0,0.28)",
    color: "#fff",
    fontWeight: 1000,
    cursor: "pointer",
  },

  errorBox: {
    marginTop: "18px",
    padding: "15px 18px",
    borderRadius: "18px",
    background: "rgba(255,45,45,0.14)",
    border: "1px solid rgba(255,45,45,0.35)",
    color: "#ffb3b3",
    fontWeight: 800,
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "18px",
    marginTop: "22px",
  },

  infoBox: {
    borderRadius: "22px",
    background: "rgba(255,255,255,0.065)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "20px",
  },

  infoTitle: {
    margin: "0 0 8px",
    color: "#ffcc00",
    fontWeight: 1000,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: "12px",
  },

  infoValue: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    fontWeight: 800,
    wordBreak: "break-word",
    lineHeight: 1.45,
  },
};