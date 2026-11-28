import Link from "next/link";
import { prisma } from "@/lib/db";
import { ensureReady } from "@/lib/bootstrap";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/session";
import { publicImages } from "@/lib/image-url";
import { DEFAULT_SITE_TEXTS } from "@/lib/site-texts";
import { CatalogGrid } from "@/components/CatalogGrid";
import { Hero } from "@/components/Hero";
import { PaymentsSection } from "@/components/PaymentsSection";
import { OffersSection } from "@/components/OffersSection";
import { SaleSection } from "@/components/SaleSection";
import { BannerStrip } from "@/components/BannerStrip";
import { InstallCta } from "@/components/InstallCta";
import { ReviewsShowcase } from "@/components/ReviewsShowcase";
import { LaunchWaitlistForm } from "@/components/LaunchWaitlistForm";
import { getRefManager, withManagerPrice, type ManagerInfo } from "@/lib/manager";
import type { BannerDTO, ProductDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadCatalog(manager: ManagerInfo | null): Promise<ProductDTO[]> {
  try {
    const products = await prisma.product.findMany({
      where: { visible: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        brand: true,
        description: true,
        category: true,
        categoryId: true,
        notes: true,
        gender: true,
        price: true,
        compareAtPrice: true,
        currency: true,
        images: true,
        visible: true,
        stock: true,
      },
    });
    return products.map<ProductDTO>((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      description: p.description,
      category: p.category,
      categoryId: p.categoryId,
      notes: p.notes,
      gender: p.gender,
      price: Number(p.price),
      compareAtPrice: p.compareAtPrice === null ? null : Number(p.compareAtPrice),
      currency: p.currency,
      // La tarjeta solo muestra la primera foto: la servimos por /api/img para
      // que el navegador la cachee y el HTML no cargue megabytes en base64.
      images: publicImages(p.id, p.images).slice(0, 1),
      visible: p.visible,
      stock: p.stock,
    }))
    // Con un enlace de gestor, el catálogo se muestra con su recargo.
    .map((p) => withManagerPrice(p, manager));
  } catch (error) {
    // Base fría (deploy nuevo, seed sin correr): mostramos estado vacío.
    console.error("[home] no se pudo leer el catálogo:", (error as Error).message);
    return [];
  }
}

export default async function HomePage() {
  await ensureReady();
  const now = new Date();
  const manager = await getRefManager().catch(() => null);
  const [products, settings, user, categoryRows, homeBanners] = await Promise.all([
    loadCatalog(manager),
    getSettings(),
    getCurrentUser().catch(() => null),
    prisma.category
      .findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] })
      .catch(() => []),
    prisma.banner
      .findMany({
        where: {
          visible: true,
          placement: { in: ["HOME", "BOTH"] },
          OR: [{ endsAt: null }, { endsAt: { gt: now } }],
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      })
      .catch(() => []),
  ]);

  const wishlistIds = user
    ? await prisma.wishlistItem
        .findMany({ where: { userId: user.id }, select: { productId: true } })
        .then((rows) => rows.map((w) => w.productId))
        .catch(() => [])
    : [];

  // Las categorías administrables son las que ofrecen los filtros del catálogo.
  const categories = categoryRows.length
    ? categoryRows.map((c) => c.name)
    : [...new Set(products.map((p) => p.category))].sort();
  const featuredProducts = products.slice(0, 5).map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    image: p.images[0] ?? null,
  }));
  const t = settings.siteTexts ?? DEFAULT_SITE_TEXTS;

  return (
    <div className="pb-8">
      <Hero
        brand={settings.brand}
        tagline={settings.tagline}
        storeAddress={settings.storeAddress}
        featuredProducts={featuredProducts}
        title={settings.heroTitle}
        subtitle={settings.heroSubtitle}
        ctaLabel={t.heroCta}
        cartCta={t.heroCartCta}
        pickupLabel={t.heroPickupLabel}
        pickupValue={t.heroPickupValue}
        shippingLabel={t.heroShippingLabel}
        shippingValue={t.heroShippingValue}
        paymentLabel={t.heroPaymentLabel}
        paymentValue={t.heroPaymentValue}
        imageAlt={t.heroImageAlt}
      />

      <div id="catalogo" className="mt-20 scroll-mt-24">
        <CatalogGrid
          initialProducts={products}
          categories={categories}
          wishlistIds={wishlistIds}
          signedIn={Boolean(user)}
          title={t.catalogTitle}
          intro={t.catalogIntro}
        />
      </div>

      <BannerStrip banners={homeBanners as BannerDTO[]} />

      <OffersSection texts={t} />

      <SaleSection wishlistIds={wishlistIds} signedIn={Boolean(user)} texts={t} />

      <ReviewsShowcase title={t.reviewsTitle} />

      <LaunchWaitlistForm whatsapp={settings.whatsapp} brand={settings.brand} />

      <PaymentsSection
        bankDetails={settings.bankDetails}
        storeAddress={settings.storeAddress}
        whatsapp={settings.whatsapp}
        whatsappDisplay={settings.whatsappDisplay}
        title={t.paymentsTitle}
        intro={t.paymentsIntro}
        transferTitle={t.paymentsTransferTitle}
        transferIntro={t.paymentsTransferIntro}
        cashTitle={t.paymentsCashTitle}
        cashIntro={t.paymentsCashIntro}
        whatsappCta={t.paymentsWhatsappCta}
      />

      <InstallCta />

      <section className="mx-auto mt-20 w-full max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-lg text-sm leading-relaxed text-muted">
            Reservás online y la tienda confirma por WhatsApp. Los textos legales
            son una base editable: hacelos revisar por un abogado antes de
            publicar.
          </p>
          <Link
            href="/legal/terminos"
            className="text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
          >
            Leer términos y condiciones
          </Link>
        </div>
      </section>
    </div>
  );
}
