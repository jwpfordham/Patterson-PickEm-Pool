import { NextResponse } from "next/server";
import { getPicks, savePick, getRoster, getSchedule } from "@/lib/kv";

export async function GET(request) {
  const week = Number(new URL(request.url).searchParams.get("week") || "1");
  const picks = await getPicks(week);
  return NextResponse.json({ week, picks });
}

export async function POST(request) {
  const { week, player, gameId, team } = await request.json();

  if (!player || typeof player !== "string") {
    return NextResponse.json({ error: "Missing player name" }, { status: 400 });
  }
  const roster = (await getRoster()) || [];
  if (!roster.includes(player)) {
    return NextResponse.json({ error: "That name isn't on the roster" }, { status: 400 });
  }
  if (team !== "HOME" && team !== "AWAY") {
    return NextResponse.json({ error: "Invalid pick" }, { status: 400 });
  }
  const games = (await getSchedule(week)) || [];
  if (!games.some((g) => g.id === gameId)) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const picks = await savePick(week, player, gameId, team);
  return NextResponse.json({ week, picks });
}
