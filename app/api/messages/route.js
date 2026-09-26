import { NextResponse } from "next/server";
import { getMessages, addMessage, getRoster } from "@/lib/kv";

export async function GET(request) {
  const week = Number(new URL(request.url).searchParams.get("week") || "1");
  const messages = await getMessages(week);
  return NextResponse.json({ week, messages });
}

// No passcode here on purpose -- same honor system as picks. Anyone can
// post as any roster name; the visible name and timestamp are the only
// real safeguard.
export async function POST(request) {
  const { week, name, text } = await request.json();

  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }
  const roster = (await getRoster()) || [];
  if (!roster.includes(name)) {
    return NextResponse.json({ error: "That name isn't on the roster" }, { status: 400 });
  }
  const trimmed = (text || "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }
  if (trimmed.length > 500) {
    return NextResponse.json({ error: "Message is too long (500 characters max)" }, { status: 400 });
  }

  const messages = await addMessage(week, name, trimmed);
  return NextResponse.json({ week, messages });
}
