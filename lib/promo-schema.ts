import { z } from "zod";

/** Esquemas compartidos por las rutas de administración de ofertas/combos. */
export const comboItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99),
});

export const comboSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1000).default(""),
  image: z.string().max(1_600_000).nullable().optional(),
  price: z.number().positive().max(100_000_000),
  compareAtPrice: z.number().positive().max(100_000_000).nullable().optional(),
  currency: z.string().min(2).max(6).default("CUP"),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).max(9999).default(0),
  items: z.array(comboItemSchema).min(1).max(30),
});

export const bannerSchema = z.object({
  title: z.string().min(1).max(120),
  subtitle: z.string().max(300).default(""),
  image: z.string().max(1_600_000).nullable().optional(),
  ctaLabel: z.string().max(60).default(""),
  ctaUrl: z.string().max(500).default(""),
  background: z.string().max(60).default("#1b1a17"),
  textColor: z.string().max(60).default("#f6f1e6"),
  placement: z.enum(["HOME", "CATALOG", "BOTH"]).default("HOME"),
  visible: z.boolean().default(true),
  order: z.number().int().min(0).max(9999).default(0),
  endsAt: z.string().datetime().nullable().optional(),
});
