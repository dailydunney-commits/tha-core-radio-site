"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const STREAM_URL =
  process.env.NEXT_PUBLIC_STREAM_URL ||
  "https://thacoreonlinerad.com/listen/tha-core-online/radio.mp3";

type NowPlayingData = {
  song?: {
    artist?: string;
    title?: string;
    text?: string;
    art?: string;
  };
  station?: {
    name?: string;
    listen_url?: string;
  };
  listeners?: {
    current?: number;
    unique?: number;
    total?: number;
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

const navLinks = [
  { label: "Community Chat", href: "/chat" },
  { label: "Store", href: "/store" },
  { label: "Upload Entry", href: "/upload" },
  { label: "World News", href: "/news/world" },
  { label: "Music News", href: "/news/music" },
  { label: "Blog / Stories", href: "/blog" },
  { label: "Cash Pot / Lotto", href: "/lotto" },
  { label: "Time Reader", href: "/time-reader" },
  { label: "Weather Reader", href: "/weather-reader" },
  { label: "Radio", href: "/radio" },
];

const featureCards = [
  {
    title: "Listeners Online",
    value: "Live count",
    text: "See who is tuned in now.",
  },
  {
    title: "Joined Today",
    value: "34 new listeners",
    text: "Fresh visitors joining Tha Core.",
  },
  {
    title: "Top Cities",
    value: "Kingston • Montego Bay • London",
    text: "Tha Core reaching across the map.",
  },
  {
    title: "Live Energy",
    value: "Music • Chat • Store • Giveaways",
    text: "One home for the whole movement.",
  },
];

export default function HomePage() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [listeners, setListeners] = useState(0);
  const [nowPlaying, setNowPlaying] = useState(
    "Live From Tha Core - Tha Core Live Mix"
  );
  const [logoSrc, setLogoSrc] = useState("/Tha-Core-Logo.png");

  const tickerText = useMemo(() => {
    return nowPlaying || "Live From Tha Core - Tha Core Live Mix";
  }, [nowPlaying]);

  useEffect(() => {
    async function loadNowPlaying() {
      try {
        const urls = [
          process.env.NEXT_PUBLIC_AZURACAST_NOW_PLAYING_URL,
          "https://thacoreonlinerad.com/api/nowplaying/1",
        ].filter(Boolean) as string[];

        const response = await fetch(urls[0], {
          cache: "no-store",
        });

        if (!response.ok) return;

        const data: NowPlayingData = await response.json();

        const songText =
          data?.now_playing?.song?.text ||
          data?.song?.text ||
          [
            data?.now_playing?.song?.artist || data?.song?.artist,
            data?.now_playing?.song?.title || data?.song?.title,
          ]
            .filter(Boolean)
            .join(" - ");

        if (songText) {
          setNowPlaying(songText);
        }

        if (typeof data?.listeners?.current === "number") {
          setListeners(data.listeners.current);
        }
      } catch {
        // Keep fallback text if AzuraCast cannot be reached.
      }
    }

    loadNowPlaying();

    const timer = window.setInterval(() => {
      loadNowPlaying();
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.volume = volume;
  }, [volume]);

  async function toggleLiveRadio() {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      audioRef.current.src = STREAM_URL;
      audioRef.current.volume = volume;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  }

  return (
    <main style={styles.page}>
      <audio ref={audioRef} preload="none" />

      <section style={styles.pageShell}>
        <section style={styles.topTicker}>
          <strong>NOW PLAYING:</strong> {tickerText}
        </section>

        <section style={styles.alertTicker}>
          Vote next song • Flash sale ends in 10 mins • Drop your shoutout live
          now
        </section>

        <section style={styles.hero}>
          <div style={styles.heroContent}>
            <p style={styles.kicker}>LIVE FROM THA CORE</p>

            <h1 style={styles.title}>Tha Core Radio</h1>

            <p style={styles.subtitle}>
              Live radio, store, chat, uploads, shoutouts, world news, radio
              promos, and business moves.
            </p>

            <section style={styles.nowPlayingCard}>
              <div style={styles.onAirBadge}>ON AIR NOW • NOW PLAYING</div>

              <div style={styles.lightRow}>
                {Array.from({ length: 10 }).map((_, index) => (
                  <span
                    key={index}
                    style={{
                      ...styles.goldLight,
                      animationDelay: `${index * 0.08}s`,
                    }}
                  />
                ))}
              </div>

              <div style={styles.songBox}>{tickerText}</div>

              <p style={styles.stationLine}>Live From Tha Core</p>

              <p style={styles.listenerCount}>
                {listeners} listeners online
              </p>
            </section>

            <div style={styles.buttonGrid}>
              <a href="/chat" style={styles.redButton}>
                Join Community Chat
              </a>

              <a href="/store" style={styles.blackButton}>
                Store
              </a>

              <a href="/upload" style={styles.redButton}>
                Upload Entry
              </a>

              <a href="/news/world" style={styles.redButton}>
                World News
              </a>

              <a href="/blog" style={styles.blackButton}>
                Blog / Stories
              </a>

              <a href="/lotto" style={styles.redButton}>
                Cash Pot / Lotto
              </a>
            </div>
          </div>

          <div style={styles.logoPanel}>
            <img
              src={logoSrc}
              alt="Tha Core Radio Logo"
              style={styles.logo}
              onError={() => {
                if (logoSrc === "/Tha-Core-Logo.png") {
                  setLogoSrc("/logo.png");
                } else if (logoSrc === "/logo.png") {
                  setLogoSrc("/icon-512.png");
                }
              }}
            />
          </div>
        </section>

        <section style={styles.featureGrid}>
          {featureCards.map((card) => (
            <article key={card.title} style={styles.featureCard}>
              <h2 style={styles.featureTitle}>{card.title}</h2>
              <p style={styles.featureValue}>
                {card.title === "Listeners Online"
                  ? `${listeners} tuned in now`
                  : card.value}
              </p>
              <p style={styles.featureText}>{card.text}</p>
            </article>
          ))}
        </section>

        <section style={styles.sectionGrid}>
          <article style={styles.sectionCard}>
            <p style={styles.sectionKicker}>Tha Core Store</p>
            <h2 style={styles.sectionTitle}>Prints, merch, promos & ads</h2>
            <p style={styles.sectionText}>
              Shop designs, radio promos, ads, printing services, and custom
              products while the music keeps playing.
            </p>
            <a href="/store" style={styles.sectionButton}>
              Open Store
            </a>
          </article>

          <article style={styles.sectionCard}>
            <p style={styles.sectionKicker}>Community</p>
            <h2 style={styles.sectionTitle}>Chat, shoutouts & uploads</h2>
            <p style={styles.sectionText}>
              Listeners can send shoutouts, upload entries, follow updates, and
              stay locked in with Tha Core.
            </p>
            <a href="/chat" style={styles.sectionButton}>
              Join Community Chat
            </a>
          </article>

          <article style={styles.sectionCard}>
            <p style={styles.sectionKicker}>News & Updates</p>
            <h2 style={styles.sectionTitle}>World, music, sports & weather</h2>
            <p style={styles.sectionText}>
              Keep the site active with news sections, blogs, cash pot, weather,
              and time reader tools.
            </p>
            <a href="/news" style={styles.sectionButton}>
              Read News
            </a>
          </article>
        </section>

        <section style={styles.linkRail}>
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} style={styles.railLink}>
              {link.label}
            </a>
          ))}
        </section>
      </section>

      <aside style={styles.floatingPlayer}>
        <p style={styles.floatKicker}>THA CORE RADIO</p>

        <h2 style={styles.floatTitle}>Floating Player</h2>

        <p style={styles.floatText}>One-touch live radio control.</p>

        <div style={styles.floatSong}>♫ {tickerText}</div>

        <button type="button" onClick={toggleLiveRadio} style={styles.floatBtn}>
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

        <p style={styles.streamUrl}>{STREAM_URL}</p>
      </aside>

      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          background: #020402;
        }

        * {
          box-sizing: border-box;
        }

        @keyframes glowPulse {
          0% {
            opacity: 0.45;
            transform: scale(0.85);
          }

          100% {
            opacity: 1;
            transform: scale(1.18);
          }
        }

        @media (max-width: 1100px) {
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
    width: "100%",
    background:
      "radial-gradient(circle at center, rgba(0, 180, 80, 0.36), transparent 42%), linear-gradient(180deg, #030603 0%, #000 48%, #021106 100%)",
    color: "#fff",
    fontFamily:
      "Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "28px 18px 80px",
  },

  pageShell: {
    width: "100%",
    maxWidth: "1320px",
    margin: "0 auto",
  },

  topTicker: {
    width: "100%",
    border: "1px solid rgba(255, 0, 0, 0.75)",
    borderRadius: "16px",
    background:
      "linear-gradient(135deg, rgba(0,0,0,0.96), rgba(12,40,18,0.95))",
    color: "#ffea00",
    padding: "18px 24px",
    fontSize: "20px",
    fontWeight: 900,
    fontStyle: "italic",
    boxShadow: "0 0 34px rgba(0,255,120,0.22)",
    marginBottom: "20px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },

  alertTicker: {
    width: "100%",
    border: "1px solid rgba(255, 0, 0, 0.75)",
    borderRadius: "16px",
    background:
      "linear-gradient(135deg, rgba(20,0,0,0.96), rgba(11,50,20,0.95))",
    color: "#ffea00",
    padding: "22px 24px",
    fontSize: "20px",
    fontWeight: 900,
    fontStyle: "italic",
    marginBottom: "22px",
    boxShadow: "0 0 30px rgba(0,255,120,0.2)",
  },

  hero: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "1fr 270px",
    gap: "26px",
    minHeight: "620px",
    borderRadius: "30px",
    border: "2px solid #ff1616",
    background:
      "linear-gradient(135deg, #fff47a 0%, #ffe34a 38%, #ffc400 72%, #11d36a 100%)",
    color: "#050505",
    padding: "42px 30px",
    overflow: "hidden",
    boxShadow:
      "0 0 55px rgba(0,255,100,0.35), 0 0 90px rgba(255,0,0,0.18)",
  },

  heroContent: {
    position: "relative",
    zIndex: 2,
    maxWidth: "960px",
  },

  kicker: {
    margin: "0 0 24px",
    letterSpacing: "0.48em",
    fontSize: "14px",
    fontWeight: 1000,
  },

  title: {
    margin: "0 0 18px",
    fontSize: "clamp(54px, 7vw, 92px)",
    lineHeight: 0.92,
    fontWeight: 1000,
    color: "#000",
  },

  subtitle: {
    margin: "0 0 28px",
    fontSize: "19px",
    fontWeight: 900,
    color: "#050505",
    lineHeight: 1.45,
  },

  logoPanel: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "10px",
  },

  logo: {
    width: "245px",
    height: "245px",
    borderRadius: "999px",
    objectFit: "cover",
    border: "8px solid #00d46a",
    background: "#000",
    boxShadow: "0 18px 60px rgba(0,0,0,0.48)",
  },

  nowPlayingCard: {
    width: "100%",
    maxWidth: "930px",
    borderRadius: "22px",
    border: "2px solid #f00000",
    background: "rgba(12, 12, 0, 0.86)",
    padding: "22px",
    color: "#fff",
    boxShadow: "inset 0 0 26px rgba(0,0,0,0.5)",
    marginBottom: "26px",
  },

  onAirBadge: {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #d00000, #a00000)",
    border: "2px solid #ffdd00",
    color: "#ffef00",
    padding: "12px 20px",
    fontWeight: 1000,
    letterSpacing: "0.14em",
    boxShadow: "0 0 22px rgba(255,221,0,0.45)",
    marginBottom: "14px",
  },

  lightRow: {
    display: "flex",
    gap: "9px",
    margin: "0 0 18px",
  },

  goldLight: {
    width: "17px",
    height: "17px",
    borderRadius: "999px",
    background: "#ffca00",
    boxShadow: "0 0 14px rgba(255,204,0,0.9)",
    animationName: "glowPulse",
    animationDuration: "1s",
    animationTimingFunction: "ease-in-out",
    animationIterationCount: "infinite",
    animationDirection: "alternate",
  },

  songBox: {
    borderRadius: "12px",
    border: "1px solid #ff0000",
    background: "#030303",
    padding: "15px 18px",
    color: "#fff",
    fontSize: "18px",
    fontWeight: 1000,
    textAlign: "right",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },

  stationLine: {
    margin: "18px 0 0",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 800,
  },

  listenerCount: {
    margin: "18px 0 0",
    color: "#ff6666",
    fontSize: "25px",
    fontWeight: 1000,
  },

  buttonGrid: {
    display: "flex",
    alignItems: "stretch",
    flexWrap: "wrap",
    gap: "12px",
  },

  redButton: {
    minWidth: "120px",
    minHeight: "82px",
    border: "0",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #d90000, #bd0000)",
    color: "#fff",
    padding: "16px 18px",
    fontSize: "16px",
    fontWeight: 1000,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
  },

  blackButton: {
    minWidth: "120px",
    minHeight: "82px",
    borderRadius: "14px",
    background: "#020202",
    color: "#fff",
    padding: "16px 18px",
    fontSize: "16px",
    fontWeight: 1000,
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
  },

  featureGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "24px",
    marginTop: "36px",
  },

  featureCard: {
    borderRadius: "22px",
    border: "1px solid #d90000",
    background: "rgba(5,5,5,0.92)",
    padding: "24px",
    color: "#fff",
    minHeight: "150px",
    boxShadow: "0 0 28px rgba(0,255,120,0.14)",
  },

  featureTitle: {
    margin: "0 0 14px",
    color: "#ff5f5f",
    fontSize: "25px",
    fontWeight: 1000,
  },

  featureValue: {
    margin: "0 0 10px",
    color: "#fff",
    fontSize: "16px",
    lineHeight: 1.5,
  },

  featureText: {
    margin: 0,
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.5,
  },

  sectionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "24px",
    marginTop: "32px",
  },

  sectionCard: {
    borderRadius: "24px",
    border: "1px solid rgba(255,0,0,0.8)",
    background:
      "linear-gradient(135deg, rgba(10,10,10,0.98), rgba(20,35,15,0.94))",
    padding: "28px",
    minHeight: "260px",
    color: "#fff",
  },

  sectionKicker: {
    margin: "0 0 10px",
    color: "#ffdf00",
    fontSize: "13px",
    fontWeight: 1000,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },

  sectionTitle: {
    margin: "0 0 14px",
    fontSize: "28px",
    lineHeight: 1.05,
    fontWeight: 1000,
  },

  sectionText: {
    margin: "0 0 24px",
    color: "rgba(255,255,255,0.76)",
    lineHeight: 1.55,
    fontSize: "16px",
  },

  sectionButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "999px",
    background: "linear-gradient(135deg, #d90000, #ff2525)",
    color: "#fff",
    fontWeight: 1000,
    padding: "13px 20px",
    textDecoration: "none",
  },

  linkRail: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "30px",
    paddingBottom: "60px",
  },

  railLink: {
    borderRadius: "999px",
    border: "1px solid rgba(255,0,0,0.75)",
    background: "rgba(0,0,0,0.72)",
    color: "#ffdf00",
    padding: "11px 16px",
    textDecoration: "none",
    fontWeight: 900,
  },

  floatingPlayer: {
    position: "fixed",
    right: "24px",
    bottom: "24px",
    width: "330px",
    borderRadius: "22px",
    border: "1px solid #ff0000",
    background: "rgba(6,6,6,0.96)",
    color: "#fff",
    padding: "24px",
    zIndex: 40,
    boxShadow: "0 20px 70px rgba(0,0,0,0.55)",
  },

  floatKicker: {
    margin: "0 0 14px",
    color: "#ff6d6d",
    letterSpacing: "0.28em",
    fontSize: "13px",
    fontWeight: 1000,
  },

  floatTitle: {
    margin: "0 0 8px",
    fontSize: "31px",
    fontWeight: 1000,
  },

  floatText: {
    margin: "0 0 16px",
    color: "rgba(255,255,255,0.7)",
  },

  floatSong: {
    borderRadius: "12px",
    border: "1px solid #ff0000",
    background: "#050505",
    padding: "13px 14px",
    color: "#ffdf00",
    fontWeight: 900,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    marginBottom: "14px",
  },

  floatBtn: {
    width: "100%",
    border: "0",
    borderRadius: "14px",
    background: "linear-gradient(135deg, #e00000, #c40000)",
    color: "#fff",
    padding: "17px",
    fontSize: "16px",
    fontWeight: 1000,
    cursor: "pointer",
    marginBottom: "16px",
  },

  volumeLabel: {
    display: "block",
    color: "rgba(255,255,255,0.72)",
    fontSize: "13px",
    fontWeight: 900,
  },

  volumeSlider: {
    width: "100%",
    marginTop: "10px",
    accentColor: "#009dff",
  },

  streamUrl: {
    margin: "12px 0 0",
    color: "rgba(255,255,255,0.42)",
    fontSize: "10px",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
};