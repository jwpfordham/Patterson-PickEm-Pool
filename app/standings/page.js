"use client";

import { useEffect, useState } from "react";
import { getCoverWinner, computeStandings, computeHighlights } from "@/lib/scoring";

export default function StandingsPage({ searchParams }) {
  const [week, setWeek] = useState(Number(searchParams?.week) || null);
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState([]);
  const [games, setGames] = useState([]);
  const [picks, setPicks] = useState({});

  useEffect(() => {
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
  const highlights = computeHighlights(games, picks, roster);

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title" style={{ fontSize: "2rem" }}>
          Week {week} Standings
        </h1>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          {gradedCount} of {totalGames} games graded so far
        </p>

        <div className="week-switcher">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
            
              key={w}
              href={`/standings?week=${w}`}
              className={`week-pill ${w === week ? "active" : ""}`}
            >
              {w}
            </a>
          ))}
        </div>

        <div className="game-list">
          {standings.map((row, i) => (
            <div className="standing-row" key={row.name}>
              <div className="standing-rank">{i + 1}</div>
              <div className="standing-main">
                <div className="standing-name">{row.name}</div>
                <div className="standing-bar-track">
                  <div
                    className="standing-bar-fill"
                    style={{ width: gradedCount > 0 ? `${(row.correct / gradedCount) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              <div className="standing-score">
                {row.correct} / {gradedCount}
              </div>
            </div>
          ))}
        </div>

        {gradedCount > 0 && (
          <>
            <h2 className="section-heading">Weekly Highlights</h2>
            <div className="highlights-grid">
              {highlights.topPickers.length > 0 && (
                <div className="highlight-card">
                  <div className="highlight-label">🔥 Top of the Week</div>
                  <div className="highlight-value">{highlights.topPickers.join(", ")}</div>
                </div>
              )}
              {highlights.bottomPickers.length > 0 && (
                <div className="highlight-card">
                  <div className="highlight-label">🪵 Wooden Spoon</div>
                  <div className="highlight-value">{highlights.bottomPickers.join(", ")}</div>
                </div>
              )}
              {highlights.biggestUpset && (
                <div className="highlight-card">
                  <div className="highlight-label">😱 Biggest Upset</div>
                  <div className="highlight-value">
                    {highlights.biggestUpset.game.away} @ {highlights.biggestUpset.game.home}
                  </div>
                </div>
              )}
              {highlights.mostAgreed && (
                <div className="highlight-card">
                  <div className="highlight-label">🤝 Most Agreed-On Pick</div>
                  <div className="highlight-value">
                    {highlights.mostAgreed.team === "HOME"
                      ? highlights.mostAgreed.game.home
                      : highlights.mostAgreed.game.away}{" "}
                    ({highlights.mostAgreed.count}/{highlights.mostAgreed.total})
                  </div>
                </div>
              )}
              <div className="highlight-card">
                <div className="highlight-label">⚖️ Chalk vs. Chaos</div>
                <div className="highlight-value">
                  {highlights.chalkCount} favorites covered, {highlights.upsetCount} upsets
                </div>
              </div>
            </div>

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
