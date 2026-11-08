import { NextRequest, NextResponse } from "next/server";
import { getMessages, markRead } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await markRead(userId);
  return NextResponse.json({ messages: await getMessages(userId) });
}
