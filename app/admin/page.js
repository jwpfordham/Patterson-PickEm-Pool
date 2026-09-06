"use client";

import { useEffect, useState } from "react";

const PASSWORD_KEY = "pickem_admin_pw";

export default function AdminPage({ searchParams }) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [week, setWeek] = useState(Number(searchParams?.week) || null);
  const [currentWeek, setCurrentWeekState] = useState(null);
  const [games, setGames] = useState([]);
  const [savedId, setSavedId] = useState(null);
  const [newGame, setNewGame] = useState({ away: "", home: "", day: "", time: "", network: "" });

  useEffect(() => {
    const saved = typeof window !== "undefined" ? sessionStorage.getItem(PASSWORD_KEY) : null;
    if (saved) {
      setPassword(saved);
      setUnlocked(true);
    }
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    async function init() {
      const cw = (await fetch("/api/current-week").then((r) => r.json())).week;
      setCurrentWeekState(cw);
      const activeWeek = week || cw;
      setWeek(activeWeek);
      const scheduleRes = await fetch(`/api/schedule?week=${activeWeek}`).then((r) => r.json());
      setGames(scheduleRes.games || []);
    }
    init();
  }, [unlocked, week]);

  function tryUnlock(e) {
    e.preventDefault();
    if (password.trim().length === 0) {
      setError("Enter the commissioner passcode.");
      return;
    }
    setError("");
    sessionStorage.setItem(PASSWORD_KEY, password);
    setUnlocked(true);
  }

  function handleAuthFailure() {
    sessionStorage.removeItem(PASSWORD_KEY);
    setUnlocked(false);
    setError("That passcode was rejected. Try again.");
  }

  async function saveGame(game) {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password, week, gameId: game.id,
        favorite: game.favorite, spreadRaw: game.spread,
      }),
    });
    if (res.status === 401) return handleAuthFailure();
    const data = await res.json();
    setGames(data.games);
    setSavedId(game.id);
    setTimeout(() => setSavedId(null), 1500);
  }

  async function saveScore(game) {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password, week, gameId: game.id,
        awayScore: game.awayScore, homeScore: game.homeScore,
      }),
    });
    if (res.status === 401) return handleAuthFailure();
    const data = await res.json();
    setGames(data.games);
    setSavedId(`score-${game.id}`);
    setTimeout(() => setSavedId(null), 1500);
  }

  async function addGame() {
    if (!newGame.away || !newGame.home) return;
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, week, action: "addGame", game: newGame }),
    });
    if (res.status === 401) return handleAuthFailure();
    const data = await res.json();
    setGames(data.games);
    setNewGame({ away: "", home: "", day: "", time: "", network: "" });
  }

  async function removeGame(gameId) {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, week, action: "removeGame", gameId }),
    });
    if (res.status === 401) return handleAuthFailure();
    const data = await res.json();
    setGames(data.games);
  }

  async function setAsCurrentWeek() {
    const res = await fetch("/api/current-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, week }),
    });
    if (res.status === 401) return handleAuthFailure();
    const data = await res.json();
    setCurrentWeekState(data.week);
  }

  function updateLocal(id, patch) {
    setGames((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  }

  if (!unlocked) {
    return (
      <main className="board">
        <div className="board-panel admin-lock">
          <h1 className="title" style={{ fontSize: "1.8rem" }}>
            Commissioner Login
          </h1>
          <form onSubmit={tryUnlock}>
            <input
              type="password"
              placeholder="Passcode"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <div style={{ marginTop: 14 }}>
              <button type="submit">Enter</button>
            </div>
          </form>
          {error && <p className="admin-error">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title" style={{ fontSize: "2rem" }}>
          Managing Week {week}
        </h1>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          Current week for players is Week {currentWeek}
          {week !== currentWeek && (
            <> · <a href="#" onClick={(e) => { e.preventDefault(); setAsCurrentWeek(); }}>make Week {week} current</a></>
          )}
        </p>

        <div className="week-switcher">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
            <a key={w} href={`/admin?week=${w}`} className={`week-pill ${w === week ? "active" : ""}`}>
              {w}
            </a>
          ))}
        </div>

        <h2 className="section-heading">Games This Week</h2>
        {games.length === 0 && (
          <p className="spread-tbd">No games yet for Week {week} — add them below.</p>
        )}

        <div className="game-list">
          {games.map((g) => (
            <div className="admin-row" key={g.id}>
              <div>
                {g.away} at {g.home}
                <div className="game-when">{g.day} · {g.time}</div>
              </div>

              <select
                value={g.favorite || ""}
                onChange={(e) => updateLocal(g.id, { favorite: e.target.value || null })}
              >
                <option value="">Favorite?</option>
                <option value="AWAY">{g.away}</option>
                <option value="HOME">{g.home}</option>
              </select>

              <input
                type="number"
                step="0.5"
                placeholder="Points"
                value={g.spread ?? ""}
                onChange={(e) => updateLocal(g.id, { spread: e.target.value === "" ? null : Number(e.target.value) })}
              />

              <button onClick={() => saveGame(g)}>
                {savedId === g.id ? "Saved!" : "Save"}
              </button>

              <button onClick={() => removeGame(g.id)} style={{ background: "transparent", color: "var(--chalk-red)", border: "1px solid var(--chalk-red)" }}>
                Remove
              </button>
            </div>
          ))}
        </div>

        <h2 className="section-heading">Add a Game</h2>
        <div className="admin-row">
          <input placeholder="Away team" value={newGame.away} onChange={(e) => setNewGame({ ...newGame, away: e.target.value })} />
          <input placeholder="Home team" value={newGame.home} onChange={(e) => setNewGame({ ...newGame, home: e.target.value })} />
          <input placeholder="Day (e.g. Sun 9/20)" value={newGame.day} onChange={(e) => setNewGame({ ...newGame, day: e.target.value })} />
          <input placeholder="Time (e.g. 1:00 PM ET)" value={newGame.time} onChange={(e) => setNewGame({ ...newGame, time: e.target.value })} />
          <button onClick={addGame}>Add Game</button>
        </div>

        <h2 className="section-heading">Enter Final Scores</h2>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          Once both scores are in, the game is graded automatically against the spread.
        </p>

        <div className="game-list">
          {games.map((g) => (
            <div className="admin-row" key={`score-${g.id}`}>
              <div>
                {g.away} at {g.home}
                <div className="game-when">{g.final ? "Final" : "Not final yet"}</div>
              </div>

              <input
                type="number"
                placeholder={`${g.away} score`}
                value={g.awayScore ?? ""}
                onChange={(e) => updateLocal(g.id, { awayScore: e.target.value === "" ? null : Number(e.target.value) })}
              />

              <input
                type="number"
                placeholder={`${g.home} score`}
                value={g.homeScore ?? ""}
                onChange={(e) => updateLocal(g.id, { homeScore: e.target.value === "" ? null : Number(e.target.value) })}
              />

              <button onClick={() => saveScore(g)}>
                {savedId === `score-${g.id}` ? "Saved!" : "Save"}
              </button>
            </div>
          ))}
        </div>

        <p className="footer-link">
          <a href="/">Back to the pool</a>
        </p>
      </div>
    </main>
  );
}
