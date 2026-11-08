import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** อัปโหลดรูปไป Vercel Blob (public) เพื่อให้ได้ URL https ที่ LINE Push API ดึงได้ */
export async function POST(req: NextRequest) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า Vercel Blob (BLOB_READ_WRITE_TOKEN) จึงส่งรูปไม่ได้" },
      { status: 501 }
    );
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "ต้องส่งเป็น multipart/form-data" }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "ไม่พบไฟล์ (field ชื่อ file)" }, { status: 400 });
  }
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return NextResponse.json({ error: "รองรับเฉพาะ JPEG และ PNG" }, { status: 415 });
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 1MB" }, { status: 413 });
  }

  const ext = file.type === "image/png" ? "png" : "jpg";
  try {
    const blob = await put(`chat/${Date.now()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
