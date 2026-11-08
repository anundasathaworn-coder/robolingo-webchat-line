import { NextRequest, NextResponse } from "next/server";
import { getProfile, verifySignature } from "@/lib/line";
import { saveMessage } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface LineEvent {
  type: string;
  timestamp: number;
  source?: { type: string; userId?: string };
  message?: {
    id: string;
    type: string;
    text?: string;
    stickerId?: string;
    contentProvider?: { type: string; originalContentUrl?: string };
  };
}

/** แปลงข้อความจาก LINE เป็นข้อความที่เราเก็บ (รองรับ text / image / sticker) */
function toChatContent(m: NonNullable<LineEvent["message"]>) {
  if (m.type === "text") return { text: m.text ?? "" };
  if (m.type === "sticker") {
    return { text: "[สติกเกอร์]", kind: "sticker" as const, stickerId: m.stickerId };
  }
  if (m.type === "image") {
    const p = m.contentProvider;
    const external = p?.type === "external" && p.originalContentUrl?.startsWith("https://");
    return {
      text: "[รูปภาพ]",
      kind: "image" as const,
      // รูปที่ LINE เก็บเอง ต้องดึงผ่าน proxy ของเรา (ใช้ access token)
      imageUrl: external ? p!.originalContentUrl : `/api/media/${m.id}`,
    };
  }
  return { text: `[${m.type}]` };
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
    const profile = await getProfile(userId);
    await saveMessage(
      {
        id: ev.message.id,
        userId,
        direction: "in",
        timestamp: ev.timestamp,
        ...toChatContent(ev.message),
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
