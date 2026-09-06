"use client";

import { useEffect, useState } from "react";
import { getCoverWinner, computeStandings } from "@/lib/scoring";

const WEEK = 1;

export default function StandingsPage() {
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState([]);
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState({});

  useEffect(() => {
    Promise.all([
      fetch("/api/roster").then((r) => r.json()),
      fetch(`/api/schedule?week=${WEEK}`).then((r) => r.json()),
      fetch(`/api/picks?week=${WEEK}`).then((r) => r.json()),
    ]).then(([rosterRes, scheduleRes, picksRes]) => {
      setRoster(rosterRes.roster || []);
      setGames(scheduleRes.games || []);
      setPicks(picksRes.picks || {});
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <main className="board">
        <div className="board-panel">
          <p className="subtitle">Loading…</p>
        </div>
      </main>
    );
  }

  const { standings, gradedCount, totalGames } = computeStandings(games, picks, roster);

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title" style={{ fontSize: "2rem" }}>
          Week {WEEK} Standings
        </h1>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          {gradedCount} of {totalGames} games graded so far
        </p>

        <div className="game-list">
          {standings.map((row, i) => (
            <div className="standing-row" key={row.name}>
              <div className="standing-rank">{i + 1}</div>
              <div className="standing-name">{row.name}</div>
              <div className="standing-score">
                {row.correct} / {gradedCount}
              </div>
            </div>
          ))}
        </div>

        {gradedCount > 0 && (
          <>
            <h2 className="section-heading">Graded Games</h2>
            <div className="game-list">
              {games.filter((g) => getCoverWinner(g)).map((g) => {
                const winner = getCoverWinner(g);
                const winnerName = winner === "HOME" ? g.home : g.away;
                return (
                  <div className="game-row" key={g.id}>
                    <div className="game-when">
                      {g.awayScore}–{g.homeScore}
                    </div>
                    <div className="game-matchup">
                      {g.away} at {g.home}
                    </div>
                    <div className="game-spread">
                      <span className="spread-pill">{winnerName} covered</span>
                    </div>
                  </div>
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
