import crypto from "crypto";

// LINE_API_BASE ใช้เฉพาะตอนรัน E2E ให้ชี้ไป mock server (ค่าเริ่มต้น = LINE จริง)
const API = process.env.LINE_API_BASE || "https://api.line.me/v2/bot";

export function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// ดึงไฟล์รูปของข้อความอยู่คนละโฮสต์กับ API หลัก (api-data.line.me)
const DATA_API = process.env.LINE_DATA_API_BASE || "https://api-data.line.me/v2/bot";

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
  };
}

export async function getProfile(userId: string) {
  try {
    const r = await fetch(`${API}/profile/${userId}`, { headers: headers() });
    if (!r.ok) return undefined;
    return (await r.json()) as { displayName: string; pictureUrl?: string };
  } catch {
    return undefined;
  }
}

export async function pushText(to: string, text: string) {
  const r = await fetch(`${API}/message/push`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });
  if (!r.ok) throw new Error(`LINE push failed (${r.status}): ${await r.text()}`);
}

export async function pushImage(to: string, url: string) {
  const r = await fetch(`${API}/message/push`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      to,
      messages: [{ type: "image", originalContentUrl: url, previewImageUrl: url }],
    }),
  });
  if (!r.ok) throw new Error(`LINE push failed (${r.status}): ${await r.text()}`);
}

/** ดึงไฟล์ของข้อความรูป (LINE เก็บไว้ชั่วคราวเท่านั้น) คืน Response ดิบจาก LINE */
export function getContent(messageId: string) {
  return fetch(`${DATA_API}/message/${encodeURIComponent(messageId)}/content`, {
    headers: { Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` },
  });
}
