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

// Combines multiple weeks of games/picks into one season-long leaderboard.
// weeksData is an array of { week, games, picks } objects. Tracks both how
// many picks each player got correct AND how many they actually made, since
// not everyone submits a pick for every game every week.
export function computeSeasonStandings(weeksData, roster) {
  let totalGraded = 0;
  const correctTotals = Object.fromEntries(roster.map((name) => [name, 0]));
  const madeTotals = Object.fromEntries(roster.map((name) => [name, 0]));

  weeksData.forEach(({ games, picks }) => {
    const graded = games.filter((g) => getCoverWinner(g) !== null);
    totalGraded += graded.length;
    roster.forEach((name) => {
      graded.forEach((g) => {
        const pick = picks[name]?.[g.id];
        if (!pick) return;
        madeTotals[name] += 1;
        if (pick.team === getCoverWinner(g)) correctTotals[name] += 1;
      });
    });
  });

  const standings = roster
    .map((name) => ({ name, correct: correctTotals[name], made: madeTotals[name] }))
    .sort((a, b) => b.correct - a.correct);

  return { standings, totalGraded };
}

// One entry per week: what share of all picks made that week were correct,
// across the whole pool -- a quick read on how "chalky" or wild each week was.
export function computeWeeklyPoolAccuracy(weeksData, roster) {
  return weeksData.map(({ week, games, picks }) => {
    const graded = games.filter((g) => getCoverWinner(g) !== null);
    let made = 0;
    let correct = 0;
    roster.forEach((name) => {
      graded.forEach((g) => {
        const pick = picks[name]?.[g.id];
        if (!pick) return;
        made += 1;
        if (pick.team === getCoverWinner(g)) correct += 1;
      });
    });
    const pct = made > 0 ? Math.round((correct / made) * 100) : null;
    return { week, pct, gradedCount: graded.length };
  });
}

// Cumulative correct-picks total per player, week by week -- for a season
// "race" line chart. Limits to the top N players by final total so the
// chart stays readable with a large roster.
export function computeSeasonRace(weeksData, roster, topN = 6) {
  const running = Object.fromEntries(roster.map((name) => [name, 0]));
  const perWeek = weeksData.map(({ week, games, picks }) => {
    const graded = games.filter((g) => getCoverWinner(g) !== null);
    roster.forEach((name) => {
      graded.forEach((g) => {
        const pick = picks[name]?.[g.id];
        if (pick && pick.team === getCoverWinner(g)) running[name] += 1;
      });
    });
    return { week, totals: { ...running } };
  });

  const finalTotals = perWeek.length > 0 ? perWeek[perWeek.length - 1].totals : running;
  const topPlayers = roster
    .map((name) => ({ name, total: finalTotals[name] || 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN)
    .map((p) => p.name);

  return { perWeek, topPlayers };
}

// How many games each week went as expected (favorite covered) vs. were an
// upset (underdog covered) -- season-wide, one entry per week.
export function computeExpectedVsUpsetByWeek(weeksData) {
  return weeksData
    .map(({ week, games }) => {
      const graded = games.filter((g) => getCoverWinner(g) !== null);
      let expected = 0;
      let upset = 0;
      graded.forEach((g) => {
        if (getCoverWinner(g) === g.favorite) expected += 1;
        else upset += 1;
      });
      return { week, expected, upset, total: graded.length };
    })
    .filter((w) => w.total > 0);
}

// Which NFL teams the pool picks most often, across every player and week.
export function computeTeamPopularity(weeksData) {
  const counts = {};
  weeksData.forEach(({ games, picks }) => {
    games.forEach((g) => {
      Object.values(picks).forEach((playerPicks) => {
        const p = playerPicks[g.id];
        if (!p) return;
        const team = p.team === "HOME" ? g.home : g.away;
        counts[team] = (counts[team] || 0) + 1;
      });
    });
  });
  return Object.entries(counts)
    .map(([team, count]) => ({ team, count }))
    .sort((a, b) => b.count - a.count);
}

// Across the whole pool: when people pick the favorite, how often are they
// right, vs. when they pick the underdog?
export function computeFavoriteUnderdogAccuracy(weeksData) {
  let favMade = 0;
  let favCorrect = 0;
  let dogMade = 0;
  let dogCorrect = 0;

  weeksData.forEach(({ games, picks }) => {
    const graded = games.filter((g) => getCoverWinner(g) !== null);
    graded.forEach((g) => {
      const winner = getCoverWinner(g);
      Object.values(picks).forEach((playerPicks) => {
        const p = playerPicks[g.id];
        if (!p) return;
        if (p.team === g.favorite) {
          favMade += 1;
          if (p.team === winner) favCorrect += 1;
        } else {
          dogMade += 1;
          if (p.team === winner) dogCorrect += 1;
        }
      });
    });
  });

  return {
    favorite: { made: favMade, correct: favCorrect, pct: favMade ? Math.round((favCorrect / favMade) * 100) : 0 },
    underdog: { made: dogMade, correct: dogCorrect, pct: dogMade ? Math.round((dogCorrect / dogMade) * 100) : 0 },
  };
}
