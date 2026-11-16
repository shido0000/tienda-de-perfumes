import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getSiteUrl } from "@/lib/site-url";
import { ProductDetail } from "@/components/ProductDetail";
import { normalizeFaqs } from "@/lib/normalize-product";
import { publicImages } from "@/lib/image-url";

/** Convierte la galería (posiblemente base64) a URLs absolutas y cacheables. */
function absoluteImages(productId: string, images: string[] | null | undefined, base?: string): string[] {
  const pub = publicImages(productId, images).filter((u) => !String(u).startsWith("data:"));
  if (!base) return pub;
  return pub.map((u) => (/^https?:\/\//i.test(u) ? u : `${base}${u.startsWith("/") ? "" : "/"}${u}`));
}
import type { ProductDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Metadatos de la ficha: hasta ahora la página del perfume heredaba el título
 * genérico de la tienda, así que en Google las 8 fichas se veían iguales y
 * Google no sabía de qué perfume hablaba cada una. Acá cada ficha se titula con
 * el perfume, su marca y la nota principal, y declara su dirección canónica.
 */
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const [product, settings] = await Promise.all([
    prisma.product.findFirst({ where: { id: params.id, visible: true } }),
    getSettings(),
  ]);
  if (!product) return { title: "Perfume no encontrado", robots: { index: false } };

  const base = (await getSiteUrl()) || undefined;
  const url = base ? `${base}/producto/${product.id}` : undefined;
  const notes = product.notes?.trim() ? ` · ${product.notes.trim()}` : "";
  const title = `${product.name} — ${product.brand}`;
  const ogImages = absoluteImages(product.id, product.images, base);
  const description =
    (product.description?.trim() || "").slice(0, 300) ||
    `${product.name} de ${product.brand}, disponible para reservar en ${settings.brand}.${notes}`;

  return {
    title,
    description,
    ...(product.notes?.trim() ? { keywords: product.notes.split(/[,·]/).map((n) => n.trim()) } : {}),
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      ...(url ? { url } : {}),
      ...(ogImages.length ? { images: ogImages } : {}),
    },
  };
}

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findFirst({
    where: { id: params.id, visible: true },
  });
  if (!product) notFound();

  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  const saved = user
    ? Boolean(
        await prisma.wishlistItem.findUnique({
          where: { userId_productId: { userId: user.id, productId: product.id } },
        }),
      )
    : false;

  // "Comprá junto con": dos perfumes que combinan con este. Buscamos primero en
  // otra familia olfativa (un fresco junto a un amaderado, por ejemplo) y, si no
  // alcanza, completamos con cualquiera de la misma familia.
  const base = {
    visible: true,
    id: { not: product.id },
    stock: { gte: 1 },
  };
  const different = await prisma.product.findMany({
    where: { ...base, category: { not: product.category } },
    orderBy: { createdAt: "desc" },
    take: 2,
  });
  let suggestions = different;
  if (suggestions.length < 2) {
    const same = await prisma.product.findMany({
      where: { ...base, id: { notIn: [product.id, ...different.map((p) => p.id)] } },
      orderBy: { createdAt: "desc" },
      take: 2 - suggestions.length,
    });
    suggestions = [...suggestions, ...same];
  }

  const faqs = normalizeFaqs(product.faqs);

  const toDTO = (p: typeof product): ProductDTO => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    description: p.description,
    category: p.category,
    categoryId: p.categoryId,
    notes: p.notes,
    price: Number(p.price),
    currency: p.currency,
    images: publicImages(p.id, p.images),
    visible: p.visible,
    stock: p.stock,
    duration: p.duration,
    occasion: p.occasion,
    gender: p.gender,
    faqs: normalizeFaqs(p.faqs),
  });

  // JSON-LD: ficha del producto + preguntas frecuentes. Es lo que hace que
  // Google pueda mostrar el precio, la disponibilidad y las preguntas en los
  // resultados de búsqueda.
  const siteBase = (await getSiteUrl()) || "";
  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: { "@type": "Brand", name: product.brand },
    description: product.description,
    category: product.category,
    ...(product.images.length
      ? { image: absoluteImages(product.id, product.images, siteBase || undefined) }
      : {}),
    ...(siteBase ? { url: `${siteBase}/producto/${product.id}` } : {}),
    offers: {
      "@type": "Offer",
      price: Number(product.price),
      priceCurrency: product.currency,
      availability:
        product.stock === null || product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      ...(siteBase ? { url: `${siteBase}/producto/${product.id}` } : {}),
    },
  };

  const faqLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      <ProductDetail
        product={toDTO(product)}
        suggestions={suggestions.map(toDTO)}
        initialSaved={saved}
        signedIn={Boolean(user)}
      />
    </>
  );
}
