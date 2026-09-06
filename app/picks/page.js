"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pickem_player_name";

function formatTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PicksPage({ searchParams }) {
  const [week, setWeek] = useState(Number(searchParams?.week) || null);
  const [roster, setRoster] = useState([]);
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState({});
  const [player, setPlayer] = useState("");
  const [pendingName, setPendingName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setPlayer(saved);

    async function init() {
      const activeWeek = week || (await fetch("/api/current-week").then((r) => r.json())).week;
      setWeek(activeWeek);
      const [rosterRes, scheduleRes, picksRes] = await Promise.all([
        fetch("/api/roster").then((r) => r.json()),
        fetch(`/api/schedule?week=${activeWeek}`).then((r) => r.json()),
        fetch(`/api/picks?week=${activeWeek}`).then((r) => r.json()),
      ]);
      setRoster(rosterRes.roster || []);
      setGames(scheduleRes.games || []);
      setPicks(picksRes.picks || {});
      setLoading(false);
    }
    init();
  }, []);

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

  async function makePick(gameId, team) {
    setPicks((prev) => ({
      ...prev,
      [player]: {
        ...(prev[player] || {}),
        [gameId]: { team, at: new Date().toISOString() },
      },
    }));
    const res = await fetch("/api/picks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ week, player, gameId, team }),
    });
    if (res.ok) {
      const data = await res.json();
      setPicks(data.picks);
    }
  }

  if (loading) {
    return (
      <main className="board">
        <div className="board-panel">
          <p className="subtitle">Loading…</p>
        </div>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="board">
        <div className="board-panel admin-lock">
          <h1 className="title" style={{ fontSize: "1.8rem" }}>
            Who&apos;s Picking?
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

  const myPicks = picks[player] || {};

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title" style={{ fontSize: "2rem" }}>
          Make Your Picks — Week {week}
        </h1>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          Playing as {player} ·{" "}
          <a href="#" onClick={(e) => { e.preventDefault(); switchPlayer(); }}>
            not you?
          </a>
        </p>

        <div className="week-switcher">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
            
              key={w}
              href={`/picks?week=${w}`}
              className={`week-pill ${w === week ? "active" : ""}`}
            >
              {w}
            </a>
          ))}
        </div>

        {games.length === 0 && (
          <p className="spread-tbd">No games set up yet for Week {week}.</p>
        )}

        <div className="game-list">
          {games.map((g) => {
            const myPick = myPicks[g.id];
            return (
              <div className="pick-row" key={g.id}>
                <div className="game-when">
                  {g.day} · {g.time}
                </div>
                <div className="pick-buttons">
                  <button
                    className={`pick-btn ${myPick?.team === "AWAY" ? "picked" : ""}`}
                    onClick={() => makePick(g.id, "AWAY")}
                  >
                    {g.away}
                    {g.favorite === "AWAY" && g.spread != null ? ` -${g.spread}` : ""}
                  </button>
                  <button
                    className={`pick-btn ${myPick?.team === "HOME" ? "picked" : ""}`}
                    onClick={() => makePick(g.id, "HOME")}
                  >
                    {g.home}
                    {g.favorite === "HOME" && g.spread != null ? ` -${g.spread}` : ""}
                  </button>
                </div>
                {myPick && (
                  <div className="pick-time">Picked · {formatTime(myPick.at)}</div>
                )}
              </div>
            );
          })}
        </div>

        {games.length > 0 && (
          <>
            <h2 className="section-heading">Everyone&apos;s Picks</h2>
            <div className="all-picks">
              {roster.map((name) => {
                const theirPicks = picks[name] || {};
                const count = Object.keys(theirPicks).length;
                return (
                  <details className="player-picks" key={name}>
                    <summary>
                      {name} — {count} of {games.length} picked
                    </summary>
                    <ul>
                      {games.map((g) => {
                        const p = theirPicks[g.id];
                        if (!p) return null;
                        const teamName = p.team === "HOME" ? g.home : g.away;
                        return (
                          <li key={g.id}>
                            {g.away} @ {g.home}: <strong>{teamName}</strong>{" "}
                            <span className="pick-time">({formatTime(p.at)})</span>
                          </li>
                        );
                      })}
                      {count === 0 && <li className="spread-tbd">No picks yet</li>}
                    </ul>
                  </details>
                );
              })}
            </div>
          </>
        )}

        <p className="footer-link">
          <a href="/">Back to the pool</a>
        </p>
      </div>
    </main>
  );
}
