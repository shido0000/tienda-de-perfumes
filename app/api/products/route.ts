import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { normalizeProduct } from "@/lib/normalize-product";
import { withPublicImages } from "@/lib/image-url";
import { getRefManager, withManagerPrice } from "@/lib/manager";
import { z } from "zod";

export const dynamic = "force-dynamic";

/**
 * Catálogo público. Nunca incluye `costCup` (precio de costo, solo admin).
 * Filtros: q (texto), category, brand, min/max de precio (en la moneda del
 * producto), inStock, sort.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const category = (searchParams.get("category") ?? "").trim();
  const brand = (searchParams.get("brand") ?? "").trim();
  const min = Number(searchParams.get("min") ?? "");
  const max = Number(searchParams.get("max") ?? "");
  const inStock = searchParams.get("inStock") === "1";
  const occasion = searchParams.get("occasion");
  const gender = searchParams.get("gender");
  const sort = searchParams.get("sort") ?? "new";

  const hasMin = Number.isFinite(min) && searchParams.get("min") !== null;
  const hasMax = Number.isFinite(max) && searchParams.get("max") !== null;

  const orderBy =
    sort === "price-asc"
      ? { price: "asc" as const }
      : sort === "price-desc"
        ? { price: "desc" as const }
        : sort === "name"
          ? { name: "asc" as const }
          : { createdAt: "desc" as const };

  const products = await prisma.product.findMany({
    where: {
      visible: true,
      AND: [
        ...(category && category !== "all" ? [{ category }] : []),
        ...(brand && brand !== "all" ? [{ brand }] : []),
        ...(inStock ? [{ OR: [{ stock: null }, { stock: { gt: 0 } }] }] : []),
        ...(occasion && occasion !== "all"
          ? [{ OR: [{ occasion }, { occasion: "AMBAS" }] }]
          : []),
        ...(gender && gender !== "all"
          ? [{ OR: [{ gender }, { gender: "UNISEX" }] }]
          : []),
        ...(hasMin || hasMax
          ? [
              {
                price: {
                  ...(hasMin ? { gte: min } : {}),
                  ...(hasMax ? { lte: max } : {}),
                },
              },
            ]
          : []),
        ...(q
          ? [
              {
                OR: [
                  { name: { contains: q, mode: "insensitive" as const } },
                  { brand: { contains: q, mode: "insensitive" as const } },
                  { description: { contains: q, mode: "insensitive" as const } },
                  { notes: { contains: q, mode: "insensitive" as const } },
                  { category: { contains: q, mode: "insensitive" as const } },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy,
  });

  // El precio de costo jamás sale al público: se omite explícitamente.
  // `price`/`compareAtPrice` van como NÚMEROS (Prisma los devuelve Decimal).
  // Las fotos se reescriben a /api/img (con caché) para no enviar base64.
  const manager = await getRefManager().catch(() => null);
  const safe = products.map(({ costCup: _cost, ...rest }) =>
    withManagerPrice(normalizeProduct(withPublicImages(rest)), manager),
  );
  return NextResponse.json({ products: safe });
}

const productSchema = z.object({
  name: z.string().min(1).max(120),
  brand: z.string().min(1).max(80),
  description: z.string().min(1).max(2000),
  category: z.string().min(1).max(80),
  categoryId: z.string().nullable().optional(),
  notes: z.string().max(300).optional().nullable(),
  price: z.number().positive().max(100_000_000),
  /** Precio anterior (rebaja). null/omitido = sin rebaja. */
  compareAtPrice: z.number().positive().max(100_000_000).nullable().optional(),
  currency: z.string().min(2).max(6),
  costCup: z.number().min(0).max(100_000_000).nullable().optional(),
  images: z.array(z.string().min(1)).max(6).default([]),
  visible: z.boolean().default(true),
  stock: z.number().int().min(0).nullable().optional(),
  duration: z.string().max(40).nullable().optional(),
  occasion: z.enum(["DIA", "NOCHE", "AMBAS"]).nullable().optional(),
  gender: z.enum(["HOMBRE", "MUJER", "UNISEX"]).default("UNISEX"),
  faqs: z
    .array(
      z.object({
        q: z.string().trim().min(1).max(200),
        a: z.string().trim().min(1).max(2000),
      }),
    )
    .max(15)
    .optional(),
});

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = productSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  const product = await prisma.product.create({
    data: {
      ...parsed.data,
      currency: parsed.data.currency.toUpperCase(),
      notes: parsed.data.notes ?? null,
      categoryId: parsed.data.categoryId ?? null,
      costCup: parsed.data.costCup ?? null,
      stock: parsed.data.stock ?? null,
      duration: parsed.data.duration ?? null,
      occasion: parsed.data.occasion ?? null,
      gender: parsed.data.gender ?? "UNISEX",
      faqs: parsed.data.faqs ?? [],
    },
  });
  return NextResponse.json({ product: normalizeProduct(product) }, { status: 201 });
}
