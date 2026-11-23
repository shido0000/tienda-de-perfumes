import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { parseCurrencies } from "@/lib/currency";
import { sanitizeSiteTexts } from "@/lib/site-texts";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  brand: z.string().min(1).max(80),
  tagline: z.string().max(120),
  bankDetails: z.string().min(1).max(2000),
  whatsapp: z.string().regex(/^\d{8,15}$/, "WhatsApp sin signos: solo dígitos con código de país"),
  whatsappDisplay: z.string().min(1).max(40),
  storeAddress: z.string().min(1).max(300),
  storeLat: z.number().min(-90).max(90),
  storeLng: z.number().min(-180).max(180),
  baseRate: z.number().min(0).max(1_000_000),
  perKm: z.number().min(0).max(1_000_000),
  maxRadius: z.number().min(1).max(500),
  baseCurrency: z.string().min(2).max(6),
  displayCurrency: z.string().min(2).max(6),
  showSecondCurrency: z.boolean().default(false),
  secondCurrency: z.string().min(2).max(6).default("USD"),
  showStock: z.boolean().default(true),
  notificationPhones: z
    .array(z.string().regex(/^\d{6,15}$/, "Teléfono sin signos: solo dígitos con código de país"))
    .max(10)
    .default([]),
  currencies: z
    .array(
      z.object({
        code: z.string().min(2).max(6),
        symbol: z.string().min(1).max(6),
        rate: z.number().positive(),
        label: z.string().min(1).max(40),
      }),
    )
    .min(1),
});

/**
 * Contenido editable (logo, textos legales, copy del catálogo y SEO).
 * Va en su propio esquema porque la pestaña "Contenido" guarda solo estos
 * campos y no debe reenviar precios ni tarifas de envío.
 */
const DATA_IMAGE = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=\s]+$/i;

const contentSchema = z.object({
  logoUrl: z.union([z.null(), z.string().max(1_600_000)]).optional(),
  termsText: z.string().max(20_000).optional(),
  privacyText: z.string().max(20_000).optional(),
  cookiesText: z.string().max(20_000).optional(),
  reservationsText: z.string().max(20_000).optional(),
  catalogTitle: z.string().max(80).optional(),
  catalogIntro: z.string().max(600).optional(),
  heroTitle: z.string().max(200).optional(),
  heroSubtitle: z.string().max(400).optional(),
  seoTitle: z.string().max(160).optional(),
  seoDescription: z.string().max(320).optional(),
  seoKeywords: z.string().max(300).optional(),
  siteUrl: z.string().max(200).optional(),
  googleSiteVerification: z.string().max(120).optional(),
  siteTexts: z.record(z.string(), z.string().max(400)).optional(),
});

function sanitizeLogo(value: string | null | undefined): string | null {
  if (value === undefined) return undefined as unknown as null;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const isHttp = /^https?:\/\//i.test(trimmed);
  const isData = DATA_IMAGE.test(trimmed);
  if (!isHttp && !isData) {
    throw new Error("El logo debe ser una URL http(s) o una imagen subida.");
  }
  return trimmed;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const row = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
  if (!row) return NextResponse.json({ error: "Sin configuración" }, { status: 404 });
  return NextResponse.json({
    settings: { ...row, currencies: parseCurrencies(row.currencies) },
  });
}

export async function PUT(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const codes = new Set(d.currencies.map((c) => c.code.toUpperCase()));
  if (!codes.has(d.baseCurrency.toUpperCase())) {
    return NextResponse.json(
      { error: "La moneda base debe estar entre las monedas configuradas." },
      { status: 400 },
    );
  }
  if (!codes.has(d.displayCurrency.toUpperCase())) {
    return NextResponse.json(
      { error: "La moneda de visualización debe estar entre las monedas configuradas." },
      { status: 400 },
    );
  }

  const data = {
    brand: d.brand,
    tagline: d.tagline,
    bankDetails: d.bankDetails,
    whatsapp: d.whatsapp,
    whatsappDisplay: d.whatsappDisplay,
    storeAddress: d.storeAddress,
    storeLat: d.storeLat,
    storeLng: d.storeLng,
    baseRate: d.baseRate,
    perKm: d.perKm,
    maxRadius: d.maxRadius,
    baseCurrency: d.baseCurrency.toUpperCase(),
    displayCurrency: d.displayCurrency.toUpperCase(),
    showSecondCurrency: d.showSecondCurrency,
    secondCurrency: d.secondCurrency.toUpperCase(),
    showStock: d.showStock,
    notificationPhones: d.notificationPhones,
    currencies: d.currencies.map((c) => ({ ...c, code: c.code.toUpperCase() })),
  };

  const settings = await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  // Historial de cotizaciones: si alguna tasa cambió, guardamos una foto con
  // fecha. Las reservas viejas conservan su precio (ya congelado por línea), así
  // que mover la tasa hoy nunca cambia lo que se pagó ayer.
  const lastLog = await prisma.currencyRateLog.findFirst({ orderBy: { createdAt: "desc" } });
  const prevSnapshot = (lastLog?.snapshot as Record<string, number> | undefined) ?? {};
  const changed = data.currencies.filter((c) => prevSnapshot[c.code] !== c.rate);
  if (changed.length > 0) {
    const snapshot: Record<string, number> = {};
    for (const c of data.currencies) snapshot[c.code] = c.rate;
    await prisma.currencyRateLog.create({
      data: {
        code: changed.map((c) => c.code).join(","),
        rate: changed[0].rate,
        snapshot,
      },
    });
  }

  return NextResponse.json({ settings });
}

/** Actualiza solo el contenido editable (logo, legales, copy, SEO). */
export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const parsed = contentSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
      { status: 400 },
    );
  }

  let logoUrl: string | null | undefined;
  try {
    logoUrl = sanitizeLogo(parsed.data.logoUrl);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const key of [
    "termsText",
    "privacyText",
    "cookiesText",
    "reservationsText",
    "catalogTitle",
    "catalogIntro",
    "heroTitle",
    "heroSubtitle",
    "seoTitle",
    "seoDescription",
    "seoKeywords",
    "siteUrl",
    "googleSiteVerification",
  ] as const) {
    const value = parsed.data[key];
    if (value === undefined) continue;
    // Un texto corto de 1-2 letras ("s") es un tipeo suelto, no contenido:
    // se guarda vacío y la web usa su texto por defecto en vez de mostrar una
    // letra huérfana debajo del titular.
    const trimmed = value.trim();
    const tooShort = trimmed.length > 0 && trimmed.length < 3;
    data[key] = tooShort ? "" : value;
  }
  if (logoUrl !== undefined) data.logoUrl = logoUrl;

  // Textos del sitio (barra superior, secciones, pie). Se mergean con lo que ya
  // hay para no borrar las claves que el panel no reenvió.
  if (parsed.data.siteTexts) {
    const current = await prisma.storeSettings.findUnique({ where: { id: "singleton" } });
    const prev = (current?.siteTexts as Record<string, unknown> | null) ?? {};
    data.siteTexts = {
      ...prev,
      ...sanitizeSiteTexts(parsed.data.siteTexts),
    };
  }

  const settings = await prisma.storeSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  return NextResponse.json({ settings });
}
