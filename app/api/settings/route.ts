import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  // Store coordinates are public (they are the pickup address the customer
  // comes to) — nothing secret lives in this payload.
  return NextResponse.json({ settings });
}
