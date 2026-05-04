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

type PadType =
  | "smart"
  | "jingle"
  | "birthday"
  | "ad"
  | "commercial"
  | "station"
  | "weather"
  | "time"
  | "promo"
  | "sponsor"
  | "cashpot"
  | "next"
  | "dub"
  | "siren"
  | "rewind"
  | "horn";

type HeroPad = {
  label: string;
  type: PadType;
};

const STREAM_URL =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

const heroPads: HeroPad[] = [
  { label: "Smart DJ", type: "smart" },
  { label: "Jingles", type: "jingle" },
  { label: "Birthday Shout", type: "birthday" },
  { label: "Ads", type: "ad" },
  { label: "Commercial", type: "commercial" },
  { label: "Station ID", type: "station" },
  { label: "Weather Drop", type: "weather" },
  { label: "Time Drop", type: "time" },
  { label: "Store Promo", type: "promo" },
  { label: "Sponsor Tag", type: "sponsor" },
  { label: "Cash Pot Call", type: "cashpot" },
  { label: "Coming Up Next", type: "next" },
  { label: "Dub Siren", type: "dub" },
  { label: "Air Horn", type: "horn" },
  { label: "Rewind FX", type: "rewind" },
  { label: "Siren FX", type: "siren" },
];

const quickTools = [
  { title: "Upload Music", href: "/upload" },
  { title: "Playlists", href: "/radio" },
  { title: "Messages", href: "/chat" },
  { title: "Store", href: "/store" },
  { title: "News", href: "/news" },
  { title: "Blog", href: "/blog" },
  { title: "Weather", href: "/weather-reader" },
  { title: "Time", href: "/time-reader" },
];

export default function OwnerPage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [status, setStatus] = useState<RadioStatus | null>(null);
  const [statusError, setStatusError] = useState("");
  const [adminKey, setAdminKey] = useState("");

  const [monitorOn, setMonitorOn] = useState(false);
  const [smartDjOn, setSmartDjOn] = useState(true);
  const [skipLoading, setSkipLoading] = useState(false);
  const [lastAction, setLastAction] = useState("Owner turntable mixer ready.");

  const [masterVolume, setMasterVolume] = useState(80);
  const [deckALevel, setDeckALevel] = useState(82);
  const [deckBLevel, setDeckBLevel] = useState(74);
  const [micLevel, setMicLevel] = useState(55);
  const [cueLevel, setCueLevel] = useState(50);
  const [crossfade, setCrossfade] = useState(50);

  const [bass, setBass] = useState(55);
  const [mid, setMid] = useState(50);
  const [treble, setTreble] = useState(58);
  const [gain, setGain] = useState(60);

  const [echoLevel, setEchoLevel] = useState(20);
  const [echoRepeat, setEchoRepeat] = useState(35);
  const [echoTone, setEchoTone] = useState(45);

  const [reverbLevel, setReverbLevel] = useState(18);
  const [reverbRoom, setReverbRoom] = useState(40);
  const [reverbDamp, setReverbDamp] = useState(30);

  const [delayLevel, setDelayLevel] = useState(25);
  const [delayTime, setDelayTime] = useState(42);
  const [delayFeedback, setDelayFeedback] = useState(36);

  const [filterCutoff, setFilterCutoff] = useState(50);
  const [filterResonance, setFilterResonance] = useState(25);
  const [compressor, setCompressor] = useState(35);
  const [limiter, setLimiter] = useState(70);

  const streamUrl = status?.streamUrl || STREAM_URL;

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

      const data = await response.json();

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

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = masterVolume / 100;
  }, [masterVolume]);

  async function toggleMonitor() {
    if (!audioRef.current) return;

    try {
      if (monitorOn) {
        audioRef.current.pause();
        setMonitorOn(false);
        setLastAction("Monitor paused inside owner panel.");
        return;
      }

      audioRef.current.src = streamUrl;
      audioRef.current.volume = masterVolume / 100;
      await audioRef.current.play();

      setMonitorOn(true);
      setLastAction("Monitoring live radio inside owner panel.");
    } catch {
      setMonitorOn(false);
      setLastAction("Browser blocked monitor audio. Click Monitor again.");
    }
  }

  async function skipSong() {
    if (!adminKey.trim()) {
      setLastAction("Enter your admin control key before using Skip.");
      return;
    }

    try {
      setSkipLoading(true);
      setLastAction("Sending skip command...");

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
        setLastAction(data?.message || "Skip command failed.");
        return;
      }

      setLastAction("Skip command sent successfully.");
      await loadStatus();
    } catch (error) {
      setLastAction(error instanceof Error ? error.message : "Skip command error.");
    } finally {
      setSkipLoading(false);
    }
  }

  function firePad(pad: HeroPad) {
    if (pad.type === "smart") {
      setSmartDjOn((current) => !current);
      setLastAction(`Smart DJ switched ${smartDjOn ? "OFF" : "ON"}.`);
      return;
    }

    const actionMap: Record<PadType, string> = {
      smart: "Smart DJ toggled.",
      jingle: "Jingles one-click pad fired.",
      birthday: "Birthday shoutout pad fired.",
      ad: "Ads pad fired.",
      commercial: "Commercial break pad fired.",
      station: "Station ID pad fired.",
      weather: "Weather drop pad fired.",
      time: "Time drop pad fired.",
      promo: "Store promo pad fired.",
      sponsor: "Sponsor tag pad fired.",
      cashpot: "Cash Pot call pad fired.",
      next: "Coming Up Next pad fired.",
      dub: "Dub siren effect fired.",
      horn: "Air horn effect fired.",
      rewind: "Rewind effect fired.",
      siren: "Siren effect fired.",
    };

    setLastAction(actionMap[pad.type]);
  }

  function padStyle(type: PadType): CSSProperties {
    const base: CSSProperties = {
      ...styles.heroPadButton,
    };

    const colors: Record<PadType, CSSProperties> = {
      smart: {
        background: smartDjOn
          ? "linear-gradient(135deg, #ffd400, #ff3131)"
          : "linear-gradient(135deg, #202020, #070707)",
        color: smartDjOn ? "#170000" : "#ffd400",
        borderColor: smartDjOn ? "rgba(255,212,0,0.95)" : "rgba(255,212,0,0.35)",
      },
      jingle: {
        background: "linear-gradient(135deg, #ffd400, #b8860b)",
        color: "#160000",
        borderColor: "rgba(255,212,0,0.8)",
      },
      birthday: {
        background: "linear-gradient(135deg, #ff4fd8, #ffd400)",
        color: "#160000",
        borderColor: "rgba(255,79,216,0.9)",
      },
      ad: {
        background: "linear-gradient(135deg, #00d9ff, #ffd400)",
        color: "#001017",
        borderColor: "rgba(0,217,255,0.9)",
      },
      commercial: {
        background: "linear-gradient(135deg, #ff3131, #8b0000)",
        color: "#fff",
        borderColor: "rgba(255,49,49,0.9)",
      },
      station: {
        background: "linear-gradient(135deg, #00ff7f, #ffd400)",
        color: "#001b0d",
        borderColor: "rgba(0,255,127,0.9)",
      },
      weather: {
        background: "linear-gradient(135deg, #7cc7ff, #005eff)",
        color: "#fff",
        borderColor: "rgba(124,199,255,0.9)",
      },
      time: {
        background: "linear-gradient(135deg, #ffffff, #ffd400)",
        color: "#160000",
        borderColor: "rgba(255,255,255,0.85)",
      },
      promo: {
        background: "linear-gradient(135deg, #ff8c00, #ffd400)",
        color: "#160000",
        borderColor: "rgba(255,140,0,0.9)",
      },
      sponsor: {
        background: "linear-gradient(135deg, #b45cff, #ffd400)",
        color: "#160000",
        borderColor: "rgba(180,92,255,0.9)",
      },
      cashpot: {
        background: "linear-gradient(135deg, #00ff7f, #008d46)",
        color: "#001b0d",
        borderColor: "rgba(0,255,127,0.9)",
      },
      next: {
        background: "linear-gradient(135deg, #111, #ffd400)",
        color: "#fff",
        borderColor: "rgba(255,212,0,0.8)",
      },
      dub: {
        background: "linear-gradient(135deg, #ff3131, #ffd400)",
        color: "#160000",
        borderColor: "rgba(255,49,49,0.9)",
      },
      horn: {
        background: "linear-gradient(135deg, #ffd400, #ff6b00)",
        color: "#160000",
        borderColor: "rgba(255,212,0,0.9)",
      },
      rewind: {
        background: "linear-gradient(135deg, #111111, #ff3131)",
        color: "#fff",
        borderColor: "rgba(255,49,49,0.9)",
      },
      siren: {
        background: "linear-gradient(135deg, #00d9ff, #ff3131)",
        color: "#fff",
        borderColor: "rgba(0,217,255,0.9)",
      },
    };

    return {
      ...base,
      ...colors[type],
    };
  }

  return (
    <main style={styles.page}>
      <audio ref={audioRef} preload="none" />

      <section style={styles.shell}>
        <header style={styles.hero}>
          <div style={styles.heroTop}>
            <div>
              <p style={styles.kicker}>THA CORE OWNER CONTROL PANEL</p>
              <h1 style={styles.title}>DJ Turntable Command Center</h1>
              <p style={styles.subtitle}>
                Big turntables, full mixer, Smart DJ, jingles, ads,
                commercials, birthday shoutouts, sliders, effects, and live
                radio control.
              </p>
            </div>

            <div style={styles.topStatusBox}>
              <StatusLight
                title="Station"
                value={stationOnline ? "ON AIR" : "OFF AIR"}
                color={stationOnline ? "#00ff7f" : "#ff3131"}
              />
              <StatusLight
                title="AutoDJ"
                value={autoDj ? "ON" : "OFF"}
                color={autoDj ? "#ffd400" : "#ff3131"}
              />
              <StatusLight
                title="Live DJ"
                value={liveDj ? "LIVE" : "NO"}
                color={liveDj ? "#00ff7f" : "#ff3131"}
              />
              <StatusLight
                title="Listeners"
                value={`${listeners}`}
                color="#00d9ff"
              />
            </div>
          </div>

          <div style={styles.heroButtonsArea}>
            <div style={styles.heroButtonsHeader}>
              <div>
                <p style={styles.yellowTiny}>ONE-CLICK LIVE PADS</p>
                <h2 style={styles.heroButtonsTitle}>
                  Smart DJ / Jingles / Birthday / Ads / Commercial / Effects
                </h2>
              </div>

              <div
                style={{
                  ...styles.smartDjBadge,
                  borderColor: smartDjOn ? "#ffd400" : "#ff3131",
                  color: smartDjOn ? "#ffd400" : "#ff8080",
                }}
              >
                Smart DJ: {smartDjOn ? "ON" : "OFF"}
              </div>
            </div>

            <div style={styles.heroPadGrid}>
              {heroPads.map((pad) => (
                <button
                  key={pad.label}
                  type="button"
                  onClick={() => firePad(pad)}
                  style={padStyle(pad.type)}
                >
                  {pad.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section style={styles.nowBar}>
          <div>
            <p style={styles.yellowTiny}>NOW PLAYING</p>
            <h2 style={styles.nowTitle}>{nowPlaying}</h2>
            <p style={styles.muted}>
              Station: {status?.stationName || "Tha Core Online Radio"}
            </p>
          </div>

          <div style={styles.nowActions}>
            <button type="button" onClick={loadStatus} style={styles.yellowButton}>
              Refresh
            </button>
            <button type="button" onClick={toggleMonitor} style={styles.redButton}>
              {monitorOn ? "Pause Monitor" : "Monitor Live"}
            </button>
          </div>
        </section>

        {statusError ? <p style={styles.errorBox}>{statusError}</p> : null}

        <section style={styles.djLayout}>
          <TurntableDeck
            title="Deck A"
            label="Live Stream"
            level={deckALevel}
            setLevel={setDeckALevel}
            active={monitorOn}
            onAction={setLastAction}
          />

          <section style={styles.mixerPanel}>
            <p style={styles.yellowTiny}>MAIN MIXER</p>
            <h2 style={styles.panelTitle}>Red & Black Mix Board</h2>

            <div style={styles.mainButtons}>
              <button type="button" onClick={toggleMonitor} style={styles.bigYellowButton}>
                {monitorOn ? "PAUSE MONITOR" : "MONITOR LIVE"}
              </button>

              <button
                type="button"
                onClick={skipSong}
                disabled={skipLoading}
                style={styles.bigRedButton}
              >
                {skipLoading ? "SENDING..." : "SKIP SONG"}
              </button>
            </div>

            <label style={styles.inputLabel}>
              Admin Control Key
              <input
                type="password"
                value={adminKey}
                onChange={(event) => setAdminKey(event.target.value)}
                placeholder="Enter private key"
                style={styles.input}
              />
            </label>

            <div style={styles.sliderBank}>
              <MixerSlider label="Vol" value={masterVolume} setValue={setMasterVolume} />
              <MixerSlider label="Deck A" value={deckALevel} setValue={setDeckALevel} />
              <MixerSlider label="Deck B" value={deckBLevel} setValue={setDeckBLevel} />
              <MixerSlider label="Mic" value={micLevel} setValue={setMicLevel} />
              <MixerSlider label="Cue" value={cueLevel} setValue={setCueLevel} />
              <MixerSlider label="Gain" value={gain} setValue={setGain} />
              <MixerSlider label="Bass" value={bass} setValue={setBass} />
              <MixerSlider label="Mid" value={mid} setValue={setMid} />
              <MixerSlider label="Treble" value={treble} setValue={setTreble} />
              <MixerSlider label="Echo" value={echoLevel} setValue={setEchoLevel} />
              <MixerSlider label="Reverb" value={reverbLevel} setValue={setReverbLevel} />
              <MixerSlider label="Delay" value={delayLevel} setValue={setDelayLevel} />
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
            label="Drops / Ads"
            level={deckBLevel}
            setLevel={setDeckBLevel}
            active={smartDjOn}
            onAction={setLastAction}
          />
        </section>

        <section style={styles.effectsRack}>
          <div style={styles.sectionHead}>
            <div>
              <p style={styles.yellowTiny}>FX RACK</p>
              <h2 style={styles.sectionTitle}>
                Echo / Reverb / Delay / Filter / Compressor
              </h2>
            </div>
            <p style={styles.muted}>
              Yellow sliders and one-click effect buttons.
            </p>
          </div>

          <div style={styles.fxGrid}>
            <EffectModule
              title="Echo"
              sliders={[
                { label: "Level", value: echoLevel, setValue: setEchoLevel },
                { label: "Repeat", value: echoRepeat, setValue: setEchoRepeat },
                { label: "Tone", value: echoTone, setValue: setEchoTone },
              ]}
              buttons={["Echo Tap", "Echo Throw", "Echo Cut"]}
              onAction={setLastAction}
            />

            <EffectModule
              title="Reverb"
              sliders={[
                { label: "Level", value: reverbLevel, setValue: setReverbLevel },
                { label: "Room", value: reverbRoom, setValue: setReverbRoom },
                { label: "Damp", value: reverbDamp, setValue: setReverbDamp },
              ]}
              buttons={["Big Room", "Dub Verb", "Verb Cut"]}
              onAction={setLastAction}
            />

            <EffectModule
              title="Delay"
              sliders={[
                { label: "Level", value: delayLevel, setValue: setDelayLevel },
                { label: "Time", value: delayTime, setValue: setDelayTime },
                { label: "Feedback", value: delayFeedback, setValue: setDelayFeedback },
              ]}
              buttons={["1/4 Delay", "1/2 Delay", "Delay Freeze"]}
              onAction={setLastAction}
            />

            <EffectModule
              title="Master FX"
              sliders={[
                { label: "Filter", value: filterCutoff, setValue: setFilterCutoff },
                { label: "Reso", value: filterResonance, setValue: setFilterResonance },
                { label: "Comp", value: compressor, setValue: setCompressor },
                { label: "Limiter", value: limiter, setValue: setLimiter },
              ]}
              buttons={["Filter Sweep", "Compressor", "Limiter"]}
              onAction={setLastAction}
            />
          </div>
        </section>

        <section style={styles.bottomGrid}>
          <section style={styles.cameraPanel}>
            <p style={styles.yellowTiny}>LIVE STUDIO</p>
            <h2 style={styles.sectionTitle}>DJ Cam / Caller Screen</h2>

            <div style={styles.cameraScreen}>
              <span style={styles.recordingLight} />
              <p style={styles.cameraTitle}>Studio Feed Ready</p>
              <p style={styles.muted}>
                Add webcam, video call, listener call-in, or live studio view.
              </p>
            </div>

            <div style={styles.buttonRow}>
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

          <section style={styles.logPanel}>
            <p style={styles.yellowTiny}>PANEL LOG</p>
            <h2 style={styles.sectionTitle}>Last Action</h2>
            <p style={styles.lastAction}>{lastAction}</p>

            <div style={styles.quickCommandGrid}>
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
          {quickTools.map((tool) => (
            <a key={tool.title} href={tool.href} style={styles.shortcutCard}>
              <span style={styles.shortcutTitle}>{tool.title}</span>
              <span style={styles.shortcutOpen}>Open</span>
            </a>
          ))}
        </section>
      </section>

      <style jsx global>{`
        @keyframes recordSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulseRed {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(0.92);
          }

          50% {
            opacity: 1;
            transform: scale(1.18);
          }
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #030303;
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </main>
  );
}

function StatusLight({
  title,
  value,
  color,
}: {
  title: string;
  value: string;
  color: string;
}) {
  return (
    <article style={styles.statusMini}>
      <span
        style={{
          ...styles.statusDot,
          background: color,
          boxShadow: `0 0 18px ${color}`,
        }}
      />
      <div>
        <p style={styles.statusMiniTitle}>{title}</p>
        <p style={{ ...styles.statusMiniValue, color }}>{value}</p>
      </div>
    </article>
  );
}

function TurntableDeck({
  title,
  label,
  level,
  setLevel,
  active,
  onAction,
}: {
  title: string;
  label: string;
  level: number;
  setLevel: (value: number) => void;
  active: boolean;
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
          <h2 style={styles.deckTitle}>{label}</h2>
        </div>

        <span
          style={{
            ...styles.deckStatusDot,
            background: active ? "#ffd400" : "#ff3131",
            boxShadow: active
              ? "0 0 22px rgba(255,212,0,0.9)"
              : "0 0 22px rgba(255,49,49,0.9)",
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

      <label style={styles.deckSliderLabel}>
        Deck Level: {level}%
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={level}
          onChange={(event) => setLevel(Number(event.target.value))}
          style={styles.yellowSlider}
        />
      </label>
    </section>
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
    <label style={styles.verticalSliderWrap}>
      <span style={styles.verticalLabel}>{label}</span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
        style={styles.verticalSlider}
      />
      <span style={styles.verticalValue}>{value}</span>
    </label>
  );
}

function EffectModule({
  title,
  sliders,
  buttons,
  onAction,
}: {
  title: string;
  sliders: {
    label: string;
    value: number;
    setValue: (value: number) => void;
  }[];
  buttons: string[];
  onAction: (message: string) => void;
}) {
  return (
    <article style={styles.fxModule}>
      <p style={styles.yellowTiny}>{title}</p>

      <div style={styles.fxSliders}>
        {sliders.map((slider) => (
          <MixerSlider
            key={slider.label}
            label={slider.label}
            value={slider.value}
            setValue={slider.setValue}
          />
        ))}
      </div>

      <div style={styles.fxButtons}>
        {buttons.map((button) => (
          <button
            key={button}
            type="button"
            onClick={() => onAction(`${title} ${button} selected.`)}
            style={styles.fxButton}
          >
            {button}
          </button>
        ))}
      </div>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(255,0,0,0.22), transparent 30%), radial-gradient(circle at top right, rgba(255,212,0,0.12), transparent 26%), linear-gradient(180deg, #030303 0%, #170000 48%, #050000 100%)",
    color: "#fff",
    fontFamily:
      "Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "28px",
  },

  shell: {
    width: "100%",
    maxWidth: "1900px",
    margin: "0 auto",
  },

  hero: {
    borderRadius: "34px",
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.96), rgba(90,0,0,0.72))",
    border: "2px solid rgba(255,49,49,0.5)",
    boxShadow: "0 24px 70px rgba(0,0,0,0.55)",
    padding: "34px",
  },

  heroTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    flexWrap: "wrap",
  },

  kicker: {
    margin: "0 0 14px",
    color: "#ffd400",
    fontSize: "14px",
    letterSpacing: "0.35em",
    fontWeight: 1000,
  },

  title: {
    margin: 0,
    fontSize: "clamp(44px, 5vw, 84px)",
    lineHeight: 0.95,
    fontWeight: 1000,
  },

  subtitle: {
    maxWidth: "960px",
    margin: "18px 0 0",
    color: "rgba(255,255,255,0.76)",
    fontSize: "20px",
    lineHeight: 1.45,
    fontWeight: 800,
  },

  topStatusBox: {
    minWidth: "430px",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "12px",
  },

  statusMini: {
    minHeight: "82px",
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
  },

  statusMiniTitle: {
    margin: "0 0 5px",
    color: "rgba(255,255,255,0.62)",
    fontSize: "12px",
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  statusMiniValue: {
    margin: 0,
    fontSize: "21px",
    fontWeight: 1000,
  },

  heroButtonsArea: {
    marginTop: "30px",
    borderRadius: "28px",
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.72), rgba(25,0,0,0.72))",
    border: "1px solid rgba(255,212,0,0.35)",
    padding: "22px",
  },

  heroButtonsHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
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

  heroButtonsTitle: {
    margin: 0,
    fontSize: "30px",
    fontWeight: 1000,
  },

  smartDjBadge: {
    border: "1px solid",
    borderRadius: "999px",
    padding: "12px 16px",
    fontWeight: 1000,
    background: "rgba(0,0,0,0.42)",
  },

  heroPadGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
    gap: "12px",
  },

  heroPadButton: {
    minHeight: "82px",
    border: "2px solid",
    borderRadius: "20px",
    fontWeight: 1000,
    fontSize: "15px",
    cursor: "pointer",
    boxShadow: "0 14px 30px rgba(0,0,0,0.34)",
  },

  nowBar: {
    marginTop: "20px",
    borderRadius: "28px",
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.88), rgba(120,0,0,0.4))",
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
    fontSize: "32px",
    fontWeight: 1000,
  },

  muted: {
    margin: "10px 0 0",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.45,
    fontWeight: 750,
  },

  nowActions: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  yellowButton: {
    border: "1px solid rgba(255,212,0,0.55)",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #ffd400, #b8860b)",
    color: "#180000",
    padding: "14px 22px",
    fontSize: "15px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  redButton: {
    border: 0,
    borderRadius: "999px",
    background: "linear-gradient(135deg, #9d0000, #ff3131)",
    color: "#fff",
    padding: "14px 22px",
    fontSize: "15px",
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

  djLayout: {
    marginTop: "20px",
    display: "grid",
    gridTemplateColumns: "1.12fr 1.05fr 1.12fr",
    gap: "18px",
  },

  deck: {
    borderRadius: "34px",
    background:
      "radial-gradient(circle at center, rgba(255,212,0,0.1), transparent 56%), linear-gradient(180deg, rgba(17,0,0,0.96), rgba(0,0,0,0.96))",
    border: "2px solid rgba(255,49,49,0.45)",
    padding: "24px",
    boxShadow: "0 22px 55px rgba(0,0,0,0.45)",
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

  deckStatusDot: {
    width: "20px",
    height: "20px",
    borderRadius: "999px",
    animationName: "pulseRed",
    animationDuration: "1.2s",
    animationIterationCount: "infinite",
  },

  turntableArea: {
    minHeight: "445px",
    display: "grid",
    placeItems: "center",
  },

  record: {
    width: "365px",
    height: "365px",
    borderRadius: "999px",
    background:
      "radial-gradient(circle, #111 0 12%, #2b2b2b 13% 16%, #050505 17% 100%)",
    border: "10px solid rgba(255,255,255,0.08)",
    boxShadow:
      "inset 0 0 60px rgba(255,255,255,0.08), 0 30px 70px rgba(0,0,0,0.65), 0 0 35px rgba(255,49,49,0.25)",
    position: "relative",
    animationName: "recordSpin",
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
    inset: "152px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.12)",
  },

  recordCenter: {
    position: "absolute",
    inset: "138px",
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

  deckSliderLabel: {
    display: "block",
    color: "#fff",
    fontWeight: 900,
  },

  yellowSlider: {
    width: "100%",
    marginTop: "10px",
    accentColor: "#ffd400",
  },

  mixerPanel: {
    borderRadius: "34px",
    background:
      "linear-gradient(180deg, rgba(20,20,20,0.98), rgba(0,0,0,0.98))",
    border: "2px solid rgba(255,212,0,0.25)",
    padding: "24px",
    boxShadow: "0 22px 55px rgba(0,0,0,0.45)",
  },

  panelTitle: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 1000,
  },

  mainButtons: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "18px",
  },

  bigYellowButton: {
    border: "1px solid rgba(255,212,0,0.55)",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #ffd400, #b8860b)",
    color: "#180000",
    padding: "17px",
    fontSize: "14px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  bigRedButton: {
    border: 0,
    borderRadius: "18px",
    background: "linear-gradient(135deg, #9d0000, #ff3131)",
    color: "#fff",
    padding: "17px",
    fontSize: "14px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  inputLabel: {
    display: "block",
    color: "rgba(255,255,255,0.75)",
    fontWeight: 900,
    marginTop: "18px",
  },

  input: {
    width: "100%",
    marginTop: "10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#fff",
    borderRadius: "16px",
    padding: "14px 15px",
    outline: "none",
    fontSize: "15px",
  },

  sliderBank: {
    marginTop: "22px",
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    gap: "12px",
    minHeight: "310px",
  },

  verticalSliderWrap: {
    display: "grid",
    justifyItems: "center",
    alignItems: "center",
    gap: "8px",
    color: "#fff",
    fontWeight: 900,
  },

  verticalLabel: {
    color: "#ffd400",
    fontSize: "12px",
    fontWeight: 1000,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    textAlign: "center",
  },

  verticalSlider: {
    width: "155px",
    accentColor: "#ffd400",
    transform: "rotate(-90deg)",
  },

  verticalValue: {
    color: "rgba(255,255,255,0.7)",
    fontSize: "12px",
  },

  crossLabel: {
    display: "block",
    color: "#fff",
    fontWeight: 900,
    marginTop: "16px",
  },

  crossSlider: {
    width: "100%",
    marginTop: "10px",
    accentColor: "#ffd400",
  },

  effectsRack: {
    marginTop: "20px",
    borderRadius: "30px",
    background:
      "linear-gradient(135deg, rgba(30,0,0,0.9), rgba(0,0,0,0.92))",
    border: "2px solid rgba(255,212,0,0.25)",
    padding: "24px",
  },

  sectionHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "18px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "34px",
    fontWeight: 1000,
  },

  fxGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "14px",
  },

  fxModule: {
    borderRadius: "24px",
    background: "rgba(0,0,0,0.68)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "18px",
  },

  fxSliders: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
    minHeight: "245px",
  },

  fxButtons: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "9px",
    marginTop: "8px",
  },

  fxButton: {
    border: "1px solid rgba(255,212,0,0.55)",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #ffd400, #b8860b)",
    color: "#180000",
    padding: "12px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  bottomGrid: {
    marginTop: "20px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
  },

  cameraPanel: {
    borderRadius: "28px",
    background: "rgba(0,0,0,0.78)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "24px",
  },

  cameraScreen: {
    marginTop: "18px",
    minHeight: "260px",
    borderRadius: "24px",
    background:
      "radial-gradient(circle at center, rgba(255,0,0,0.18), transparent 44%), linear-gradient(135deg, #050505, #181818)",
    border: "1px solid rgba(255,49,49,0.32)",
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
    animationName: "pulseRed",
    animationDuration: "1s",
    animationIterationCount: "infinite",
  },

  cameraTitle: {
    margin: 0,
    fontSize: "32px",
    fontWeight: 1000,
  },

  buttonRow: {
    marginTop: "16px",
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  logPanel: {
    borderRadius: "28px",
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

  quickCommandGrid: {
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