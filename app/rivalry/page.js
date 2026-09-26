"use client";

import { useEffect, useState } from "react";
import { computeFamilyStandings } from "@/lib/scoring";
import { FAMILIES } from "@/lib/families";

const MEMBER_COLORS = ["#e8c34d", "#d9776a", "#7fb8a3", "#6f9bd1", "#b39ddb", "#f2efe3"];

const PRAISE_TEMPLATES = [
  (name, s) => `The ${name} family is WINNING, folks -- ${s.correct} correct out of ${s.made}, a ${s.pct}% clip. Nobody expected numbers like this, nobody. Tremendous, absolutely tremendous. Believe me.`,
  (name, s) => `Big week for the ${name} family -- leading by ${s.margin} over the next family, which is a lot, believe me, a lot. Something really special happening there.`,
  (name, s) => `The ${name} family, ${s.correct} correct picks, folks. That's not luck. That's talent. A family that knows how to win, and they're winning bigly.`,
  (name, s) => `Everybody's talking about the ${name} family right now. ${s.pct}% accuracy. Incredible number. We've never seen anything like it, believe me.`,
  (name, s) => `The ${name} family is out in front, way out in front, by ${s.margin} points. Total domination. Nobody saw this coming except me, I saw it coming.`,
  (name, s) => `Winning, winning, winning -- that's all the ${name} family knows how to do. ${s.correct} out of ${s.made}. Frankly, not even fair to the other families, but that's football, folks.`,
  (name, s) => `A lot of people don't want to talk about the ${name} family's numbers, but I will. ${s.correct} correct, ${s.pct}% right. Look at those numbers. Nobody's ever seen numbers like that, nobody.`,
  (name, s) => `The ${name} family is up by ${s.margin}, and folks, that margin is going to grow. It's going to grow a lot. Mark my words. Tremendous family. Tremendous.`,
  (name, s) => `${name} family, ${s.correct} out of ${s.made} correct. Some people call it luck. I call it skill, real skill, the best skill. This family is playing a different game than everybody else, folks.`,
];

const DENIGRATE_TEMPLATES = [
  (name, s) => `The ${name} family is having a very tough season, not gonna lie. ${s.correct} correct out of ${s.made}, only ${s.pct}%. Sad! Total disaster, folks.`,
  (name, s) => `Rough week again for the ${name} family -- now ${s.margin} points behind the leader. Not good. Not good at all. But everybody loves a comeback story.`,
  (name, s) => `Nobody's talking about the ${name} family this week, and there's a reason for that, folks. ${s.pct}% just isn't gonna cut it. Sad!`,
  (name, s) => `The ${name} family, ${s.correct} correct picks. We've seen better, much better. A lot of people are disappointed, a lot of people.`,
  (name, s) => `Last place is a tough place to be, and the ${name} family knows all about that right now. Down by ${s.margin}. Very sad situation over there.`,
  (name, s) => `The ${name} family really struggled this week. ${s.pct}% accuracy, folks, that's rough. But they'll bounce back. Or they won't. We'll see what happens.`,
  (name, s) => `Some people are saying the ${name} family should just give up. I'm not saying that. I'm just saying ${s.correct} out of ${s.made} is not what winners do, folks. Not even close.`,
  (name, s) => `${s.margin} points behind now for the ${name} family. That gap, folks, that gap is a disaster. A total, complete disaster. Sad to see, really sad.`,
  (name, s) => `The ${name} family had a chance, everybody had a chance, and look what happened. ${s.pct}%. Not good, folks. Not good. But hey, there's always next week. Maybe.`,
];

const MIDDLE_TEMPLATES = [
  (name, s) => `And then there's the ${name} family, right there in the middle, folks. ${s.correct} out of ${s.made}. Not winning, not losing. Just... there. We'll see what happens.`,
  (name, s) => `The ${name} family, ${s.pct}% accuracy. Not bad, not tremendous. Middle of the pack. A lot of people are fine with middle of the pack. I don't know if I would be.`,
  (name, s) => `Nobody's talking about the ${name} family, folks, because there's nothing to talk about. ${s.correct} correct. Solid. Steady. Boring, honestly. But steady.`,
  (name, s) => `${s.gapBehindLeader} behind the leader, ${s.gapAheadOfLast} ahead of last place -- that's the ${name} family right now. Right in the middle. Very safe position. Very safe.`,
  (name, s) => `The ${name} family is just kind of sitting there, folks, ${s.correct} out of ${s.made}. Not making headlines. Some would call that smart. I call it missing an opportunity, but that's just me.`,
  (name, s) => `Middle of the pack for the ${name} family this week, ${s.pct}%. Could be worse, folks, could be a lot worse. Could also be a lot better. We'll see which way it goes.`,
  (name, s) => `The ${name} family, playing it safe right in the middle. ${s.correct} correct picks. Not the story of the week, but not the disaster either. Fine, I guess. Fine.`,
  (name, s) => `Right in between everybody else, that's the ${name} family. ${s.pct}% accuracy. Some people like being in the middle. Doesn't sound like winning to me, folks, but okay.`,
  (name, s) => `The ${name} family continues to just exist in the middle, ${s.correct} out of ${s.made}. Not a headline. Not a disaster. Just... there. We'll keep an eye on it.`,
];

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
            fetch(`/api/schedule?week=${week}&readonly=1`).then((r) => r.json()),
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
  const middleFamily = families.length > 2 ? families[Math.floor(families.length / 2)] : null;
  const hasSpread = families.length > 1 && leadingFamily.correct !== trailingFamily.correct;
  const margin = leadingFamily.correct - trailingFamily.correct;

  const leadStats = {
    correct: leadingFamily.correct,
    made: leadingFamily.made,
    pct: leadingFamily.made > 0 ? Math.round((leadingFamily.correct / leadingFamily.made) * 100) : 0,
    margin,
  };
  const trailStats = {
    correct: trailingFamily.correct,
    made: trailingFamily.made,
    pct: trailingFamily.made > 0 ? Math.round((trailingFamily.correct / trailingFamily.made) * 100) : 0,
    margin,
  };
  const middleStats = middleFamily
    ? {
        correct: middleFamily.correct,
        made: middleFamily.made,
        pct: middleFamily.made > 0 ? Math.round((middleFamily.correct / middleFamily.made) * 100) : 0,
        gapBehindLeader: leadingFamily.correct - middleFamily.correct,
        gapAheadOfLast: middleFamily.correct - trailingFamily.correct,
      }
    : null;
  const praiseText = PRAISE_TEMPLATES[currentWeek % PRAISE_TEMPLATES.length](leadingFamily.name, leadStats);
  const denigrateText = DENIGRATE_TEMPLATES[currentWeek % DENIGRATE_TEMPLATES.length](trailingFamily.name, trailStats);
  const middleText = middleFamily
    ? MIDDLE_TEMPLATES[currentWeek % MIDDLE_TEMPLATES.length](middleFamily.name, middleStats)
    : null;

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
        <div className="vbar-chart" style={{ height: 155 }}>
          {families.map((f) => {
            const pct = f.made > 0 ? Math.round((f.correct / f.made) * 100) : 0;
            return (
              <div className="vbar-group" key={f.name}>
                <div className="vbar-track" style={{ height: 120 }}>
                  <div
                    style={{
                      width: 40,
                      height: `${(f.correct / maxCorrect) * 100}%`,
                      position: "relative",
                      borderRadius: "3px 3px 0 0",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column-reverse", height: "100%" }}>
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
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                        backgroundImage:
                          "repeating-linear-gradient(to top, rgba(23,37,31,0.5) 0, rgba(23,37,31,0.5) 1px, transparent 1px, transparent 10%)",
                      }}
                    />
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

        {families.map((f) => (
          <div key={`legend-${f.name}`} style={{ marginBottom: 10 }}>
            <div className="chart-legend" style={{ margin: "4px 0" }}>
              <strong style={{ color: "var(--chalk)" }}>{f.name}:</strong>
              {f.members.map((m, mi) => (
                <span key={m.name}>
                  <span className="chart-legend-swatch" style={{ background: MEMBER_COLORS[mi % MEMBER_COLORS.length] }} />
                  {m.name}
                </span>
              ))}
            </div>
          </div>
        ))}

        <div className="highlight-card" style={{ marginTop: 14, marginBottom: 24 }}>
          <div className="highlight-label">🎤 Word on the Street</div>
          <div style={{ fontSize: "0.9rem", fontStyle: "italic", marginBottom: (middleText || hasSpread) ? 10 : 0 }}>
            {praiseText}
          </div>
          {middleText && (
            <div style={{ fontSize: "0.9rem", fontStyle: "italic", marginBottom: hasSpread ? 10 : 0 }}>
              {middleText}
            </div>
          )}
          {hasSpread && (
            <div style={{ fontSize: "0.9rem", fontStyle: "italic" }}>
              {denigrateText}
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
