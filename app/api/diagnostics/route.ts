import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  let schema: string | null = null;
  try {
    schema = new URL(databaseUrl ?? "").searchParams.get("schema");
  } catch {}

  let productCount: number | null = null;
  let error: string | null = null;
  try {
    productCount = await prisma.product.count();
  } catch (e) {
    error = (e as Error).message;
  }

  return NextResponse.json({
    databaseUrlPresent: Boolean(databaseUrl),
    schema,
    productCount,
    error,
  });
}
