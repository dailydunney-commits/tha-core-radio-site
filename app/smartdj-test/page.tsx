"use client";

import { useEffect, useState } from "react";

export default function SmartDjTestPage() {
  const [status, setStatus] = useState("SmartDJ test page ready.");
  const [pick, setPick] = useState("No pick yet.");
  const [history, setHistory] = useState<any[]>([]);

  async function recommendNext() {
    setStatus("Asking SmartDJ to recommend next track...");

    const response = await fetch("/api/smartdj/recommend", {
      cache: "no-store",
    });

    const data = await response.json();
    const selected = data?.smartdj?.selected;

    if (!selected) {
      setStatus(data?.error || "No recommendation returned.");
      return;
    }

    setPick(selected.text || selected.filename || "Unknown track");
    setStatus("SmartDJ recommended a track.");
  }

  async function selectNext() {
    setStatus("SmartDJ selecting and saving next track...");

    const response = await fetch("/api/smartdj/select-next", {
      method: "POST",
    });

    const data = await response.json();
    const selected = data?.smartdj?.selected;

    if (!selected) {
      setStatus(data?.error || "No selected track returned.");
      return;
    }

    setPick(selected.text || selected.filename || "Unknown track");
    setStatus("SmartDJ selected and saved the track.");
    loadHistory();
  }

  async function loadHistory() {
    const response = await fetch("/api/smartdj/history", {
      cache: "no-store",
    });

    const data = await response.json();
    const items = data?.smartdj?.history || [];

    setHistory(Array.isArray(items) ? items : []);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <main style={{ minHeight: "100vh", padding: 30, background: "#050000", color: "white" }}>
      <a href="/owner" style={{ color: "#00d1ff", fontWeight: 900 }}>
        Back to Owner Panel
      </a>

      <h1 style={{ color: "#ff2b2b", fontSize: 56 }}>SmartDJ Test</h1>

      <p style={{ fontSize: 20 }}>{status}</p>

      <button onClick={recommendNext} style={{ padding: 16, marginRight: 12 }}>
        Recommend Next
      </button>

      <button onClick={selectNext} style={{ padding: 16, marginRight: 12 }}>
        Select + Save
      </button>

      <button onClick={loadHistory} style={{ padding: 16 }}>
        Refresh History
      </button>

      <h2 style={{ marginTop: 30, color: "#00d1ff" }}>Current Pick</h2>
      <p style={{ fontSize: 26, fontWeight: 900 }}>{pick}</p>

      <h2 style={{ marginTop: 30, color: "#00d1ff" }}>History</h2>

      {history.length === 0 ? (
        <p>No history yet.</p>
      ) : (
        history.slice(0, 10).map((item, index) => (
          <div key={index} style={{ padding: 12, marginTop: 8, background: "#190000" }}>
            <strong>{item.text || item.filename || "Unknown track"}</strong>
            <br />
            <small>{item.playedAt || "Saved by SmartDJ"}</small>
          </div>
        ))
      )}
    </main>
  );
}
