import { NextResponse } from "next/server";
import { getRoster, setRoster } from "@/lib/kv";

const SEED_ROSTER = [
  "Timber", "Dave", "Carolyn", "Bridget", "Emily", "Doug", "Clover", "Phil",
  "Mindy", "Dylan", "Will", "Cocoa", "Jamey", "Betty", "Joseph", "Maisie",
  "Grand-Pops", "Mom-Lady",
];

export async function GET() {
  let roster = await getRoster();
  if (!roster) {
    roster = await setRoster(SEED_ROSTER);
  }
  return NextResponse.json({ roster });
}

export async function POST(request) {
  const { password, roster } = await request.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  if (!Array.isArray(roster) || roster.some((n) => typeof n !== "string")) {
    return NextResponse.json({ error: "Roster must be a list of names" }, { status: 400 });
  }
  const saved = await setRoster(roster);
  return NextResponse.json({ roster: saved });
}
