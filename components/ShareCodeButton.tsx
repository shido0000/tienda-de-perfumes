"use client";

import { useState } from "react";
import { WhatsappLogo, Copy, Check } from "@phosphor-icons/react/dist/ssr";

/**
 * Comparte el código de una reserva por WhatsApp (o lo copia).
 *
 * El cliente casi nunca recuerda el código; con esto puede mandarlo a la
 * tienda o a quien vaya a retirar el pedido sin escribirlo a mano. El texto
 * incluye el código y el nombre de la tienda para que del otro lado se entienda
 * de qué se trata.
 */
export function ShareCodeButton({ code, storeName }: { code: string; storeName: string }) {
  const [copied, setCopied] = useState(false);

  const message = `Hola, les comparto mi reserva en ${storeName}: ${code}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* El navegador puede bloquear el porta-papeles; el enlace de WhatsApp sigue. */
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 rounded-control bg-primary px-2.5 py-1.5 text-xs font-medium text-on-primary transition-opacity hover:opacity-90"
      >
        <WhatsappLogo size={13} /> Compartir
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copiar el código de la reserva ${code}`}
        title="Copiar el código"
        className="rounded-control border border-line p-1.5 text-muted transition-colors hover:text-primary"
      >
        {copied ? <Check size={13} weight="bold" /> : <Copy size={13} />}
      </button>
    </div>
  );
}
