import crypto from "crypto";

const API = "https://api.line.me/v2/bot";

export function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

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
