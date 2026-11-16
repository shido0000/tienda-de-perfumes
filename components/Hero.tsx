import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { cleanEditableText } from "@/lib/editable-text";
import { SafeImage } from "@/components/SafeImage";

/**
 * Hero: una sola declaración focal, un halo cálido detrás de la botella
 * destacada y el sello de la casa como firma. Sin resaltar palabras dentro del
 * titular: el acento vive en el sello, el halo y el botón.
 */

const DEFAULT_TITLE = "Fragancias elegidas una por una.";
const DEFAULT_SUBTITLE =
  "Armá tu pedido, reservalo y pasá a buscarlo a la tienda o coordiná el envío por kilómetro. Los precios se muestran en pesos cubanos (CUP) y el envío se calcula según la distancia.";

export function Hero({
  brand,
  tagline,
  storeAddress,
  heroImage,
  heroName,
  title,
  subtitle,
  ctaLabel,
  cartCta = "Revisar mi carrito",
  pickupLabel = "Retiro",
  pickupValue = "Sin costo",
  shippingLabel = "Envío",
  shippingValue = "Por kilómetro",
  paymentLabel = "Pago",
  paymentValue = "Efectivo o transferencia",
  imageAlt,
}: {
  brand: string;
  tagline: string;
  storeAddress: string;
  heroImage: string | null;
  heroName: string | null;
  /** Textos editables desde Administración → Contenido. */
  title?: string;
  subtitle?: string;
  /** Rótulo del botón principal (editable en Administración → Textos). */
  ctaLabel?: string;
  cartCta?: string;
  pickupLabel?: string;
  pickupValue?: string;
  shippingLabel?: string;
  shippingValue?: string;
  paymentLabel?: string;
  paymentValue?: string;
  imageAlt?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-line">
      {/* capas de fondo: gradiente suave + retícula muy tenue */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgb(var(--color-accent) / 0.10), transparent 55%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(var(--color-ink)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-ink)) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(70% 60% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(70% 60% at 50% 0%, black, transparent 75%)",
        }}
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:py-24">
        <div className="reveal">
          <h1 className="text-display text-ink">
            {cleanEditableText(title, DEFAULT_TITLE)}
          </h1>

          <div className="brass-rule mt-7 w-24" />

          <p className="mt-6 max-w-md text-base leading-relaxed text-muted">
            {cleanEditableText(subtitle, DEFAULT_SUBTITLE)}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/#catalogo"
              className="btn-sheen group inline-flex items-center gap-2 rounded-control bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-sm transition-all duration-300 ease-theme hover:-translate-y-0.5 hover:bg-accent hover:shadow-md"
            >
              {ctaLabel?.trim() || "Ver el catálogo"}
              <ArrowRight
                size={16}
                weight="duotone"
                className="transition-transform duration-300 ease-theme group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href="/carrito"
              className="rounded-control border border-line bg-surface/70 px-5 py-2.5 text-sm font-semibold text-ink backdrop-blur transition-all duration-300 ease-theme hover:-translate-y-0.5 hover:border-primary hover:text-primary"
            >
              {cartCta}
            </Link>
          </div>

          <dl className="mt-11 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">{pickupLabel}</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">{pickupValue}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">{shippingLabel}</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">{shippingValue}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted">{paymentLabel}</dt>
              <dd className="mt-1 text-sm font-semibold text-ink">{paymentValue}</dd>
            </div>
          </dl>
        </div>

        <div className="relative mx-auto flex w-full max-w-sm items-center justify-center">
          <div aria-hidden className="halo absolute inset-0 rounded-full" />
          <div className="reveal relative w-full">
            {heroImage ? (
              <SafeImage
                src={heroImage}
                alt={imageAlt?.trim() || (heroName ? `${heroName} — ${brand}` : brand)}
                className="mx-auto aspect-[3/4] w-full max-w-[320px] rounded-card object-cover shadow-theme ring-1 ring-line/60"
              />
            ) : (
              <div className="mx-auto flex aspect-[3/4] w-full max-w-[320px] items-center justify-center rounded-card border border-line bg-surface font-display text-2xl text-muted shadow-theme">
                {brand}
              </div>
            )}
            {heroName && (
              <p className="glass-panel float-slow mx-auto mt-[-1.25rem] w-max rounded-full px-4 py-2 text-center font-display text-sm font-semibold text-ink shadow-md">
                {heroName}
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="relative mx-auto w-full max-w-6xl px-4 pb-6 text-[11px] uppercase tracking-[0.18em] text-muted sm:px-6">
        Retiro en {storeAddress}
      </p>
    </section>
  );
}
