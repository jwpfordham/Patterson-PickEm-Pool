"use client";

import { useEffect, useState } from "react";
import { computeSeasonStandings, computeWeeklyPoolAccuracy } from "@/lib/scoring";

function trumpPraise(names) {
  const who = names.length > 1 ? names.join(" and ") : names[0];
  const verb = names.length > 1 ? "are" : "is";
  return `${who} ${verb} WINNING, folks -- and I mean really winning, the kind of winning people haven't seen before. Tremendous picks. The best picks. Many people are saying it's the greatest pick'em season anyone can remember, maybe ever. Believe me.`;
}

function trumpDenigrate(names) {
  const who = names.length > 1 ? names.join(" and ") : names[0];
  const verb = names.length > 1 ? "are" : "is";
  return `${who} ${verb} having a very tough season, not gonna lie. Sad! Total disaster, some of the worst picks I've ever seen, and I've seen a lot of picks. But look -- everybody loves a comeback story. We'll see what happens. We'll see.`;
}

export default function SeasonPage() {
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState([]);
  const [weeksData, setWeeksData] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    async function init() {
      const [rosterRes, cwRes] = await Promise.all([
        fetch("/api/roster").then((r) => r.json()),
        fetch("/api/current-week").then((r) => r.json()),
      ]);
      setRoster(rosterRes.roster || []);
      setCurrentWeek(cwRes.week);

      const weekNums = Array.from({ length: cwRes.week }, (_, i) => i + 1);
      const results = await Promise.all(
        weekNums.map(async (week) => {
          const [scheduleRes, picksRes] = await Promise.all([
            fetch(`/api/schedule?week=${week}`).then((r) => r.json()),
            fetch(`/api/picks?week=${week}`).then((r) => r.json()),
          ]);
          return { week, games: scheduleRes.games || [], picks: picksRes.picks || {} };
        })
      );
      setWeeksData(results);
      setLoading(false);
    }
    init();
  }, []);

  if (loading) {
    return (
      <main className="board">
        <div className="board-panel">
          <p className="subtitle">Loading the whole season, hang tight…</p>
        </div>
      </main>
    );
  }

  const { standings, totalGraded } = computeSeasonStandings(weeksData, roster);
  const weeklyAccuracy = computeWeeklyPoolAccuracy(weeksData, roster);

  const topScore = standings[0]?.correct ?? 0;
  const bottomScore = standings[standings.length - 1]?.correct ?? 0;
  const leaders = standings.filter((s) => s.correct === topScore);
  const losers = standings.filter((s) => s.correct === bottomScore);
  const hasSpread = totalGraded > 0 && topScore !== bottomScore;

  const fmt = (row) => `${row.name} (${row.correct}/${row.made})`;

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title" style={{ fontSize: "2rem" }}>
          Season Standings
        </h1>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          Through Week {currentWeek} · {totalGraded} games graded so far
        </p>

        {totalGraded > 0 && (
          <div className="highlights-grid" style={{ marginBottom: 28 }}>
            <div className="highlight-card">
              <div className="highlight-label">🏆 The Leader</div>
              <div className="highlight-value" style={{ marginBottom: 6 }}>
                {leaders.map(fmt).join(", ")}
              </div>
              <div style={{ fontSize: "0.9rem", fontStyle: "italic" }}>
                {trumpPraise(leaders.map((s) => s.name))}
              </div>
            </div>
            {hasSpread && (
              <div className="highlight-card">
                <div className="highlight-label">😬 Rough Season So Far</div>
                <div className="highlight-value" style={{ marginBottom: 6 }}>
                  {losers.map(fmt).join(", ")}
                </div>
                <div style={{ fontSize: "0.9rem", fontStyle: "italic" }}>
                  {trumpDenigrate(losers.map((s) => s.name))}
                </div>
              </div>
            )}
          </div>
        )}

        <h2 className="section-heading">Full Leaderboard</h2>
        <div className="game-list">
          {standings.map((row, i) => (
            <div className="standing-row" key={row.name}>
              <div className="standing-rank">{i + 1}</div>
              <div className="standing-main">
                <div className="standing-name">{row.name}</div>
                <div className="standing-bar-track">
                  <div
                    className="standing-bar-fill"
                    style={{ width: topScore > 0 ? `${(row.correct / topScore) * 100}%` : "0%" }}
                  />
                </div>
              </div>
              <div className="standing-score">{row.correct}/{row.made}</div>
            </div>
          ))}
        </div>

        {weeklyAccuracy.some((w) => w.pct != null) && (
          <>
            <h2 className="section-heading">How Chalky Was Each Week?</h2>
            <p className="subtitle" style={{ fontSize: "0.9rem", marginBottom: 16 }}>
              Percent of all picks made that week that turned out correct
            </p>
            <div className="game-list">
              {weeklyAccuracy.filter((w) => w.pct != null).map((w) => (
                <div className="standing-row" key={w.week} style={{ gridTemplateColumns: "60px 1fr auto" }}>
                  <div className="standing-rank" style={{ fontSize: "0.95rem" }}>Wk {w.week}</div>
                  <div className="standing-main">
                    <div className="standing-bar-track">
                      <div className="standing-bar-fill" style={{ width: `${w.pct}%` }} />
                    </div>
                  </div>
                  <div className="standing-score">{w.pct}%</div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="footer-link"><a href="/">Back to the pool</a></p>
      </div>
    </main>
  );
}
