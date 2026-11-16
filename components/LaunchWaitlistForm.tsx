"use client";

import { useState } from "react";
import { Megaphone, CheckCircle, WhatsappLogo, EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";

/**
 * Lista de espera de lanzamientos.
 *
 * Aparece en la portada: quien deja su contacto se entera PRIMERO cuando llega
 * una novedad al catálogo. Se guarda en el servidor y aparece en el panel.
 */
export function LaunchWaitlistForm({
  whatsapp,
  brand,
}: {
  whatsapp: string;
  brand: string;
}) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [interest, setInterest] = useState("general");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");

  const isEmail = contact.includes("@");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) {
      setError("Dejá un correo o un WhatsApp para poder avisarte.");
      setState("error");
      return;
    }
    setState("busy");
    setError("");
    try {
      const res = await fetch("/api/launch-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: isEmail ? contact.trim() : "",
          phone: isEmail ? "" : contact.replace(/[^\d+]/g, ""),
          interest,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No pudimos anotarte. Probá de nuevo.");
        setState("error");
        return;
      }
      setState("done");
    } catch {
      setError("No pudimos anotarte. Revisá tu conexión.");
      setState("error");
    }
  }

  return (
    <section id="novedades" className="mx-auto mt-20 w-full max-w-4xl px-4 sm:px-6">
      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <div className="border-b border-line bg-primary/5 px-6 py-5 sm:px-8">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <Megaphone size={14} weight="duotone" /> Novedades
          </span>
          <h2 className="mt-2 font-display text-h2 text-ink">Enterate primero</h2>
          <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-muted">
            Dejanos tu WhatsApp o correo y te avisamos antes que a nadie cuando llegue una
            fragancia nueva a {brand}.
          </p>
        </div>

        {state === "done" ? (
          <div className="flex items-start gap-3 px-6 py-6 sm:px-8">
            <CheckCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-ink">¡Listo! Ya estás en la lista.</p>
              <p className="mt-1 text-sm text-muted">
                Te escribimos a {contact} cuando llegue lo nuevo. Nada de spam: solo
                novedades reales.
              </p>
              <a
                href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(
                  "Hola, me anoté para las novedades. ¿Qué está por llegar?",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              >
                <WhatsappLogo size={15} /> Preguntar por WhatsApp
              </a>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-3 px-6 py-6 sm:grid-cols-2 sm:px-8">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Tu nombre (opcional)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                placeholder="Cómo te llamás"
                className="w-full rounded-control border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-primary"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                WhatsApp o correo
              </span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  {isEmail ? <EnvelopeSimple size={15} /> : <WhatsappLogo size={15} />}
                </span>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={160}
                  placeholder="Ej. 5355555555 o tu@correo.com"
                  className="w-full rounded-control border border-line bg-bg py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/60 focus:border-primary"
                />
              </div>
            </label>

            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted">
                ¿Qué te interesa más?
              </span>
              <select
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                className="w-full rounded-control border border-line bg-bg px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-primary"
              >
                <option value="general">Cualquier novedad</option>
                <option value="Amaderado">Amaderados</option>
                <option value="Floral">Florales</option>
                <option value="Fresco">Frescos</option>
                <option value="Oriental">Orientales / dulces</option>
                <option value="Clásico">Clásicos</option>
                <option value="ofertas">Ofertas y rebajas</option>
              </select>
            </label>

            {state === "error" && (
              <p className="text-sm text-danger sm:col-span-2">{error}</p>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={state === "busy"}
                className="w-full rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
              >
                {state === "busy" ? "Anotándote…" : "Quiero enterarme primero"}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
