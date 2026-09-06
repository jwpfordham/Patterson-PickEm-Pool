"use client";

import { useEffect, useState } from "react";

const WEEK = 1;

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [games, setGames] = useState([]);
  const [savedId, setSavedId] = useState(null);

  useEffect(() => {
    if (!unlocked) return;
    fetch(`/api/schedule?week=${WEEK}`)
      .then((r) => r.json())
      .then((data) => setGames(data.games));
  }, [unlocked]);

  function tryUnlock(e) {
    e.preventDefault();
    if (password.trim().length === 0) {
      setError("Enter the commissioner passcode.");
      return;
    }
    setError("");
    setUnlocked(true);
  }

  async function saveGame(game) {
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        password,
        week: WEEK,
        gameId: game.id,
        favorite: game.favorite,
        spreadRaw: game.spread,
      }),
    });
    if (res.status === 401) {
      setUnlocked(false);
      setError("That passcode was rejected. Try again.");
      return;
    }
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
        password,
        week: WEEK,
        gameId: game.id,
        awayScore: game.awayScore,
        homeScore: game.homeScore,
      }),
    });
    if (res.status === 401) {
      setUnlocked(false);
      setError("That passcode was rejected. Try again.");
      return;
    }
    const data = await res.json();
    setGames(data.games);
    setSavedId(`score-${game.id}`);
    setTimeout(() => setSavedId(null), 1500);
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
          Set Week {WEEK} Spreads
        </h1>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          Enter a whole number and it&apos;s automatically bumped to end in .5 —
          no pushes possible.
        </p>

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
                onChange={(e) =>
                  updateLocal(g.id, {
                    spread: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />

              <button onClick={() => saveGame(g)}>
                {savedId === g.id ? "Saved!" : "Save"}
              </button>
            </div>
          ))}
        </div>

        <h2 className="section-heading">Enter Final Scores</h2>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          Once both scores are in, the game is graded automatically against
          the spread.
        </p>

        <div className="game-list">
          {games.map((g) => (
            <div className="admin-row" key={`score-${g.id}`}>
              <div>
                {g.away} at {g.home}
                <div className="game-when">
                  {g.final ? "Final" : "Not final yet"}
                </div>
              </div>

              <input
                type="number"
                placeholder={`${g.away} score`}
                value={g.awayScore ?? ""}
                onChange={(e) =>
                  updateLocal(g.id, {
                    awayScore: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />

              <input
                type="number"
                placeholder={`${g.home} score`}
                value={g.homeScore ?? ""}
                onChange={(e) =>
                  updateLocal(g.id, {
                    homeScore: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
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
