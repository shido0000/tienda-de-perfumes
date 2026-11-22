import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { normalizeFaqs } from "@/lib/normalize-product";
import type { BannerDTO, ComboDTO, ProductDTO, ReservationDTO } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fadmin");
  // Role is checked here as well as in the middleware and every API route:
  // the page renders admin data, so it must refuse on its own.
  if (user.role !== "ADMIN") {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-24 text-center sm:px-6">
        <div className="rounded-card border border-line bg-surface p-8 shadow-md">
          <h1 className="text-h2">Tu cuenta no tiene permisos de administrador</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Iniciaste sesión como <strong className="text-ink">{user.email}</strong>, pero
            esa cuenta no administra la tienda. Salí y entrá con la cuenta de la tienda.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-accent"
              >
                Cerrar sesión e ingresar con otra cuenta
              </button>
            </form>
            <Link
              href="/"
              className="rounded-control border border-line px-4 py-2.5 text-sm text-ink transition-colors hover:border-primary hover:text-primary"
            >
              Volver al catálogo
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [productRows, reservationRows, settings, comboRows, bannerRows] = await Promise.all([
    prisma.product.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.reservation.findMany({
      include: { items: true, user: { select: { email: true, name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getSettings(),
    prisma.combo
      .findMany({
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        include: {
          items: {
            include: { product: { select: { name: true, brand: true, stock: true } } },
          },
        },
      })
      .catch(() => []),
    prisma.banner
      .findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] })
      .catch(() => []),
  ]);

  const products: ProductDTO[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    description: p.description,
    category: p.category,
    categoryId: p.categoryId,
    notes: p.notes,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice === null ? null : Number(p.compareAtPrice),
    currency: p.currency,
    costCup: p.costCup === null ? null : Number(p.costCup),
    images: p.images,
    visible: p.visible,
    stock: p.stock,
    duration: p.duration,
    occasion: p.occasion,
    faqs: normalizeFaqs(p.faqs),
  }));

  const combos: ComboDTO[] = comboRows.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    image: c.image,
    price: Number(c.price),
    compareAtPrice: c.compareAtPrice === null ? null : Number(c.compareAtPrice),
    currency: c.currency,
    visible: c.visible,
    order: c.order,
    items: c.items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      name: i.product.name,
      brand: i.product.brand,
      stock: i.product.stock,
    })),
  }));

  const banners: BannerDTO[] = bannerRows.map((b) => ({
    id: b.id,
    title: b.title,
    subtitle: b.subtitle,
    image: b.image,
    ctaLabel: b.ctaLabel,
    ctaUrl: b.ctaUrl,
    background: b.background,
    textColor: b.textColor,
    placement: b.placement as BannerDTO["placement"],
    visible: b.visible,
    order: b.order,
    endsAt: b.endsAt ? b.endsAt.toISOString() : null,
  }));

  const reservations: (ReservationDTO & {
    user: { email: string; name: string | null; phone: string | null };
  })[] = reservationRows.map((r) => ({
    id: r.id,
    code: r.code,
    currency: r.currency,
    subtotal: Number(r.subtotal),
    deliveryType: r.deliveryType,
    address: r.address,
    distanceKm: r.distanceKm,
    shippingCost: Number(r.shippingCost),
    total: Number(r.total),
    paymentMethod: r.paymentMethod,
    transferProofUrl: r.transferProofUrl,
    status: r.status,
    customerNote: r.customerNote,
    createdAt: r.createdAt.toISOString(),
    user: r.user,
    items: r.items.map((i) => ({
      id: i.id,
      name: i.name,
      brand: i.brand,
      priceOriginal: Number(i.priceOriginal),
      currencyOriginal: i.currencyOriginal,
      priceConverted: Number(i.priceConverted),
      orderCurrency: i.orderCurrency,
      quantity: i.quantity,
    })),
  }));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-h2">Panel de administración</h1>
          <p className="mt-2 text-sm text-muted">
            Sesión iniciada como {user.email} · rol administrador
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Suspense fallback={null}>
        <AdminPanel
          products={products}
          combos={combos}
          banners={banners}
          reservations={reservations}
          settings={{
            brand: settings.brand,
            tagline: settings.tagline,
            bankDetails: settings.bankDetails,
            whatsapp: settings.whatsapp,
            whatsappDisplay: settings.whatsappDisplay,
            storeAddress: settings.storeAddress,
            storeLat: settings.storeLat,
            storeLng: settings.storeLng,
            baseRate: settings.baseRate,
            perKm: settings.perKm,
            maxRadius: settings.maxRadius,
            baseCurrency: settings.baseCurrency,
            displayCurrency: settings.displayCurrency,
            showSecondCurrency: settings.showSecondCurrency,
            secondCurrency: settings.secondCurrency,
            showStock: settings.showStock,
            currencies: settings.currencies,
            notificationPhones: settings.notificationPhones,
          }}
          content={{
            logoUrl: settings.logoUrl,
            termsText: settings.termsText,
            privacyText: settings.privacyText,
            cookiesText: settings.cookiesText,
            reservationsText: settings.reservationsText,
            catalogTitle: settings.catalogTitle,
            catalogIntro: settings.catalogIntro,
            heroTitle: settings.heroTitle,
            heroSubtitle: settings.heroSubtitle,
            seoTitle: settings.seoTitle,
            seoDescription: settings.seoDescription,
            seoKeywords: settings.seoKeywords,
            siteUrl: settings.siteUrl,
            googleSiteVerification: settings.googleSiteVerification,
            siteTexts: settings.siteTexts as Record<string, string>,
          }}
        />
        </Suspense>
      </div>
    </div>
  );
}
