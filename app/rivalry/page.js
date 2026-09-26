"use client";

import { useEffect, useState } from "react";
import { computeFamilyStandings } from "@/lib/scoring";
import { FAMILIES } from "@/lib/families";

const MEMBER_COLORS = ["#e8c34d", "#d9776a", "#7fb8a3", "#6f9bd1", "#b39ddb", "#f2efe3"];

function trumpFamilyPraise(name) {
  return `The ${name} family is WINNING, folks -- really winning, big league. Nobody expected numbers like this, nobody. Tremendous family, tremendous picks. Many people are saying it's the best family performance they've ever seen. Believe me.`;
}

function trumpFamilyDenigrate(name) {
  return `The ${name} family is having a rough one, not gonna lie. Sad! Total disaster over there, some of the worst picks anybody has ever seen from a family, and I've seen a lot of families. But hey, comebacks happen. We'll see. We'll see what happens.`;
}

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
  const leadingFamily = families[0];
  const trailingFamily = families[families.length - 1];
  const hasSpread = families.length > 1 && leadingFamily.correct !== trailingFamily.correct;

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title" style={{ fontSize: "2rem" }}>
          Family Rivalry
        </h1>
        <p className="subtitle" style={{ fontSize: "0.95rem" }}>
          Through Week {currentWeek} · season total
        </p>

        <h2 className="section-heading">Family Standings</h2>
        <div className="vbar-chart" style={{ height: 175 }}>
          {families.map((f) => {
            const pct = f.made > 0 ? Math.round((f.correct / f.made) * 100) : 0;
            return (
              <div className="vbar-group" key={f.name}>
                <div className="vbar-track" style={{ height: 120 }}>
                  <div
                    style={{
                      width: 40,
                      height: `${(f.correct / maxCorrect) * 100}%`,
                      display: "flex",
                      flexDirection: "column-reverse",
                      borderRadius: "3px 3px 0 0",
                      overflow: "hidden",
                    }}
                  >
                    {f.members.map((m, mi) => (
                      m.correct > 0 && (
                        <div
                          key={m.name}
                          style={{
                            height: `${(m.correct / f.correct) * 100}%`,
                            background: MEMBER_COLORS[mi % MEMBER_COLORS.length],
                          }}
                        />
                      )
                    ))}
                  </div>
                </div>
                <div className="vbar-label">
                  {f.name}
                  <br />
                  {f.correct}/{f.made} ({pct}%)
                </div>
              </div>
            );
          })}
        </div>

        <div className="highlight-card" style={{ marginTop: 4, marginBottom: 24 }}>
          <div className="highlight-label">🎤 Word on the Street</div>
          <div style={{ fontSize: "0.9rem", fontStyle: "italic", marginBottom: hasSpread ? 10 : 0 }}>
            {trumpFamilyPraise(leadingFamily.name)}
          </div>
          {hasSpread && (
            <div style={{ fontSize: "0.9rem", fontStyle: "italic" }}>
              {trumpFamilyDenigrate(trailingFamily.name)}
            </div>
          )}
        </div>

        {families.map((f) => {
          const topScore = f.members[0]?.correct ?? 0;
          const bottomScore = f.members[f.members.length - 1]?.correct ?? 0;
          const champs = f.members.filter((m) => m.correct === topScore);
          const chumps = f.members.filter((m) => m.correct === bottomScore);
          const showChump = bottomScore !== topScore;
          return (
            <div key={f.name} style={{ marginTop: 24 }}>
              <h2 className="section-heading">{f.name}</h2>
              <div className="highlights-grid">
                <div className="highlight-card">
                  <div className="highlight-label">🏆 Champ</div>
                  <div className="highlight-value">
                    {champs.map((c) => `${c.name} (${c.correct}/${c.made})`).join(", ")}
                  </div>
                </div>
                {showChump && (
                  <div className="highlight-card">
                    <div className="highlight-label">🥄 Chump</div>
                    <div className="highlight-value">
                      {chumps.map((c) => `${c.name} (${c.correct}/${c.made})`).join(", ")}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <p className="footer-link" style={{ marginTop: 28 }}><a href="/">Back to the pool</a></p>
      </div>
    </main>
  );
}
