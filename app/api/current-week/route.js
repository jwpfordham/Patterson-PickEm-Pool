import { NextResponse } from "next/server";
import { getCurrentWeek, setCurrentWeek } from "@/lib/kv";

export async function GET() {
  const week = await getCurrentWeek();
  return NextResponse.json({ week });
}

export async function POST(request) {
  const { password, week } = await request.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }
  const num = Number(week);
  if (!Number.isInteger(num) || num < 1 || num > 18) {
    return NextResponse.json({ error: "Week must be between 1 and 18" }, { status: 400 });
  }
  const saved = await setCurrentWeek(num);
  return NextResponse.json({ week: saved });
}
