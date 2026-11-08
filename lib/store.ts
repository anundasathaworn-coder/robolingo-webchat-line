import { Redis } from "@upstash/redis";
import type { ChatMessage, Conversation } from "./types";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const redis = url && token ? new Redis({ url, token }) : null;

// Fallback สำหรับ local dev (ไม่ถาวรบน serverless)
const g = globalThis as unknown as {
  __mem?: { convs: Map<string, Conversation>; msgs: Map<string, ChatMessage[]> };
};
const mem = (g.__mem ??= { convs: new Map(), msgs: new Map() });

const MAX_MSGS = 200;

export const storeMode = redis ? "redis" : "memory";

export async function saveMessage(
  msg: ChatMessage,
  profile?: { displayName?: string; pictureUrl?: string }
) {
  const prev = await getConversation(msg.userId);
  const conv: Conversation = {
    userId: msg.userId,
    displayName: profile?.displayName || prev?.displayName || msg.userId.slice(0, 8),
    pictureUrl: profile?.pictureUrl || prev?.pictureUrl,
    lastMessage: msg.text,
    lastTimestamp: msg.timestamp,
    unread: msg.direction === "in" ? (prev?.unread ?? 0) + 1 : prev?.unread ?? 0,
  };
  if (redis) {
    await Promise.all([
      redis.hset("conv", { [msg.userId]: JSON.stringify(conv) }),
      redis.rpush(`msgs:${msg.userId}`, JSON.stringify(msg)),
    ]);
    await redis.ltrim(`msgs:${msg.userId}`, -MAX_MSGS, -1);
  } else {
    mem.convs.set(msg.userId, conv);
    const list = mem.msgs.get(msg.userId) ?? [];
    list.push(msg);
    mem.msgs.set(msg.userId, list.slice(-MAX_MSGS));
  }
}

const parse = <T,>(v: unknown): T => (typeof v === "string" ? JSON.parse(v) : (v as T));

export async function getConversation(userId: string): Promise<Conversation | null> {
  if (redis) {
    const v = await redis.hget("conv", userId);
    return v ? parse<Conversation>(v) : null;
  }
  return mem.convs.get(userId) ?? null;
}

export async function listConversations(): Promise<Conversation[]> {
  let all: Conversation[];
  if (redis) {
    const h = (await redis.hgetall("conv")) as Record<string, unknown> | null;
    all = Object.values(h ?? {}).map((v) => parse<Conversation>(v));
  } else {
    all = [...mem.convs.values()];
  }
  return all.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}

export async function getMessages(userId: string): Promise<ChatMessage[]> {
  if (redis) {
    const l = await redis.lrange(`msgs:${userId}`, 0, -1);
    return l.map((v) => parse<ChatMessage>(v));
  }
  return mem.msgs.get(userId) ?? [];
}

export async function markRead(userId: string) {
  const c = await getConversation(userId);
  if (!c || c.unread === 0) return;
  c.unread = 0;
  if (redis) await redis.hset("conv", { [userId]: JSON.stringify(c) });
  else mem.convs.set(userId, c);
}
