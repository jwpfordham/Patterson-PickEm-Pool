import { NextResponse } from "next/server";
import { getSchedule, setSchedule, getOrSyncSchedule } from "@/lib/kv";
import { WEEK_1_SEED } from "@/lib/seed-week1";
import { roundSpread } from "@/lib/rounding";

export async function GET(request) {
  const week = Number(new URL(request.url).searchParams.get("week") || "1");
  const games = week === 1
    ? await getOrSyncSchedule(week, WEEK_1_SEED)
    : (await getSchedule(week)) || (await setSchedule(week, []));
  return NextResponse.json({ week, games });
}

export async function POST(request) {
  const { password, week, gameId, favorite, spreadRaw } = await request.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const games = (await getSchedule(week)) || [];
  const idx = games.findIndex((g) => g.id === gameId);
  if (idx === -1) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  const rounded = spreadRaw === "" || spreadRaw === null || spreadRaw === undefined
    ? null
    : roundSpread(spreadRaw);
  games[idx] = { ...games[idx], favorite: favorite || null, spread: rounded };
  const saved = await setSchedule(week, games);
  return NextResponse.json({ week, games: saved });
}
