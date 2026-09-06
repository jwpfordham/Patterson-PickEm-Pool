import { Redis } from "@upstash/redis";

const kv = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export function seasonKey(week) {
  return `2026-w${week}`;
}

export async function getRoster() {
  const roster = await kv.get("roster");
  return roster || null;
}

export async function setRoster(names) {
  await kv.set("roster", names);
  return names;
}

export async function getCurrentWeek() {
  const week = await kv.get("current_week");
  return week || 1;
}

export async function setCurrentWeek(week) {
  await kv.set("current_week", week);
  return week;
}

export async function getSchedule(week) {
  const schedule = await kv.get(`schedule:${seasonKey(week)}`);
  return schedule || null;
}

export async function setSchedule(week, games) {
  await kv.set(`schedule:${seasonKey(week)}`, games);
  return games;
}

export async function getOrSyncSchedule(week, seedGames) {
  const stored = await getSchedule(week);
  if (!stored) {
    return setSchedule(week, seedGames);
  }
  const byId = new Map(stored.map((g) => [g.id, g]));
  const merged = seedGames.map((seedGame) => {
    const existing = byId.get(seedGame.id);
    return {
      ...seedGame,
      favorite: existing ? existing.favorite : null,
      spread: existing ? existing.spread : null,
      awayScore: existing && existing.awayScore != null ? existing.awayScore : null,
      homeScore: existing && existing.homeScore != null ? existing.homeScore : null,
      final: existing ? !!existing.final : false,
    };
  });
  return setSchedule(week, merged);
}

export async function getPicks(week) {
  const picks = await kv.get(`picks:${seasonKey(week)}`);
  return picks || {};
}

export async function savePick(week, player, gameId, team) {
  const picks = await getPicks(week);
  if (!picks[player]) picks[player] = {};
  picks[player][gameId] = { team, at: new Date().toISOString() };
  await kv.set(`picks:${seasonKey(week)}`, picks);
  return picks;
}
