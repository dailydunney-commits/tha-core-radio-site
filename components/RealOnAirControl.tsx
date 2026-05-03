"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";

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

export default function RealOnAirControl() {
  const [status, setStatus] = useState<RadioStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/status", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus(data);
        setError(data?.message || "Unable to load radio status.");
        return;
      }

      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Radio status error.");
    } finally {
      setLoading(false);
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

  const onAir = Boolean(status?.isOnAir);
  const isLive = Boolean(status?.isLive);
  const autoDj = Boolean(status?.autoDj);

  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>Real Station Status</p>
          <h2 style={styles.title}>On Air Control</h2>
        </div>

        <button type="button" onClick={loadStatus} style={styles.button}>
          {loading ? "Checking..." : "Refresh"}
        </button>
      </div>

      <div style={styles.grid}>
        <StatusBox
          label="Station"
          value={onAir ? "ON AIR" : "OFF AIR"}
          color={onAir ? "#00ff7f" : "#ff3b3b"}
        />

        <StatusBox
          label="Go Live"
          value={isLive ? "LIVE DJ" : "NOT LIVE"}
          color={isLive ? "#00ff7f" : "#ff3b3b"}
        />

        <StatusBox
          label="AutoDJ"
          value={autoDj ? "AUTODJ ON" : "AUTODJ OFF"}
          color={autoDj ? "#ffcc00" : "#ff3b3b"}
        />

        <StatusBox
          label="Listeners"
          value={`${status?.listeners?.current ?? 0}`}
          color="#00d9ff"
        />
      </div>

      <div style={styles.nowPlaying}>
        <p style={styles.nowLabel}>Now Playing</p>
        <p style={styles.nowText}>
          {status?.nowPlaying?.text ||
            `${status?.nowPlaying?.artist || "Tha Core"} - ${
              status?.nowPlaying?.title || "Live Radio"
            }`}
        </p>
      </div>

      {error ? <p style={styles.error}>{error}</p> : null}
    </section>
  );
}

function StatusBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <article style={styles.statusBox}>
      <span
        style={{
          ...styles.dot,
          background: color,
          boxShadow: `0 0 16px ${color}`,
        }}
      />

      <div>
        <p style={styles.statusLabel}>{label}</p>
        <p style={{ ...styles.statusValue, color }}>{value}</p>
      </div>
    </article>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    width: "100%",
    borderRadius: "28px",
    background:
      "linear-gradient(135deg, rgba(12,12,12,0.97), rgba(28,12,12,0.97))",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "24px",
    color: "#fff",
    boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "18px",
  },

  kicker: {
    margin: "0 0 6px",
    color: "#ffcc00",
    fontWeight: 1000,
    fontSize: "12px",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },

  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 1000,
  },

  button: {
    border: "0",
    borderRadius: "999px",
    padding: "12px 18px",
    background: "linear-gradient(135deg, #b00000, #ff3030)",
    color: "#fff",
    fontWeight: 1000,
    cursor: "pointer",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
  },

  statusBox: {
    minHeight: "90px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  dot: {
    width: "13px",
    height: "13px",
    borderRadius: "999px",
    flex: "0 0 auto",
  },

  statusLabel: {
    margin: "0 0 6px",
    color: "rgba(255,255,255,0.65)",
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase",
  },

  statusValue: {
    margin: 0,
    fontSize: "17px",
    fontWeight: 1000,
  },

  nowPlaying: {
    marginTop: "16px",
    borderRadius: "18px",
    background: "rgba(0,0,0,0.32)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "14px 16px",
  },

  nowLabel: {
    margin: "0 0 6px",
    color: "#ffcc00",
    fontWeight: 1000,
    fontSize: "12px",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },

  nowText: {
    margin: 0,
    color: "#fff",
    fontSize: "16px",
    fontWeight: 900,
  },

  error: {
    margin: "14px 0 0",
    borderRadius: "14px",
    background: "rgba(255,0,0,0.14)",
    border: "1px solid rgba(255,0,0,0.35)",
    color: "#ffb3b3",
    padding: "12px",
    fontWeight: 800,
  },
};
