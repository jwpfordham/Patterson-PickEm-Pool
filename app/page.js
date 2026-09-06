import { getRoster, setRoster, getOrSyncSchedule, getSchedule, setSchedule, getCurrentWeek } from "@/lib/kv";
import { WEEK_1_SEED } from "@/lib/seed-week1";

async function loadData(week) {
  let roster = await getRoster();
  if (!roster) {
    roster = await setRoster([
      "Timber", "Dave", "Carolyn", "Bridget", "Emily", "Doug", "Clover", "Phil",
      "Mindy", "Dylan", "Will", "Cocoa", "Jamey", "Betty", "Joseph", "Maisie",
      "Grand-Pops", "Mom-Lady",
    ]);
  }
  const games = week === 1
    ? await getOrSyncSchedule(week, WEEK_1_SEED)
    : (await getSchedule(week)) || (await setSchedule(week, []));
  return { roster, games };
}

function spreadDisplay(game) {
  if (!game.favorite || game.spread == null) {
    return <span className="spread-tbd">Spread TBD</span>;
  }
  const favName = game.favorite === "HOME" ? game.home : game.away;
  return <span className="spread-pill">{favName} -{game.spread}</span>;
}

export default async function HomePage({ searchParams }) {
  const currentWeek = await getCurrentWeek();
  const week = Number(searchParams?.week) || currentWeek;
  const { roster, games } = await loadData(week);

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title">🏈 Family Pick&apos;em Pool</h1>
        <p className="subtitle">
          Week {week} · 2026 Season
          {week !== currentWeek && (
            <span style={{ color: "var(--chalk-dim)", fontSize: "0.75em" }}>
              {" "}(current week is {currentWeek})
            </span>
          )}
        </p>

        <div className="week-switcher">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
            <a key={w} href={`/?week=${w}`} className={`week-pill ${w === week ? "active" : ""}`}>{w}</a>
          ))}
        </div>

        <p style={{ textAlign: "center", marginBottom: 28 }}>
          <a href={`/picks?week=${week}`} className="pick-btn" style={{ display: "inline-block", fontWeight: 700, marginRight: 10 }}>
            Make Your Picks →
          </a>
          <a href={`/standings?week=${week}`} className="pick-btn" style={{ display: "inline-block", fontWeight: 700 }}>
            Standings →
          </a>
        </p>

        <h2 className="section-heading">This Week&apos;s Games</h2>
        {games.length === 0 && (
          <p className="spread-tbd">
            No games set up yet for Week {week} — check back once the commissioner adds them.
          </p>
        )}
        <div className="game-list">
          {games.map((g) => (
            <div className="game-row" key={g.id}>
              <div className="game-when">
                {g.day}
                <br />
                {g.time}
              </div>
              <div className="game-matchup">
                {g.away} <span style={{ opacity: 0.6 }}>at</span>{" "}
                <span className={g.favorite === "HOME" ? "fav" : ""}>{g.home}</span>
              </div>
              <div className="game-spread">{spreadDisplay(g)}</div>
            </div>
          ))}
        </div>

        <h2 className="section-heading">Who&apos;s Playing</h2>
        <ul className="roster-grid">
          {roster.map((name) => (
            <li className="roster-chip" key={name}>
              {name}
            </li>
          ))}
        </ul>

        <p className="footer-link">
          <a href="/admin">Commissioner login</a>
        </p>
      </div>
    </main>
  );
}
