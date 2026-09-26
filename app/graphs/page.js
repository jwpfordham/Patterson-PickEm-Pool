"use client";

import { useEffect, useState } from "react";
import {
  computeSeasonRace,
  computeExpectedVsUpsetByWeek,
  computeTeamPopularity,
  computeFavoriteUnderdogAccuracy,
} from "@/lib/scoring";

const PLAYER_COLORS = ["#e8c34d", "#d9776a", "#f2efe3", "#7fb8a3", "#6f9bd1", "#b39ddb"];

export default function GraphsPage() {
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
          <p className="subtitle">Crunching the whole season…</p>
        </div>
      </main>
    );
  }

  const { perWeek, topPlayers } = computeSeasonRace(weeksData, roster);
  const expectedVsUpset = computeExpectedVsUpsetByWeek(weeksData);
  const teamPopularity = computeTeamPopularity(weeksData).slice(0, 8);
  const favVsDog = computeFavoriteUnderdogAccuracy(weeksData);

  const maxRace = Math.max(1, ...perWeek.map((w) => Math.max(...topPlayers.map((p) => w.totals[p] || 0))));
  const maxTeamCount = Math.max(1, ...teamPopularity.map((t) => t.count));

  const chartWidth = Math.max(300, perWeek.length * 40);
  const chartHeight = 140;
  const toX = (i) => (perWeek.length <= 1 ? chartWidth / 2 : (i / (perWeek.length - 1)) * chartWidth);
  const toY = (val) => chartHeight - (val / maxRace) * (chartHeight - 10) - 5;

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title" style={{ fontSize: "2rem" }}>
          Season Graphs
        </h1>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          Through Week {currentWeek}
        </p>

        <h2 className="section-heading">Season Race</h2>
        {perWeek.length > 0 ? (
          <>
            <div style={{ overflowX: "auto" }}>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width={chartWidth} height={chartHeight} style={{ display: "block" }}>
                {topPlayers.map((name, pi) => {
                  const points = perWeek.map((w, i) => `${toX(i)},${toY(w.totals[name] || 0)}`).join(" ");
                  return (
                    <polyline key={name} points={points} fill="none" stroke={PLAYER_COLORS[pi % PLAYER_COLORS.length]} strokeWidth="2" />
                  );
                })}
              </svg>
            </div>
            <div className="chart-legend">
              {topPlayers.map((name, pi) => (
                <span key={name}>
                  <span className="chart-legend-swatch" style={{ background: PLAYER_COLORS[pi % PLAYER_COLORS.length] }} />
                  {name}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="spread-tbd">Not enough graded games yet.</p>
        )}

        <h2 className="section-heading">Expected vs. Upset by Week</h2>
        {expectedVsUpset.length > 0 ? (
          <>
            <div className="vbar-chart">
              {expectedVsUpset.map((w) => (
                <div className="vbar-group" key={w.week}>
                  <div className="vbar-track">
                    <div className="vbar" style={{ height: `${(w.expected / w.total) * 100}%`, background: "#e8c34d" }} />
                    <div className="vbar" style={{ height: `${(w.upset / w.total) * 100}%`, background: "#d9776a" }} />
                  </div>
                  <div className="vbar-label">Wk {w.week}</div>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span><span className="chart-legend-swatch" style={{ background: "#e8c34d" }} />Expected</span>
              <span><span className="chart-legend-swatch" style={{ background: "#d9776a" }} />Upset</span>
            </div>
          </>
        ) : (
          <p className="spread-tbd">No graded games yet.</p>
        )}

        <h2 className="section-heading">Most Picked Teams</h2>
        {teamPopularity.length > 0 ? (
          <div className="vbar-chart">
            {teamPopularity.map((t) => (
              <div className="vbar-group" key={t.team}>
                <div className="vbar-track">
                  <div className="vbar" style={{ height: `${(t.count / maxTeamCount) * 100}%`, background: "#e8c34d", width: 22 }} />
                </div>
                <div className="vbar-label">{t.team.split(" ").pop()}<br />{t.count}/{t.opportunities}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="spread-tbd">No picks yet.</p>
        )}

        <h2 className="section-heading">Favorites vs. Underdogs Accuracy</h2>
        {(favVsDog.favorite.made > 0 || favVsDog.underdog.made > 0) ? (
          <>
            <div className="vbar-chart" style={{ height: 130 }}>
              <div className="vbar-group">
                <div className="vbar-track" style={{ height: 90 }}>
                  <div className="vbar" style={{ height: `${favVsDog.favorite.pct}%`, background: "#e8c34d", width: 32 }} />
                </div>
                <div className="vbar-label">Favorites<br />{favVsDog.favorite.pct}%</div>
              </div>
              <div className="vbar-group">
                <div className="vbar-track" style={{ height: 90 }}>
                  <div className="vbar" style={{ height: `${favVsDog.underdog.pct}%`, background: "#d9776a", width: 32 }} />
                </div>
                <div className="vbar-label">Underdogs<br />{favVsDog.underdog.pct}%</div>
              </div>
            </div>
            <p className="chart-caption">
              {favVsDog.favorite.made} favorite picks · {favVsDog.underdog.made} underdog picks
            </p>
          </>
        ) : (
          <p className="spread-tbd">No graded games yet.</p>
        )}

        <p className="footer-link" style={{ marginTop: 28 }}><a href="/">Back to the pool</a></p>
      </div>
    </main>
  );
}
