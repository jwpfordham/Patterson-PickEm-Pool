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
  const body = await request.json();
  const { password, week, gameId } = body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const games = (await getSchedule(week)) || [];
  const idx = games.findIndex((g) => g.id === gameId);
  if (idx === -1) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const updated = { ...games[idx] };

  if ("favorite" in body) {
    updated.favorite = body.favorite || null;
  }
  if ("spreadRaw" in body) {
    updated.spread = body.spreadRaw === "" || body.spreadRaw == null
      ? null
      : roundSpread(body.spreadRaw);
  }
  if ("awayScore" in body) {
    updated.awayScore = body.awayScore === "" || body.awayScore == null
      ? null
      : Number(body.awayScore);
  }
  if ("homeScore" in body) {
    updated.homeScore = body.homeScore === "" || body.homeScore == null
      ? null
      : Number(body.homeScore);
  }
  updated.final = updated.awayScore != null && updated.homeScore != null;

  games[idx] = updated;
  const saved = await setSchedule(week, games);
  return NextResponse.json({ week, games: saved });
}
