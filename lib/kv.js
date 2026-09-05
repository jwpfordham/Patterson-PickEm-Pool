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

export async function getSchedule(week) {
  const schedule = await kv.get(`schedule:${seasonKey(week)}`);
  return schedule || null;
}

export async function setSchedule(week, games) {
  await kv.set(`schedule:${seasonKey(week)}`, games);
  return games;
}
