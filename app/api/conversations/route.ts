import { NextResponse } from "next/server";
import { listConversations, storeMode } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ conversations: await listConversations(), storeMode });
}
