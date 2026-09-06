import { getRoster, setRoster, getOrSyncSchedule } from "@/lib/kv";
import { WEEK_1_SEED } from "@/lib/seed-week1";

const WEEK = 1;

async function loadData() {
  let roster = await getRoster();
  if (!roster) {
    roster = await setRoster([
      "Timber", "Dave", "Carolyn", "Bridget", "Emily", "Doug", "Clover", "Phil",
      "Mindy", "Dylan", "Will", "Cocoa", "Jamey", "Betty", "Joseph", "Maisie",
      "Grand-Pops", "Mom-Lady",
    ]);
  }
  const games = await getOrSyncSchedule(WEEK, WEEK_1_SEED);
  return { roster, games };
}

function spreadDisplay(game) {
  if (!game.favorite || game.spread == null) {
    return <span className="spread-tbd">Spread TBD</span>;
  }
  const favName = game.favorite === "HOME" ? game.home : game.away;
  return <span className="spread-pill">{favName} -{game.spread}</span>;
}

export default async function HomePage() {
  const { roster, games } = await loadData();

  return (
    <main className="board">
      <div className="board-panel">
        <h1 className="title">🏈 Family Pick&apos;em Pool</h1>
        <p className="subtitle">Week {WEEK} · 2026 Season</p>

        <h2 className="section-heading">This Week&apos;s Games</h2>
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
