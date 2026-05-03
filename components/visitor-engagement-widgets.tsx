"use client";

import Link from "next/link";

const WHATSAPP_NUMBER = "18768842867";

const requestText =
  "THA CORE RADIO VISITOR REQUEST%0A%0AName:%0ASong/Shoutout:%0ACity:%0A";

const whatsappRequestUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${requestText}`;

const stats = [
  {
    title: "Listeners Online",
    value: "2 tuned in now",
  },
  {
    title: "Joined Today",
    value: "34 new listeners today",
  },
  {
    title: "Top Cities",
    value: "Kingston - Montego Bay - London",
  },
  {
    title: "Live Energy",
    value: "Music - Chat - Store - Giveaways",
  },
];

const moneyMoves = [
  "Promote your song on Tha Core Radio",
  "Book radio ads and sponsor drops",
  "Order graphics, printing, and promo material",
  "Shop Tha Core store while the radio keeps playing",
];

const quickLinks = [
  {
    label: "Store",
    href: "/store",
  },
  {
    label: "Chat",
    href: "/chat",
  },
  {
    label: "Upload Entry",
    href: "/upload",
  },
  {
    label: "World News",
    href: "/news",
  },
  {
    label: "Blog / Stories",
    href: "/blog",
  },
  {
    label: "Cash Pot / Lotto",
    href: "/cashpot-lotto",
  },
];

export default function VisitorEngagementWidgets() {
  return (
    <section style={styles.wrap}>
      <div style={styles.statsGrid}>
        {stats.map((item) => (
          <article key={item.title} style={styles.statCard}>
            <h2 style={styles.cardTitle}>{item.title}</h2>
            <p style={styles.cardText}>{item.value}</p>
          </article>
        ))}
      </div>

      <div style={styles.mainGrid}>
        <article style={styles.bigCard}>
          <h2 style={styles.sectionTitle}>Request Song / Shoutout</h2>

          <p style={styles.cardText}>
            Send your song request, birthday shoutout, city check-in, or promo message
            straight to Tha Core.
          </p>

          <div style={styles.formBox}>
            <label style={styles.label}>Name</label>
            <input style={styles.input} placeholder="Your name" />

            <label style={styles.label}>Song / Shoutout</label>
            <textarea
              style={styles.textarea}
              placeholder="Type your request or shoutout here"
            />

            <a
              href={whatsappRequestUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.redButton}
            >
              Send On WhatsApp
            </a>
          </div>
        </article>

        <article style={styles.bigCard}>
          <h2 style={styles.sectionTitle}>Money Moves</h2>

          <div style={styles.moneyList}>
            {moneyMoves.map((item) => (
              <div key={item} style={styles.moneyItem}>
                <span style={styles.dot}></span>
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div style={styles.quickGrid}>
            {quickLinks.map((item) => (
              <Link key={item.href} href={item.href} style={styles.quickLink}>
                {item.label}
              </Link>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

export { VisitorEngagementWidgets };

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    width: "100%",
    marginTop: 22,
    display: "grid",
    gap: 22,
  },

  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 18,
  },

  statCard: {
    border: "1px solid #d50000",
    borderRadius: 18,
    background: "linear-gradient(180deg,#08080b,#020202)",
    boxShadow: "0 0 24px rgba(0,255,100,.16)",
    padding: 24,
    minHeight: 105,
  },

  cardTitle: {
    margin: "0 0 14px",
    color: "#ff5c6c",
    fontSize: 25,
    fontWeight: 1000,
  },

  cardText: {
    margin: 0,
    color: "#ffffff",
    fontSize: 16,
    lineHeight: 1.5,
  },

  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 22,
  },

  bigCard: {
    border: "1px solid #d50000",
    borderRadius: 18,
    background: "linear-gradient(180deg,#08080b,#020202)",
    boxShadow: "0 0 24px rgba(255,0,40,.16)",
    padding: 24,
    minHeight: 330,
  },

  sectionTitle: {
    margin: "0 0 16px",
    color: "#ff5c6c",
    fontSize: 31,
    fontWeight: 1000,
  },

  formBox: {
    marginTop: 18,
    display: "grid",
    gap: 10,
  },

  label: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 1,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d50000",
    borderRadius: 12,
    background: "#000",
    color: "#fff",
    padding: "13px 14px",
    outline: "none",
  },

  textarea: {
    width: "100%",
    minHeight: 100,
    boxSizing: "border-box",
    border: "1px solid #d50000",
    borderRadius: 12,
    background: "#000",
    color: "#fff",
    padding: "13px 14px",
    outline: "none",
    resize: "vertical",
  },

  redButton: {
    textDecoration: "none",
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    border: "1px solid #ff1744",
    borderRadius: 14,
    background: "linear-gradient(180deg,#d50000,#760000)",
    color: "#fff",
    padding: "14px 18px",
    fontWeight: 1000,
    boxShadow: "0 0 18px rgba(255,0,40,.3)",
  },

  moneyList: {
    display: "grid",
    gap: 12,
    marginTop: 16,
  },

  moneyItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#fff",
    fontWeight: 800,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#ff1744",
    boxShadow: "0 0 14px #ff1744",
    flex: "0 0 auto",
  },

  quickGrid: {
    marginTop: 24,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },

  quickLink: {
    textDecoration: "none",
    textAlign: "center",
    border: "1px solid #d50000",
    borderRadius: 14,
    background: "#000",
    color: "#fff",
    padding: "14px 12px",
    fontWeight: 1000,
  },
};