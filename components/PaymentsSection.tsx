/**
 * Payment block separated from the rest by a vertical hairline (the design's
 * signature rule). Amounts and bank data come from settings, never typed twice.
 */
export function PaymentsSection({
  bankDetails,
  storeAddress,
  whatsapp,
  whatsappDisplay,
  title,
  intro,
  transferTitle,
  transferIntro,
  cashTitle,
  cashIntro,
  whatsappCta,
}: {
  bankDetails: string;
  storeAddress: string;
  whatsapp: string;
  whatsappDisplay: string;
  title?: string;
  intro?: string;
  transferTitle?: string;
  transferIntro?: string;
  cashTitle?: string;
  cashIntro?: string;
  whatsappCta?: string;
}) {
  const waHref = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
    "Hola, quiero enviar el comprobante de una sección de pagos.",
  )}`;

  return (
    <section className="mx-auto mt-24 w-full max-w-6xl px-4 sm:px-6">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <h2 className="text-h2">{title?.trim() || "Formas de pago"}</h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            {intro?.trim() ||
              "No cobramos online. Al confirmar la reserva, la tienda recibe tu pedido y te escribe para arreglar el pago y la entrega."}
          </p>
        </div>

        <div className="hairline grid gap-8 pl-6 sm:grid-cols-2 sm:pl-8">
          <div>
            <h3 className="text-h3">{transferTitle?.trim() || "Transferencia"}</h3>
            <p className="mt-2 text-sm text-muted">
              {transferIntro?.trim() ||
                "Transferí a estos datos y mandanos el comprobante."}
            </p>
            <pre className="mt-3 whitespace-pre-wrap rounded-control border border-line bg-surface p-3 font-body text-[13px] leading-relaxed text-ink">
              {bankDetails}
            </pre>
          </div>

          <div>
            <h3 className="text-h3">{cashTitle?.trim() || "Efectivo"}</h3>
            <p className="mt-2 text-sm text-muted">
              {cashIntro?.trim() ||
                "Pagás cuando retirás en tienda o al recibir el envío. Coordinamos por WhatsApp."}
            </p>
            <p className="mt-3 text-sm text-ink">{storeAddress}</p>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-control border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary"
            >
              {whatsappCta?.trim() || "Coordinar por WhatsApp"} {whatsappDisplay}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
