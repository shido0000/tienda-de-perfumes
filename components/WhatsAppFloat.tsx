"use client";

import { WhatsappLogo } from "@phosphor-icons/react/dist/ssr";

export function WhatsAppFloat({
  whatsapp,
  brand,
}: {
  whatsapp: string;
  brand: string;
}) {
  const href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(
    `Hola ${brand}, quería consultar por un producto.`,
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp a la tienda"
      className="fixed bottom-[4.75rem] right-5 z-[55] flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-surface text-primary shadow-theme transition-transform duration-200 ease-theme hover:scale-105 hover:bg-primary hover:text-on-primary"
    >
      <WhatsappLogo size={22} weight="duotone" />
    </a>
  );
}
