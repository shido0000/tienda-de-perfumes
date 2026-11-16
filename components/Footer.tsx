import Link from "next/link";
import type { StoreSettings } from "@/lib/cart-context";
import { InstallButton } from "@/components/InstallButton";
import { resolveSiteTexts } from "@/lib/site-texts";

/**
 * Footer. Every fact here comes from StoreSettings so the address the customer
 * reads is the same one the checkout and the map use. Labels come from the
 * owner-editable site texts (Administración → Textos).
 */
export function Footer({ settings }: { settings: StoreSettings }) {
  const t = resolveSiteTexts(settings.siteTexts);
  const waHref = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
    `Hola ${settings.brand}, quería consultar por un producto.`,
  )}`;

  return (
    <footer className="mt-24 border-t border-line bg-surface/40">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-xl text-ink">{settings.brand}</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted">{t.footerAbout}</p>
          <address className="mt-5 text-sm not-italic font-semibold text-ink">
            {settings.storeAddress}
          </address>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{t.footerStoreHeading}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/" className="text-ink transition-colors hover:text-primary">
                {t.navCatalog}
              </Link>
            </li>
            <li>
              <Link href="/carrito" className="text-ink transition-colors hover:text-primary">
                Carrito
              </Link>
            </li>
            <li>
              <Link href="/ofertas" className="text-ink transition-colors hover:text-primary">
                {t.navOffers}
              </Link>
            </li>
            <li>
              <Link href="/rebajas" className="text-ink transition-colors hover:text-primary">
                {t.navSale}
              </Link>
            </li>
            <li>
              <Link href="/encuentra-tu-aroma" className="text-ink transition-colors hover:text-primary">
                {t.navQuiz}
              </Link>
            </li>
            <li>
              <Link href="/mis-reservas" className="text-ink transition-colors hover:text-primary">
                {t.navReservations}
              </Link>
            </li>
            <li>
              <Link href="/mi-cuenta" className="text-ink transition-colors hover:text-primary">
                {t.navAccount}
              </Link>
            </li>
            <li>
              <Link href="/mi-cuenta/perfil" className="text-ink transition-colors hover:text-primary">
                {t.navProfile}
              </Link>
            </li>
            <li>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink transition-colors hover:text-primary"
              >
                {t.footerWhatsappLabel} {settings.whatsappDisplay}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{t.footerLegalHeading}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/legal/terminos" className="text-ink transition-colors hover:text-primary">
                {t.footerLinkTerms}
              </Link>
            </li>
            <li>
              <Link href="/legal/reservas-pagos" className="text-ink transition-colors hover:text-primary">
                {t.footerLinkReservations}
              </Link>
            </li>
            <li>
              <Link href="/legal/privacidad" className="text-ink transition-colors hover:text-primary">
                {t.footerLinkPrivacy}
              </Link>
            </li>
            <li>
              <Link href="/legal/cookies" className="text-ink transition-colors hover:text-primary">
                {t.footerLinkCookies}
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} {settings.brand}. Todos los derechos
            reservados.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <InstallButton />
            <p>Las reservas quedan pendientes de confirmación manual por la tienda.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
