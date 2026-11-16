"use client";

import { useState } from "react";
import { BellRinging, CheckCircle } from "@phosphor-icons/react/dist/ssr";

/**
 * "Avísame cuando llegue" — se muestra cuando el perfume está agotado o quedan
 * muy pocas unidades. Guarda el contacto en la lista de espera y el panel de
 * administración lo ve para escribirle en cuanto cargue stock.
 */
export function StockAlertForm({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!contact.trim()) {
      setError("Dejá tu WhatsApp o tu correo para poder avisarte.");
      return;
    }
    const isEmail = contact.includes("@");
    setBusy(true);
    try {
      const res = await fetch("/api/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          name: name.trim() || undefined,
          email: isEmail ? contact.trim() : undefined,
          phone: isEmail ? undefined : contact.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No pudimos guardar tu aviso. Intentá de nuevo.");
        return;
      }
      setDone(true);
    } catch {
      setError("No pudimos guardar tu aviso. Revisá tu conexión.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="mt-6 flex items-start gap-3 rounded-card border border-primary/30 bg-primary/5 p-4 text-sm text-ink">
        <CheckCircle size={20} weight="duotone" className="mt-0.5 shrink-0 text-primary" />
        <p>
          Listo. Te avisamos en cuanto vuelva <strong>{productName}</strong>. Tu contacto quedó
          guardado con el pedido de aviso.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-control border border-primary/40 bg-primary/5 px-5 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        <BellRinging size={17} weight="duotone" />
        Avísame cuando llegue
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 rounded-card border border-line bg-surface p-4"
      aria-label={`Avisarme cuando vuelva ${productName}`}
    >
      <p className="text-sm text-ink">
        Dejanos tu contacto y te escribimos en cuanto vuelva <strong>{productName}</strong>.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tu nombre"
          className="w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
        <input
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="WhatsApp o correo"
          inputMode="text"
          className="w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Guardando…" : "Avisarme"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-control border border-line px-4 py-2 text-sm text-muted transition-colors hover:text-ink"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
