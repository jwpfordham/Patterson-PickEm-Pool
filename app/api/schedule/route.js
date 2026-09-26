import { NextResponse } from "next/server";
import { getSchedule, setSchedule, getOrSyncSchedule, getScheduleReadOnly } from "@/lib/kv";
import { SEASON_SEED } from "@/lib/season-seed";
import { roundSpread } from "@/lib/rounding";

// Pass ?readonly=1 to skip the write-back sync -- used by pages that load
// many weeks at once (Season Standings, Graphs, Rivalry) so they don't do
// an unnecessary database write for every single week on every page load.
export async function GET(request) {
  const url = new URL(request.url);
  const week = Number(url.searchParams.get("week") || "1");
  const readOnly = url.searchParams.get("readonly") === "1";
  const games = readOnly
    ? await getScheduleReadOnly(week, SEASON_SEED[week] || [])
    : await getOrSyncSchedule(week, SEASON_SEED[week] || []);
  return NextResponse.json({ week, games });
}

export async function POST(request) {
  const body = await request.json();
  const { password, week, action } = body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  if (action === "addGame") {
    const { away, home, day, time, network } = body.game || {};
    if (!away || !home) {
      return NextResponse.json({ error: "Away and home team are required" }, { status: 400 });
    }
    const games = (await getSchedule(week)) || [];
    const id = `${away}-${home}-${Date.now()}`.toLowerCase().replace(/\s+/g, "-");
    games.push({
      id, away, home, day: day || "", time: time || "", network: network || "",
      favorite: null, spread: null, awayScore: null, homeScore: null, final: false,
    });
    const saved = await setSchedule(week, games);
    return NextResponse.json({ week, games: saved });
  }

  if (action === "removeGame") {
    const games = (await getSchedule(week)) || [];
    const saved = await setSchedule(week, games.filter((g) => g.id !== body.gameId));
    return NextResponse.json({ week, games: saved });
  }

  const { gameId } = body;
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
