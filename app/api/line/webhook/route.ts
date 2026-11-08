import { NextRequest, NextResponse } from "next/server";
import { getProfile, verifySignature } from "@/lib/line";
import { saveMessage } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LineEvent {
  type: string;
  timestamp: number;
  source?: { type: string; userId?: string };
  message?: { id: string; type: string; text?: string; stickerId?: string };
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-line-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  const body = JSON.parse(raw) as { events?: LineEvent[] };

  for (const ev of body.events ?? []) {
    const userId = ev.source?.userId;
    if (ev.type !== "message" || !ev.message || !userId) continue;
    const text =
      ev.message.type === "text"
        ? ev.message.text ?? ""
        : `[${ev.message.type}]`;
    const profile = await getProfile(userId);
    await saveMessage(
      {
        id: ev.message.id,
        userId,
        direction: "in",
        text,
        timestamp: ev.timestamp,
      },
      profile
    );
  }
  return NextResponse.json({ ok: true });
}

// ให้ LINE ตรวจสอบ URL ได้ง่าย / เปิดดูในเบราว์เซอร์
export async function GET() {
  return NextResponse.json({ status: "LINE webhook ready" });
}
