"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pickem_player_name";

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function MessagesPage({ searchParams }) {
  const [week, setWeek] = useState(Number(searchParams?.week) || null);
  const [roster, setRoster] = useState([]);
  const [messages, setMessages] = useState([]);
  const [player, setPlayer] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setPlayer(saved);

    async function init() {
      const activeWeek = week || (await fetch("/api/current-week").then((r) => r.json())).week;
      setWeek(activeWeek);
      const [rosterRes, messagesRes] = await Promise.all([
        fetch("/api/roster").then((r) => r.json()),
        fetch(`/api/messages?week=${activeWeek}`).then((r) => r.json()),
      ]);
      setRoster(rosterRes.roster || []);
      setMessages(messagesRes.messages || []);
      setLoading(false);
    }
    init();
  }, []);

  async function loadMessagesForWeek(w) {
    setLoading(true);
    const res = await fetch(`/api/messages?week=${w}`).then((r) => r.json());
    setMessages(res.messages || []);
    setLoading(false);
  }

  function choosePlayer() {
    if (!pendingName) return;
    localStorage.setItem(STORAGE_KEY, pendingName);
    setPlayer(pendingName);
  }

  function switchPlayer() {
    localStorage.removeItem(STORAGE_KEY);
    setPlayer("");
    setPendingName("");
  }

  async function postMessage() {
    setError("");
    const trimmed = draft.trim();
    if (!trimmed) {
      setError("Type something first.");
      return;
    }
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week, name: player, text: trimmed }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      return;
    }
    setMessages(data.messages);
    setDraft("");
  }

  if (loading) {
    return (
      <main className="board">
        <div className="board-panel">
          <p className="subtitle">Loading the message board…</p>
        </div>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="board">
        <div className="board-panel admin-lock">
          <h1 className="title" style={{ fontSize: "1.8rem" }}>
            Who&apos;s Posting?
          </h1>
          <select
            value={pendingName}
            onChange={(e) => setPendingName(e.target.value)}
            style={{ width: "100%", padding: "10px", marginTop: 14, borderRadius: 6 }}
          >
            <option value="">Choose your name…</option>
            {roster.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 14 }}>
            <button onClick={choosePlayer}>Continue</button>
          </div>
        </div>
      </main>
    );
  }

  const sorted = [...messages].sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title" style={{ fontSize: "2rem" }}>
          Talk Therapy
        </h1>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          Week {week} ·{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); switchPlayer(); }}>
            not {player}?
          </a>
        </p>

        <div className="week-switcher">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
            <a key={w} href={`/messages?week=${w}`} onClick={(e) => { e.preventDefault(); setWeek(w); loadMessagesForWeek(w); }} className={`week-pill ${w === week ? "active" : ""}`}>{w}</a>
          ))}
        </div>

        <div className="admin-row" style={{ alignItems: "flex-start" }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Say something to the pool, ${player}...`}
            rows={3}
            style={{
              flex: "1 1 100%", padding: "10px 12px", borderRadius: 6,
              border: "1px solid var(--line)", background: "rgba(0,0,0,0.25)",
              color: "var(--chalk)", fontFamily: "inherit", fontSize: "0.95rem", resize: "vertical",
            }}
          />
          <button onClick={postMessage}>Post</button>
        </div>
        {error && <p className="admin-error">{error}</p>}

        <div className="game-list" style={{ marginTop: 16 }}>
          {sorted.length === 0 && (
            <p className="spread-tbd">No messages yet for Week {week} — be the first.</p>
          )}
          {sorted.map((m) => (
            <div className="pick-row" key={m.id}>
              <div className="game-when" style={{ marginBottom: 4 }}>
                <strong style={{ color: "var(--chalk)" }}>{m.name}</strong> · {formatTime(m.at)}
              </div>
              <div style={{ fontSize: "0.95rem" }}>{m.text}</div>
            </div>
          ))}
        </div>

        <p className="footer-link" style={{ marginTop: 28 }}><a href="/">Back to the pool</a></p>
      </div>
    </main>
  );
}
