"use client";

const jingles = [
  { label: "Station ID", file: "/drops/station-id.mp3" },
  { label: "DJ Drop", file: "/drops/dj-drop.mp3" },
  { label: "Next Jingle", file: "/drops/next-jingle.mp3" },
  { label: "Hype Drop", file: "/drops/hype-drop.mp3" },
  { label: "Sponsor Drop", file: "/drops/sponsor-drop.mp3" },
  { label: "Ad Drop", file: "/drops/ad-drop.mp3" },
  { label: "Voice Drop", file: "/drops/voice-drop.mp3" },
];

export default function JinglePage() {
  function playDrop(file: string) {
    const audio = new Audio(file);
    audio.volume = 1;
    audio.play().catch(() => {
      alert(`Could not play: ${file}`);
    });
  }

  return (
    <main style={styles.page}>
      <section style={styles.shell}>
        <header style={styles.header}>
          <p style={styles.label}>THA CORE RADIO</p>
          <h1 style={styles.title}>Jingle / Drop Pad</h1>
          <p style={styles.text}>
            Tap a button to play your uploaded station IDs, DJ drops, hype drops,
            sponsor mentions, ads, and voice drops.
          </p>
        </header>

        <section style={styles.grid}>
          {jingles.map((item, index) => (
            <button
              key={item.label}
              style={index % 2 === 0 ? styles.redBtn : styles.darkBtn}
              onClick={() => playDrop(item.file)}
            >
              ♪ {item.label}
            </button>
          ))}
        </section>

        <a href="/control-panel" style={styles.backBtn}>
          ← Back To Control Panel
        </a>
      </section>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#010101",
    color: "#fff",
    padding: 24,
    fontFamily: "Arial, Helvetica, sans-serif",
  },
  shell: {
    border: "2px solid #7a0015",
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 0 35px rgba(120,0,20,.55)",
    background: "linear-gradient(180deg,#030303,#000)",
  },
  header: {
    marginBottom: 24,
  },
  label: {
    color: "#ff1744",
    fontWeight: 900,
    letterSpacing: 3,
  },
  title: {
    fontSize: 48,
    margin: "10px 0",
  },
  text: {
    color: "#ddd",
    maxWidth: 720,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 14,
  },
  redBtn: {
    padding: 22,
    background: "linear-gradient(180deg,#b00020,#43000c)",
    border: "1px solid #ff1744",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  darkBtn: {
    padding: 22,
    background: "linear-gradient(180deg,#1b1b1b,#050505)",
    border: "1px solid #5a0010",
    borderRadius: 10,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  },
  backBtn: {
    display: "inline-block",
    marginTop: 24,
    color: "#fff",
    textDecoration: "none",
    fontWeight: 900,
  },
};