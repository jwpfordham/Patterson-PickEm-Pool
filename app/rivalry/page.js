"use client";

import { useEffect, useState } from "react";
import { computeFamilyStandings } from "@/lib/scoring";
import { FAMILIES } from "@/lib/families";

export default function RivalryPage() {
  const [loading, setLoading] = useState(true);
  const [weeksData, setWeeksData] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    async function init() {
      const cwRes = await fetch("/api/current-week").then((r) => r.json());
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
          <p className="subtitle">Settling the rivalry…</p>
        </div>
      </main>
    );
  }

  const families = computeFamilyStandings(weeksData, FAMILIES);
  const maxCorrect = Math.max(1, ...families.map((f) => f.correct));

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title" style={{ fontSize: "2rem" }}>
          Family Rivalry
        </h1>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          Through Week {currentWeek}
        </p>

        <h2 className="section-heading">Family Standings</h2>
        <div className="vbar-chart" style={{ height: 150 }}>
          {families.map((f, i) => (
            <div className="vbar-group" key={f.name}>
              <div className="vbar-track" style={{ height: 110 }}>
                <div
                  className="vbar"
                  style={{
                    height: `${(f.correct / maxCorrect) * 100}%`,
                    background: i === 0 ? "#e8c34d" : "#c9c6b8",
                    width: 36,
                  }}
                />
              </div>
              <div className="vbar-label">
                {f.name}
                <br />
                {f.correct}/{f.made}
              </div>
            </div>
          ))}
        </div>

        {families.map((f) => (
          <div key={f.name} style={{ marginTop: 28 }}>
            <h2 className="section-heading">{f.name}</h2>
            <div className="game-list">
              {f.members.map((m, i) => (
                <div className="standing-row" key={m.name}>
                  <div className="standing-rank">{i + 1}</div>
                  <div className="standing-main">
                    <div className="standing-name">{m.name}</div>
                    <div className="standing-bar-track">
                      <div
                        className="standing-bar-fill"
                        style={{ width: f.correct > 0 ? `${(m.correct / (f.members[0].correct || 1)) * 100}%` : "0%" }}
                      />
                    </div>
                  </div>
                  <div className="standing-score">{m.correct}/{m.made}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="footer-link" style={{ marginTop: 28 }}><a href="/">Back to the pool</a></p>
      </div>
    </main>
  );
}
