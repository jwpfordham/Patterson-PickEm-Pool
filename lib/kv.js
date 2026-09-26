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

// The commissioner advances this each week. Every page defaults to this
// week if no specific week is requested, so players always land on the
// right one automatically.
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

// Merges stored game data with the current seed data. For any game that's
// in the seed, display fields (team names, day, time, network) come from
// the seed, but favorite/spread/scores come from what's actually stored.
// Any stored game that ISN'T in the seed (e.g. one the commissioner added
// manually through "Add a Game") is kept as-is instead of being dropped --
// this was a real bug in the original version of this merge.
function mergeScheduleWithSeed(stored, seedGames) {
  const seedById = new Map(seedGames.map((g) => [g.id, g]));
  const storedById = new Map(stored.map((g) => [g.id, g]));
  const seenIds = [];
  seedById.forEach((_, id) => seenIds.push(id));
  storedById.forEach((_, id) => {
    if (!seedById.has(id)) seenIds.push(id);
  });

  return seenIds.map((id) => {
    const seedGame = seedById.get(id);
    const existing = storedById.get(id);
    if (!seedGame) return existing;
    return {
      ...seedGame,
      favorite: existing ? existing.favorite : null,
      spread: existing ? existing.spread : null,
      awayScore: existing && existing.awayScore != null ? existing.awayScore : null,
      homeScore: existing && existing.homeScore != null ? existing.homeScore : null,
      final: existing ? !!existing.final : false,
    };
  });
}

// Loads the week's schedule, seeding it from `seedGames` the first time.
// On later loads, re-syncs display details from `seedGames` (in case they
// were corrected) while preserving favorite/spread/scores and any
// manually-added games -- and writes the result back to storage.
export async function getOrSyncSchedule(week, seedGames) {
  const stored = await getSchedule(week);
  if (!stored) {
    return setSchedule(week, seedGames);
  }
  const merged = mergeScheduleWithSeed(stored, seedGames);
  return setSchedule(week, merged);
}

// Same merge as above, but read-only -- no write back to storage. Use this
// for pages that just need to display data (season-wide aggregate pages
// that load many weeks at once), so they don't do a wasted write on every
// single page load.
export async function getScheduleReadOnly(week, seedGames) {
  const stored = await getSchedule(week);
  if (!stored) return seedGames;
  return mergeScheduleWithSeed(stored, seedGames);
}

// Picks are stored as: { [playerName]: { [gameId]: { team: "HOME"|"AWAY", at: isoString } } }
// Everyone's picks are visible to everyone (by design) — that visibility,
// plus the timestamp, is the pool's only real defense against picking
// a game late after seeing how it's going.
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

// Message board, one list per week. Public read and post, honor system
// just like everything else on this site -- no password required.
export async function getMessages(week) {
  const messages = await kv.get(`messages:${seasonKey(week)}`);
  return messages || [];
}

export async function addMessage(week, name, text) {
  const messages = await getMessages(week);
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    text,
    at: new Date().toISOString(),
  };
  messages.push(entry);
  await kv.set(`messages:${seasonKey(week)}`, messages);
  return messages;
}
