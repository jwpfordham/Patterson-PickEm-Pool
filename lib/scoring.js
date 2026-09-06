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
