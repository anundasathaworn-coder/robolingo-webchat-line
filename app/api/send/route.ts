import { NextRequest, NextResponse } from "next/server";
import { pushText } from "@/lib/line";
import { saveMessage } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId, text } = (await req.json()) as { userId?: string; text?: string };
  if (!userId || !text?.trim()) {
    return NextResponse.json({ error: "userId and text are required" }, { status: 400 });
  }
  try {
    await pushText(userId, text.trim());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  const now = Date.now();
  await saveMessage({
    id: `out-${now}`,
    userId,
    direction: "out",
    text: text.trim(),
    timestamp: now,
  });
  return NextResponse.json({ ok: true });
}
