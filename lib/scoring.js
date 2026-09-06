export function getCoverWinner(game) {
  if (!game || !game.final || !game.favorite || game.spread == null) return null;
  if (typeof game.homeScore !== "number" || typeof game.awayScore !== "number") return null;

  const margin = game.favorite === "HOME"
    ? game.homeScore - game.awayScore
    : game.awayScore - game.homeScore;

  const favoriteCovered = margin > game.spread;
  if (favoriteCovered) return game.favorite;
  return game.favorite === "HOME" ? "AWAY" : "HOME";
}

export function computeStandings(games, picks, roster) {
  const graded = games.filter((g) => getCoverWinner(g) !== null);

  const standings = roster.map((name) => {
    let correct = 0;
    graded.forEach((g) => {
      const pick = picks[name]?.[g.id];
      if (pick && pick.team === getCoverWinner(g)) correct += 1;
    });
    return { name, correct };
  });

  standings.sort((a, b) => b.correct - a.correct);

  return { standings, gradedCount: graded.length, totalGames: games.length };
}

export function computeHighlights(games, picks, roster) {
  const graded = games.filter((g) => getCoverWinner(g) !== null);
  const { standings } = computeStandings(games, picks, roster);

  let topPickers = [];
  let bottomPickers = [];
  if (graded.length > 0) {
    const scores = standings.map((s) => s.correct);
    const topScore = Math.max(...scores);
    const bottomScore = Math.min(...scores);
    topPickers = standings.filter((s) => s.correct === topScore).map((s) => s.name);
    bottomPickers = standings.filter((s) => s.correct === bottomScore).map((s) => s.name);
  }

  let biggestUpset = null;
  let chalkCount = 0;
  let upsetCount = 0;
  graded.forEach((g) => {
    const winner = getCoverWinner(g);
    const isUpset = winner !== g.favorite;
    const margin = g.favorite === "HOME"
      ? Math.abs((g.homeScore - g.awayScore) - g.spread)
      : Math.abs((g.awayScore - g.homeScore) - g.spread);
    if (isUpset) {
      upsetCount += 1;
      if (!biggestUpset || margin > biggestUpset.margin) {
        biggestUpset = { game: g, margin };
      }
    } else {
      chalkCount += 1;
    }
  });

  let mostAgreed = null;
  games.forEach((g) => {
    let homeCount = 0;
    let awayCount = 0;
    roster.forEach((name) => {
      const p = picks[name]?.[g.id];
      if (!p) return;
      if (p.team === "HOME") homeCount += 1;
      else awayCount += 1;
    });
    const total = homeCount + awayCount;
    if (total === 0) return;
    const max = Math.max(homeCount, awayCount);
    const pct = max / total;
    if (!mostAgreed || pct > mostAgreed.pct || (pct === mostAgreed.pct && total > mostAgreed.total)) {
      mostAgreed = { game: g, team: homeCount >= awayCount ? "HOME" : "AWAY", count: max, total, pct };
    }
  });

  return { topPickers, bottomPickers, biggestUpset, chalkCount, upsetCount, mostAgreed };
}
