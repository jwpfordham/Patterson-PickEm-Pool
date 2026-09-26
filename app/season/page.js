"use client";

import { useEffect, useState } from "react";
import { computeSeasonStandings, computeWeeklyPoolAccuracy } from "@/lib/scoring";

const PRAISE_TEMPLATES = [
  (who, s) => `${who} ${s.verb} WINNING, folks -- ${s.correct} correct out of ${s.made}, a ${s.pct}% clip. Nobody expected numbers like this, nobody. Tremendous. Believe me.`,
  (who, s) => `Big season for ${who} -- up by ${s.margin} over the person in last place, which is a lot, believe me, a lot. Something really special happening here.`,
  (who, s) => `${who}, ${s.correct} correct picks, folks. That's not luck. That's talent. Real talent, the best kind.`,
  (who, s) => `Everybody's talking about ${who} right now. ${s.pct}% accuracy. Incredible number. We've never seen anything like it, believe me.`,
  (who, s) => `${who} ${s.verb} out in front, way out in front, by ${s.margin} points. Total domination. I saw it coming, honestly, I called it.`,
  (who, s) => `Winning, winning, winning -- that's all ${who} ${s.verb2} been doing. ${s.correct} out of ${s.made}. Frankly, not even fair to everybody else.`,
  (who, s) => `A lot of people don't want to talk about ${who}'s numbers, but I will. ${s.correct} correct, ${s.pct}% right. Nobody's ever seen numbers like that.`,
  (who, s) => `${who} ${s.verb} up by ${s.margin}, and folks, that margin is going to grow. Mark my words. Tremendous. Absolutely tremendous.`,
  (who, s) => `${who}, ${s.correct} out of ${s.made} correct. Some people call it luck. I call it skill, real skill, the best skill.`,
  (who, s) => `Nobody saw this coming from ${who}, nobody. ${s.pct}% this season. That's not an accident, folks, that's greatness.`,
  (who, s) => `${who} ${s.verb} leading the whole pool, folks, by ${s.margin}. The best picker anybody's ever seen, maybe ever. We'll see if anybody can catch up. I doubt it.`,
  (who, s) => `Say what you want, but ${who} is putting up ${s.correct} correct picks. ${s.pct}%. That's a number people will remember.`,
  (who, s) => `${who}, folks, ${who} ${s.verb} crushing it. ${s.correct} out of ${s.made}. Nobody else is even close, not even close.`,
  (who, s) => `They said it couldn't be done, and ${who} ${s.verb} doing it anyway. ${s.pct}% accuracy. Tremendous stuff, really tremendous.`,
  (who, s) => `${who} ${s.verb} up by ${s.margin} points on everybody. Big number. A lot of people are very impressed, very impressed indeed.`,
  (who, s) => `${who}'s season, folks: ${s.correct} correct, ${s.pct}%. Some of the best picking anybody's ever seen in this pool, and I mean that.`,
  (who, s) => `Nobody's catching ${who} at this rate. ${s.margin} ahead, ${s.pct}% on the season. Total, complete dominance. Believe me, folks, believe me.`,
];

const DENIGRATE_TEMPLATES = [
  (who, s) => `${who} ${s.verb} having a very tough season, not gonna lie. ${s.correct} correct out of ${s.made}, only ${s.pct}%. Sad! Total disaster.`,
  (who, s) => `Rough season for ${who} -- now ${s.margin} points behind the leader. Not good. Not good at all. But everybody loves a comeback story.`,
  (who, s) => `Nobody's talking about ${who} this season, and there's a reason for that, folks. ${s.pct}% just isn't gonna cut it. Sad!`,
  (who, s) => `${who}, ${s.correct} correct picks. We've seen better, much better. A lot of people are disappointed, a lot of people.`,
  (who, s) => `Last place is a tough place to be, and ${who} ${s.verb} finding that out right now. Down by ${s.margin}. Very sad situation.`,
  (who, s) => `${who} really ${s.verb2} struggled this season. ${s.pct}% accuracy, folks, that's rough. But they'll bounce back. Or they won't. We'll see.`,
  (who, s) => `Some people are saying ${who} should just give up. I'm not saying that. I'm just saying ${s.correct} out of ${s.made} is not what winners do.`,
  (who, s) => `${s.margin} points behind now for ${who}. That gap, folks, that gap is a disaster. A total, complete disaster.`,
  (who, s) => `${who} had every chance, everybody had a chance, and look what happened. ${s.pct}%. Not good, folks. Not good.`,
  (who, s) => `It's been a rough one for ${who}, folks. ${s.correct} correct all season. Some people just have a tough go of it, sad but true.`,
  (who, s) => `${who} ${s.verb} in last place, ${s.margin} back. That's a big number to make up, folks, a very big number. We'll see what happens.`,
  (who, s) => `Not a great season for ${who}. ${s.pct}% is not a number anybody's proud of, believe me. Nobody's proud of that number.`,
  (who, s) => `${who}, ${s.correct} out of ${s.made}. Look, everybody has bad seasons. This one's been really bad though, really bad.`,
  (who, s) => `The numbers don't lie, folks, and the numbers for ${who} are not good. ${s.pct}%. Sad situation, very sad.`,
  (who, s) => `${who} ${s.verb} bringing up the rear this season, ${s.margin} behind. Not where anybody wants to be, not even close.`,
  (who, s) => `A lot of empty seats at ${who}'s table this season, folks, if you know what I mean. ${s.correct} correct. Rough stuff.`,
  (who, s) => `${who}'s season: ${s.correct} correct, ${s.pct}%. We've all had rough seasons. This is one of them. A rough one.`,
];

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

  const leaderMade = leaders.reduce((sum, s) => sum + s.made, 0) / (leaders.length || 1);
  const loserMade = losers.reduce((sum, s) => sum + s.made, 0) / (losers.length || 1);
  const margin = topScore - bottomScore;

  const who = (names) => names.join(" and ");
  const leadStats = {
    correct: topScore,
    made: Math.round(leaderMade),
    pct: leaderMade > 0 ? Math.round((topScore / leaderMade) * 100) : 0,
    margin,
    verb: leaders.length > 1 ? "are" : "is",
    verb2: leaders.length > 1 ? "have" : "has",
  };
  const loseStats = {
    correct: bottomScore,
    made: Math.round(loserMade),
    pct: loserMade > 0 ? Math.round((bottomScore / loserMade) * 100) : 0,
    margin,
    verb: losers.length > 1 ? "are" : "is",
    verb2: losers.length > 1 ? "have" : "has",
  };

  const weekIdx = (currentWeek - 1) % PRAISE_TEMPLATES.length;
  const praiseText = PRAISE_TEMPLATES[weekIdx](who(leaders.map((l) => l.name)), leadStats);
  const denigrateText = DENIGRATE_TEMPLATES[weekIdx % DENIGRATE_TEMPLATES.length](who(losers.map((l) => l.name)), loseStats);

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
                {leaders.map((l) => `${l.name} (${l.correct}/${l.made})`).join(", ")}
              </div>
              <div style={{ fontSize: "0.9rem", fontStyle: "italic" }}>{praiseText}</div>
            </div>
            {hasSpread && (
              <div className="highlight-card">
                <div className="highlight-label">😬 Rough Season So Far</div>
                <div className="highlight-value" style={{ marginBottom: 6 }}>
                  {losers.map((l) => `${l.name} (${l.correct}/${l.made})`).join(", ")}
                </div>
                <div style={{ fontSize: "0.9rem", fontStyle: "italic" }}>{denigrateText}</div>
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
            <h2 className="section-heading">How Predictable Was Each Week?</h2>
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
