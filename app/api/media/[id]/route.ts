import { NextRequest } from "next/server";
import { getContent } from "@/lib/line";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy รูปที่ลูกค้าส่งมา: LINE ไม่ให้ URL สาธารณะ ต้องเรียก Content API ด้วย access token
 * เราเรียกฝั่ง server แล้วส่งต่อ เพื่อไม่ให้ token หลุดไปที่เบราว์เซอร์
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  if (!/^\d{1,32}$/.test(id)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await getContent(id);
  } catch {
    return Response.json({ error: "cannot reach LINE" }, { status: 502 });
  }
  if (upstream.status === 404) return Response.json({ error: "not found or expired" }, { status: 404 });
  if (!upstream.ok) return Response.json({ error: `LINE error (${upstream.status})` }, { status: 502 });

  // ส่งต่อเฉพาะรูป กันไฟล์ชนิดอื่น (เช่น html) ถูกเสิร์ฟจากโดเมนเรา
  const type = upstream.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) {
    return Response.json({ error: "not an image" }, { status: 415 });
  }
  return new Response(upstream.body, {
    headers: {
      "content-type": type,
      "cache-control": "private, max-age=86400",
      "x-content-type-options": "nosniff",
    },
  });
}
