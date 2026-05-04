"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type NowPlayingData = {
  station?: {
    name?: string;
    listen_url?: string;
    is_online?: boolean;
  };
  listeners?: {
    current?: number;
    unique?: number;
    total?: number;
  };
  live?: {
    is_live?: boolean;
    streamer_name?: string;
  };
  now_playing?: {
    song?: {
      artist?: string;
      title?: string;
      text?: string;
      art?: string;
    };
  };
};

const STREAM_URL =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

const NOW_PLAYING_URL =
  process.env.NEXT_PUBLIC_AZURACAST_NOW_PLAYING_URL ||
  "https://thacoreonlinerad.com/api/nowplaying/1";

const LOGOS = [
  "/Tha-Core-Logo.png",
  "/logo.png",
  "/tha-core-logo.png",
  "/icon-512.png",
  "/icon-192.png",
];

const visitorLinks = [
  { label: "Store", href: "/store" },
  { label: "Chat", href: "/chat" },
  { label: "News", href: "/news" },
  { label: "Blog", href: "/blog" },
  { label: "Cash Pot / Lotto", href: "/lotto" },
  { label: "Upload Entry", href: "/upload" },
  { label: "Weather Reader", href: "/weather-reader" },
  { label: "Time Reader", href: "/time-reader" },
];

const newsLinks = [
  { label: "World News", href: "/news/world" },
  { label: "Music News", href: "/news/music" },
  { label: "Sports", href: "/news/sports" },
  { label: "Business", href: "/news/business" },
  { label: "Weather", href: "/news/weather" },
  { label: "Radio Updates", href: "/news/radio-updates" },
];

const blogLinks = [
  { label: "Behind The Core", href: "/blog/behind-the-core" },
  { label: "Music Culture", href: "/blog/music-culture" },
  { label: "Business Tips", href: "/blog/business-tips" },
  { label: "Printing & Design", href: "/blog/printing-design" },
  { label: "Radio Stories", href: "/blog/radio-stories" },
];

const storeHighlights = [
  "Custom T-Shirts",
  "Caps",
  "Cups",
  "Banners",
  "Business Cards",
  "Radio Promos",
  "Ads",
  "Flyers",
];

export default function HomePage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [logoIndex, setLogoIndex] = useState(0);
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [statusText, setStatusText] = useState("Connecting to Tha Core...");
  const [showShoutout, setShowShoutout] = useState(false);

  const streamUrl = nowPlaying?.station?.listen_url || STREAM_URL;

  const songText = useMemo(() => {
    const song = nowPlaying?.now_playing?.song;

    if (song?.text) {
      return song.text;
    }

    if (song?.artist || song?.title) {
      return `${song?.artist || "Tha Core"} - ${song?.title || "Live Mix"}`;
    }

    return "Live From Tha Core - Tha Core Live Mix";
  }, [nowPlaying]);

  const listeners = nowPlaying?.listeners?.current ?? 0;
  const isLive = Boolean(nowPlaying?.live?.is_live);
  const stationOnline = nowPlaying?.station?.is_online !== false;

  async function loadNowPlaying() {
    try {
      const response = await fetch(NOW_PLAYING_URL, {
        cache: "no-store",
      });

      if (!response.ok) {
        setStatusText("Live radio connected");
        return;
      }

      const data = (await response.json()) as NowPlayingData;
      setNowPlaying(data);
      setStatusText(data?.station?.is_online === false ? "Station offline" : "Live radio connected");
    } catch {
      setStatusText("Live radio connected");
    }
  }

  useEffect(() => {
    loadNowPlaying();

    const timer = window.setInterval(() => {
      loadNowPlaying();
    }, 10000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  async function toggleRadio() {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      audioRef.current.src = streamUrl;
      audioRef.current.volume = volume;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setStatusText("Tap Play Live again to start the radio.");
      setIsPlaying(false);
    }
  }

  return (
    <main style={styles.page}>
      <audio ref={audioRef} preload="none" />

      <section style={styles.shell}>
        <section style={styles.topTicker}>
          <div style={styles.tickerTrack}>
            <span>STORE SALE: Custom prints and radio promos available</span>
            <span>Vote next song</span>
            <span>Drop your shoutout live now</span>
            <span>Promote your business on Tha Core Radio</span>
            <span>Dancehall • Reggae • Hip-Hop • R&B</span>
          </div>
        </section>

        <section style={styles.hero}>
          <div style={styles.heroGlow} />

          <div style={styles.heroText}>
            <p style={styles.kicker}>LIVE FROM THA CORE</p>

            <h1 style={styles.title}>Tha Core Radio</h1>

            <p style={styles.subtitle}>
              Live radio, store, chat, uploads, shoutouts, world news, radio
              promos, printing, design, and business moves.
            </p>

            <div style={styles.statusStrip}>
              <span
                style={{
                  ...styles.statusDot,
                  background: stationOnline ? "#00ff7f" : "#ff3030",
                  boxShadow: stationOnline
                    ? "0 0 18px rgba(0,255,127,0.9)"
                    : "0 0 18px rgba(255,48,48,0.9)",
                }}
              />
              <strong>{statusText}</strong>
              <span style={styles.statusDivider}>•</span>
              <span>{isLive ? "Live DJ on air" : "AutoDJ live mix"}</span>
            </div>

            <div style={styles.heroActions}>
              <button type="button" onClick={toggleRadio} style={styles.playButton}>
                {isPlaying ? "Pause Live" : "Play Live"}
              </button>

              <a href="/store" style={styles.goldButton}>
                Visit Store
              </a>

              <button
                type="button"
                onClick={() => setShowShoutout((value) => !value)}
                style={styles.darkButton}
              >
                Drop Shoutout
              </button>
            </div>
          </div>

          <div style={styles.logoWrap}>
            <img
              src={LOGOS[logoIndex]}
              alt="Tha Core Logo"
              style={styles.logo}
              onError={() => {
                setLogoIndex((current) => {
                  const next = current + 1;
                  return next < LOGOS.length ? next : current;
                });
              }}
            />
          </div>
        </section>

        <section style={styles.onAirCard}>
          <div style={styles.onAirHeader}>
            <div>
              <p style={styles.onAirBadge}>ON AIR NOW - NOW PLAYING</p>
              <h2 style={styles.nowTitle}>{songText}</h2>
            </div>

            <div style={styles.equalizer}>
              {Array.from({ length: 14 }).map((_, index) => (
                <span
                  key={index}
                  style={{
                    ...styles.eqBar,
                    animationDelay: `${index * 0.07}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <div style={styles.nowPlayingBox}>
            <p style={styles.nowPlayingLabel}>Tha Core Live Mix</p>
            <p style={styles.nowPlayingText}>{songText}</p>
            <p style={styles.listenerText}>
              {listeners} {listeners === 1 ? "listener" : "listeners"} online
            </p>
          </div>

          <div style={styles.playerLine}>
            <button type="button" onClick={toggleRadio} style={styles.fullPlayButton}>
              {isPlaying ? "Pause Live" : "Play Live"}
            </button>

            <label style={styles.volumeLabel}>
              Volume
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(event) => setVolume(Number(event.target.value))}
                style={styles.volumeSlider}
              />
            </label>
          </div>
        </section>

        {showShoutout ? (
          <section style={styles.shoutoutBox}>
            <div>
              <p style={styles.kickerGold}>LIVE SHOUTOUT</p>
              <h2 style={styles.sectionTitle}>Send a shoutout to Tha Core</h2>
              <p style={styles.sectionText}>
                Send your name, location, and message. Keep it clean and radio
                ready.
              </p>
            </div>

            <a
              href="https://wa.me/"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.whatsappButton}
            >
              Open WhatsApp
            </a>
          </section>
        ) : null}

        <section style={styles.quickGrid}>
          {visitorLinks.map((item) => (
            <a key={item.href} href={item.href} style={styles.quickLink}>
              {item.label}
            </a>
          ))}
        </section>

        <section style={styles.twoColumn}>
          <div style={styles.panel}>
            <p style={styles.kickerGold}>THA CORE STORE</p>
            <h2 style={styles.sectionTitle}>Prints, merch, and radio promos</h2>
            <p style={styles.sectionText}>
              Shop custom designs, printing services, apparel, radio promos,
              ads, and business promotion packages.
            </p>

            <div style={styles.chipGrid}>
              {storeHighlights.map((item) => (
                <span key={item} style={styles.chip}>
                  {item}
                </span>
              ))}
            </div>

            <a href="/store" style={styles.panelButton}>
              Open Store
            </a>
          </div>

          <div style={styles.panel}>
            <p style={styles.kickerGold}>COMMUNITY</p>
            <h2 style={styles.sectionTitle}>Chat, shoutouts, and uploads</h2>
            <p style={styles.sectionText}>
              Join the community, send music, upload entries, vote on content,
              and stay connected while the radio plays.
            </p>

            <div style={styles.stackButtons}>
              <a href="/chat" style={styles.panelButton}>
                Open Chat
              </a>
              <a href="/upload" style={styles.panelButtonAlt}>
                Upload Entry
              </a>
            </div>
          </div>
        </section>

        <section style={styles.sectionBlock}>
          <div style={styles.sectionHeader}>
            <div>
              <p style={styles.kickerGold}>NEWS ROOM</p>
              <h2 style={styles.sectionTitle}>News and updates</h2>
            </div>

            <a href="/news" style={styles.smallLink}>
              View All News
            </a>
          </div>

          <div style={styles.linkGrid}>
            {newsLinks.map((item) => (
              <a key={item.href} href={item.href} style={styles.categoryCard}>
                {item.label}
              </a>
            ))}
          </div>
        </section>

        <section style={styles.sectionBlock}>
          <div style={styles.sectionHeader}>
            <div>
              <p style={styles.kickerGold}>BLOG STORIES</p>
              <h2 style={styles.sectionTitle}>Behind Tha Core</h2>
            </div>

            <a href="/blog" style={styles.smallLink}>
              View Blog
            </a>
          </div>

          <div style={styles.linkGrid}>
            {blogLinks.map((item) => (
              <a key={item.href} href={item.href} style={styles.categoryCard}>
                {item.label}
              </a>
            ))}
          </div>
        </section>

        <section style={styles.fomoGrid}>
          <div style={styles.fomoCard}>
            <p style={styles.fomoNumber}>24/7</p>
            <p style={styles.fomoText}>Live music stream</p>
          </div>

          <div style={styles.fomoCard}>
            <p style={styles.fomoNumber}>Promo</p>
            <p style={styles.fomoText}>Advertise your song or business</p>
          </div>

          <div style={styles.fomoCard}>
            <p style={styles.fomoNumber}>Shop</p>
            <p style={styles.fomoText}>Printing, designs, and merch</p>
          </div>

          <div style={styles.fomoCard}>
            <p style={styles.fomoNumber}>Community</p>
            <p style={styles.fomoText}>Chat, uploads, and shoutouts</p>
          </div>
        </section>
      </section>

      <aside style={styles.floatingPlayer}>
        <p style={styles.floatKicker}>THA CORE RADIO</p>
        <p style={styles.floatTitle}>{songText}</p>

        <button type="button" onClick={toggleRadio} style={styles.floatButton}>
          {isPlaying ? "Pause Live" : "Play Live"}
        </button>

        <label style={styles.floatVolume}>
          Volume
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </label>
      </aside>

      <style jsx global>{`
        @keyframes tickerMove {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        @keyframes eqBounce {
          0%,
          100% {
            height: 9px;
            opacity: 0.55;
          }

          50% {
            height: 28px;
            opacity: 1;
          }
        }

        html,
        body {
          margin: 0;
          padding: 0;
          background: #020703;
        }

        * {
          box-sizing: border-box;
        }

        a,
        button {
          -webkit-tap-highlight-color: transparent;
        }

        @media (max-width: 980px) {
          .hide-mobile {
            display: none;
          }
        }
      `}</style>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top, rgba(0,255,127,0.22), transparent 34%), radial-gradient(circle at 80% 20%, rgba(255,0,0,0.18), transparent 30%), linear-gradient(180deg, #020703 0%, #031408 45%, #010101 100%)",
    color: "#fff",
    fontFamily:
      "Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "28px",
    paddingBottom: "170px",
  },

  shell: {
    width: "100%",
    maxWidth: "1500px",
    margin: "0 auto",
  },

  topTicker: {
    width: "100%",
    overflow: "hidden",
    borderRadius: "999px",
    border: "1px solid rgba(255,0,0,0.7)",
    background: "rgba(0,0,0,0.66)",
    boxShadow: "0 0 25px rgba(0,255,127,0.22)",
    marginBottom: "18px",
  },

  tickerTrack: {
    display: "flex",
    gap: "48px",
    width: "max-content",
    padding: "14px 22px",
    color: "#ffdf2e",
    fontSize: "18px",
    fontWeight: 1000,
    fontStyle: "italic",
    whiteSpace: "nowrap",
    animationName: "tickerMove",
    animationDuration: "28s",
    animationTimingFunction: "linear",
    animationIterationCount: "infinite",
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    minHeight: "360px",
    borderRadius: "34px",
    background:
      "linear-gradient(135deg, #fff070 0%, #ffd000 45%, #ffb300 100%)",
    border: "2px solid #ff1f1f",
    boxShadow:
      "0 0 45px rgba(0,255,127,0.25), inset 0 0 65px rgba(255,255,255,0.25)",
    display: "grid",
    gridTemplateColumns: "1fr 310px",
    alignItems: "center",
    gap: "22px",
    padding: "44px",
    color: "#050505",
  },

  heroGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(circle at 75% 30%, rgba(0,255,127,0.42), transparent 34%)",
    pointerEvents: "none",
  },

  heroText: {
    position: "relative",
    zIndex: 2,
  },

  kicker: {
    margin: "0 0 16px",
    color: "#020202",
    fontSize: "16px",
    letterSpacing: "0.42em",
    fontWeight: 1000,
  },

  title: {
    margin: 0,
    fontSize: "clamp(52px, 7vw, 92px)",
    lineHeight: 0.94,
    fontWeight: 1000,
    color: "#030303",
  },

  subtitle: {
    maxWidth: "850px",
    margin: "22px 0",
    fontSize: "22px",
    lineHeight: 1.4,
    fontWeight: 900,
    color: "#080808",
  },

  statusStrip: {
    display: "inline-flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
    borderRadius: "999px",
    background: "rgba(0,0,0,0.75)",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.22)",
    padding: "12px 18px",
    fontWeight: 900,
  },

  statusDot: {
    width: "12px",
    height: "12px",
    borderRadius: "999px",
  },

  statusDivider: {
    color: "#ffdf2e",
    fontWeight: 1000,
  },

  heroActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "14px",
    marginTop: "24px",
  },

  playButton: {
    border: "0",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #b00000, #ff2020)",
    color: "#fff",
    padding: "16px 30px",
    fontSize: "17px",
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: "0 16px 35px rgba(176,0,0,0.35)",
  },

  goldButton: {
    textDecoration: "none",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #111, #333)",
    color: "#ffdf2e",
    padding: "16px 30px",
    fontSize: "17px",
    fontWeight: 1000,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  },

  darkButton: {
    border: "1px solid rgba(0,0,0,0.28)",
    borderRadius: "999px",
    background: "rgba(255,255,255,0.65)",
    color: "#050505",
    padding: "16px 30px",
    fontSize: "17px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  logoWrap: {
    position: "relative",
    zIndex: 2,
    width: "285px",
    height: "285px",
    borderRadius: "999px",
    display: "grid",
    placeItems: "center",
    background: "rgba(0,0,0,0.86)",
    border: "8px solid #00d66b",
    boxShadow:
      "0 0 30px rgba(0,255,127,0.55), 0 0 60px rgba(255,0,0,0.28)",
  },

  logo: {
    width: "250px",
    height: "250px",
    objectFit: "contain",
    display: "block",
  },

  onAirCard: {
    marginTop: "22px",
    borderRadius: "30px",
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.94), rgba(22,18,0,0.92))",
    border: "2px solid rgba(255,0,0,0.75)",
    boxShadow: "0 0 40px rgba(0,255,127,0.18)",
    padding: "26px",
  },

  onAirHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    flexWrap: "wrap",
  },

  onAirBadge: {
    display: "inline-block",
    margin: "0 0 12px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #b00000, #e00000)",
    border: "1px solid #ffdf2e",
    color: "#ffdf2e",
    padding: "12px 18px",
    fontSize: "15px",
    fontWeight: 1000,
    letterSpacing: "0.16em",
  },

  nowTitle: {
    margin: 0,
    fontSize: "32px",
    lineHeight: 1.1,
    fontWeight: 1000,
  },

  equalizer: {
    display: "flex",
    alignItems: "flex-end",
    gap: "7px",
    height: "38px",
  },

  eqBar: {
    width: "10px",
    height: "20px",
    borderRadius: "999px",
    background: "#ffdf2e",
    boxShadow: "0 0 13px rgba(255,223,46,0.8)",
    animationName: "eqBounce",
    animationDuration: "0.9s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
  },

  nowPlayingBox: {
    marginTop: "18px",
    borderRadius: "20px",
    background: "rgba(0,0,0,0.75)",
    border: "1px solid rgba(255,255,255,0.14)",
    padding: "20px",
  },

  nowPlayingLabel: {
    margin: "0 0 10px",
    color: "#ffdf2e",
    fontSize: "14px",
    fontWeight: 1000,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },

  nowPlayingText: {
    margin: 0,
    fontSize: "22px",
    fontWeight: 1000,
  },

  listenerText: {
    margin: "15px 0 0",
    color: "#ff5c5c",
    fontSize: "22px",
    fontWeight: 1000,
  },

  playerLine: {
    marginTop: "18px",
    display: "grid",
    gridTemplateColumns: "240px 1fr",
    gap: "16px",
    alignItems: "center",
  },

  fullPlayButton: {
    width: "100%",
    border: "0",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #b00000, #ff2020)",
    color: "#fff",
    padding: "16px 22px",
    fontSize: "17px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  volumeLabel: {
    color: "#fff",
    fontWeight: 900,
  },

  volumeSlider: {
    width: "100%",
    marginTop: "10px",
    accentColor: "#ffdf2e",
  },

  shoutoutBox: {
    marginTop: "22px",
    borderRadius: "26px",
    background: "rgba(255,223,46,0.1)",
    border: "1px solid rgba(255,223,46,0.45)",
    padding: "24px",
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  kickerGold: {
    margin: "0 0 8px",
    color: "#ffdf2e",
    fontSize: "13px",
    fontWeight: 1000,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "34px",
    fontWeight: 1000,
  },

  sectionText: {
    maxWidth: "760px",
    margin: "12px 0 0",
    color: "rgba(255,255,255,0.78)",
    fontSize: "17px",
    lineHeight: 1.5,
    fontWeight: 750,
  },

  whatsappButton: {
    textDecoration: "none",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #00c853, #00ff7f)",
    color: "#001d0d",
    padding: "15px 24px",
    fontSize: "16px",
    fontWeight: 1000,
  },

  quickGrid: {
    marginTop: "22px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "14px",
  },

  quickLink: {
    textDecoration: "none",
    minHeight: "78px",
    borderRadius: "20px",
    background: "linear-gradient(135deg, rgba(255,0,0,0.24), rgba(0,0,0,0.78))",
    border: "1px solid rgba(255,255,255,0.13)",
    color: "#fff",
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: "16px",
    fontSize: "17px",
    fontWeight: 1000,
    boxShadow: "0 12px 25px rgba(0,0,0,0.28)",
  },

  twoColumn: {
    marginTop: "22px",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "18px",
  },

  panel: {
    borderRadius: "28px",
    background: "rgba(0,0,0,0.72)",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "26px",
    boxShadow: "0 18px 40px rgba(0,0,0,0.32)",
  },

  chipGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "18px",
  },

  chip: {
    borderRadius: "999px",
    background: "rgba(255,223,46,0.14)",
    border: "1px solid rgba(255,223,46,0.4)",
    color: "#ffdf2e",
    padding: "10px 13px",
    fontWeight: 900,
  },

  panelButton: {
    marginTop: "20px",
    textDecoration: "none",
    display: "inline-flex",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #b00000, #ff2020)",
    color: "#fff",
    padding: "14px 22px",
    fontWeight: 1000,
  },

  panelButtonAlt: {
    textDecoration: "none",
    display: "inline-flex",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #111, #333)",
    border: "1px solid rgba(255,223,46,0.45)",
    color: "#ffdf2e",
    padding: "14px 22px",
    fontWeight: 1000,
  },

  stackButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "20px",
  },

  sectionBlock: {
    marginTop: "22px",
    borderRadius: "28px",
    background: "rgba(0,0,0,0.62)",
    border: "1px solid rgba(255,255,255,0.11)",
    padding: "26px",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: "18px",
  },

  smallLink: {
    textDecoration: "none",
    borderRadius: "999px",
    color: "#ffdf2e",
    border: "1px solid rgba(255,223,46,0.4)",
    padding: "12px 16px",
    fontWeight: 1000,
  },

  linkGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },

  categoryCard: {
    textDecoration: "none",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.11)",
    color: "#fff",
    padding: "18px",
    fontWeight: 1000,
    minHeight: "74px",
    display: "flex",
    alignItems: "center",
  },

  fomoGrid: {
    marginTop: "22px",
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "14px",
  },

  fomoCard: {
    borderRadius: "22px",
    background: "linear-gradient(135deg, rgba(255,223,46,0.13), rgba(255,0,0,0.13))",
    border: "1px solid rgba(255,255,255,0.11)",
    padding: "20px",
  },

  fomoNumber: {
    margin: "0 0 8px",
    color: "#ffdf2e",
    fontSize: "30px",
    fontWeight: 1000,
  },

  fomoText: {
    margin: 0,
    color: "rgba(255,255,255,0.78)",
    fontWeight: 850,
    lineHeight: 1.4,
  },

  floatingPlayer: {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    width: "280px",
    zIndex: 100,
    borderRadius: "24px",
    background: "rgba(8,8,8,0.94)",
    border: "1px solid #ff1f1f",
    boxShadow: "0 0 35px rgba(255,0,0,0.24)",
    padding: "18px",
  },

  floatKicker: {
    margin: "0 0 8px",
    color: "#ff6b6b",
    fontSize: "13px",
    fontWeight: 1000,
    letterSpacing: "0.3em",
  },

  floatTitle: {
    margin: "0 0 14px",
    color: "#ffdf2e",
    fontSize: "15px",
    fontWeight: 1000,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  floatButton: {
    width: "100%",
    border: "0",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #b00000, #ff2020)",
    color: "#fff",
    padding: "13px",
    fontSize: "15px",
    fontWeight: 1000,
    cursor: "pointer",
  },

  floatVolume: {
    display: "block",
    marginTop: "12px",
    color: "rgba(255,255,255,0.72)",
    fontSize: "13px",
    fontWeight: 900,
  },
};