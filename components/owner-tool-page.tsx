"use client";

type OwnerToolPageProps = {
  title?: string;
  subtitle?: string;
  badge?: string;
  cards?: {
    title: string;
    text: string;
  }[];
};

export default function OwnerToolPage({
  title = "Tha Core Control Page",
  subtitle = "Control page connected to the main owner panel.",
  badge = "Tha Core",
  cards = [],
}: OwnerToolPageProps) {
  const safeCards = Array.isArray(cards) ? cards : [];

  return (
    <main className="tool-page">
      <section className="tool-shell">
        <a href="/owner" className="back-link">
          ← Back to Control Panel
        </a>

        <div className="hero">
          <p>{badge}</p>
          <h1>{title}</h1>
          <span>{subtitle}</span>
        </div>

        <div className="card-grid">
          {safeCards.map((card) => (
            <div key={card.title} className="card">
              <h2>{card.title}</h2>
              <p>{card.text}</p>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .tool-page {
          min-height: 100vh;
          padding: 28px;
          color: #ffe9e9;
          background:
            radial-gradient(circle at top left, rgba(155, 0, 0, 0.35), transparent 30%),
            linear-gradient(135deg, #000 0%, #090000 45%, #1a0000 100%);
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .tool-shell {
          width: min(1250px, 100%);
          margin: 0 auto;
        }

        .back-link {
          display: inline-flex;
          margin-bottom: 18px;
          color: #ff4b4b;
          text-decoration: none;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .hero {
          padding: 34px;
          border-radius: 30px;
          background:
            linear-gradient(135deg, rgba(160, 0, 0, 0.42), rgba(0, 0, 0, 0.94)),
            #030000;
          border: 1px solid rgba(190, 0, 0, 0.62);
          box-shadow: 0 0 70px rgba(160, 0, 0, 0.25);
        }

        .hero p {
          margin: 0 0 10px;
          color: #ff3b3b;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }

        .hero h1 {
          margin: 0;
          color: #fff;
          font-size: clamp(38px, 6vw, 82px);
          line-height: 0.95;
          text-transform: uppercase;
          text-shadow: 0 0 24px rgba(255, 0, 0, 0.65);
        }

        .hero span {
          display: block;
          max-width: 850px;
          margin-top: 14px;
          color: #ffd7d7;
          line-height: 1.6;
        }

        .card-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-top: 18px;
        }

        .card {
          min-height: 190px;
          padding: 20px;
          border-radius: 22px;
          background:
            linear-gradient(145deg, rgba(140, 0, 0, 0.2), rgba(0, 0, 0, 0.86)),
            #050000;
          border: 1px solid rgba(180, 0, 0, 0.45);
        }

        .card h2 {
          margin: 0 0 10px;
          color: #ff4b4b;
          font-size: 22px;
          text-transform: uppercase;
        }

        .card p {
          margin: 0;
          color: #ffe1e1;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .card-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
