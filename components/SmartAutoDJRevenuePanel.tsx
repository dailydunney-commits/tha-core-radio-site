"use client";

export default function SmartAutoDJRevenuePanel() {
  return (
    <section style={styles.card}>
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>Smart AutoDJ</p>
          <h2 style={styles.title}>Revenue Panel</h2>
        </div>

        <span style={styles.badge}>Ready</span>
      </div>

      <div style={styles.grid}>
        <InfoBox title="AutoDJ Mode" value="Status Ready" />
        <InfoBox title="Jingles" value="Drops / Ads / Promos" />
        <InfoBox title="Revenue" value="Sponsors + Paid Plays" />
        <InfoBox title="Commercials" value="Setup Ready" />
      </div>

      <p style={styles.note}>
        Smart AutoDJ revenue panel restored. This file only fixes the missing
        import so the owner page can build.
      </p>
    </section>
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

const styles: Record<string, React.CSSProperties> = {
  card: {
    width: "100%",
    borderRadius: "28px",
    background:
      "linear-gradient(135deg, rgba(15,15,15,0.97), rgba(28,20,5,0.97))",
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

  badge: {
    borderRadius: "999px",
    background: "rgba(255,204,0,0.16)",
    border: "1px solid rgba(255,204,0,0.4)",
    color: "#ffcc00",
    padding: "10px 14px",
    fontWeight: 1000,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
  },

  infoBox: {
    minHeight: "90px",
    borderRadius: "18px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "14px",
  },

  infoTitle: {
    margin: "0 0 8px",
    color: "rgba(255,255,255,0.65)",
    fontSize: "12px",
    fontWeight: 900,
    textTransform: "uppercase",
  },

  infoValue: {
    margin: 0,
    color: "#fff",
    fontSize: "16px",
    lineHeight: 1.35,
    fontWeight: 1000,
  },

  note: {
    margin: "16px 0 0",
    color: "rgba(255,255,255,0.7)",
    lineHeight: 1.5,
    fontWeight: 700,
  },
};
