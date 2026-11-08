import { NextRequest, NextResponse } from "next/server";
import { pushImage, pushText } from "@/lib/line";
import { isAllowedImageUrl } from "@/lib/media";
import { saveMessage } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { userId, text, imageUrl } = (await req.json()) as {
    userId?: string;
    text?: string;
    imageUrl?: string;
  };

  // ส่งรูป: imageUrl ต้องเป็น URL ที่อัปโหลดผ่าน /api/upload เท่านั้น
  if (imageUrl !== undefined) {
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }
    if (!isAllowedImageUrl(imageUrl)) {
      return NextResponse.json({ error: "imageUrl ไม่ถูกต้อง (ต้องอัปโหลดผ่านระบบก่อน)" }, { status: 400 });
    }
    try {
      await pushImage(userId, imageUrl);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
    const now = Date.now();
    await saveMessage({
      id: `out-${now}`,
      userId,
      direction: "out",
      text: "[รูปภาพ]",
      timestamp: now,
      kind: "image",
      imageUrl,
    });
    return NextResponse.json({ ok: true });
  }

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
