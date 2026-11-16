"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChatCircleDots, X, PaperPlaneRight, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { useSettings } from "@/lib/settings-context";

type ChatProduct = { id: string; name: string; brand: string; price: string; image: string | null };

type Msg = {
  id: number;
  from: "user" | "bot";
  text: string;
  products?: ChatProduct[];
  suggestions?: string[];
  whatsapp?: string;
};

const WELCOME: Msg = {
  id: 0,
  from: "bot",
  text: "¡Hola! Soy el asistente de la tienda. Puedo ayudarte a encontrar una fragancia, explicarte cómo reservar, calcular el envío o contarte las formas de pago.",
  suggestions: ["¿Qué perfumes tienen?", "¿Cuánto cuesta el envío?", "¿Cómo reservo?"],
};

/**
 * Chat de ayuda flotante. Responde con datos reales del catálogo desde
 * /api/chat y siempre deja a mano el WhatsApp de la tienda para hablar con una
 * persona.
 */
export function ChatWidget() {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const inflight = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, open, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    setInput("");
    setMessages((m) => [...m, { id: nextId.current++, from: "user", text }]);
    setBusy(true);
    // Si el cliente vuelve a escribir, la respuesta anterior ya no sirve: se
    // cancela para que un mensaje lento no pise la respuesta del nuevo.
    inflight.current?.abort();
    const ctrl = new AbortController();
    inflight.current = ctrl;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          message: text,
          // Las últimas conversaciones le dan contexto al modelo: así una
          // pregunta de seguimiento ("¿y ese cuánto sale?") se entiende.
          history: messages
            .filter((m) => m.from !== "bot" || m.text)
            .slice(-6)
            .map((m) => ({
              role: m.from === "user" ? "user" : "assistant",
              content: m.text,
            })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((m) => [
        ...m,
        {
          id: nextId.current++,
          from: "bot",
          text:
            data?.reply ??
            "No pude responder en este momento. Escribinos por WhatsApp y te ayudamos enseguida.",
          products: data?.products,
          suggestions: data?.suggestions,
          whatsapp: data?.whatsapp,
        },
      ]);
    } catch {
      if (ctrl.signal.aborted) return;
      setMessages((m) => [
        ...m,
        {
          id: nextId.current++,
          from: "bot",
          text: "Hubo un problema de conexión. Probá de nuevo o escribinos por WhatsApp.",
        },
      ]);
    } finally {
      if (inflight.current === ctrl) {
        inflight.current = null;
        setBusy(false);
      }
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar el asistente" : "Abrir el asistente de la tienda"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-theme transition-transform duration-200 ease-theme hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {open ? <X size={22} /> : <ChatCircleDots size={24} weight="duotone" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Asistente de la tienda"
          className="fixed bottom-20 right-4 z-[60] flex max-h-[min(32rem,75vh)] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-lg"
        >
          <header className="flex items-center justify-between gap-2 border-b border-line bg-bg/60 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{settings.brand}</p>
              <p className="text-[11px] text-muted">Asistente · responde al instante</p>
            </div>
            <a
              href={`https://wa.me/${settings.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Hablar con una persona por WhatsApp"
              className="rounded-control p-2 text-primary transition-colors hover:bg-primary/10"
            >
              <WhatsappLogo size={18} />
            </a>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div key={m.id} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.from === "user"
                      ? "max-w-[85%] rounded-card rounded-br-sm bg-primary px-3 py-2 text-sm text-on-primary"
                      : "max-w-[90%] rounded-card rounded-bl-sm border border-line bg-bg px-3 py-2 text-sm text-ink"
                  }
                >
                  <p className="whitespace-pre-line leading-relaxed">{m.text}</p>

                  {m.products && m.products.length > 0 && (
                    <ul className="mt-2 space-y-1.5">
                      {m.products.map((p) => (
                        <li key={p.id}>
                          <Link
                            href={`/producto/${p.id}`}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 rounded-control border border-line bg-surface p-1.5 transition-colors hover:border-primary"
                          >
                            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-control bg-bg">
                              {p.image ? (
                                <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />
                              ) : null}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-medium text-ink">{p.name}</span>
                              <span className="block truncate text-[11px] text-muted">{p.brand}</span>
                            </span>
                            <span className="shrink-0 text-xs tabular-nums text-ink">{p.price}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}

                  {m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.suggestions.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => send(s)}
                          className="rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-primary hover:text-primary"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}

                  {m.whatsapp && m.from === "bot" && (
                    <a
                      href={m.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      <WhatsappLogo size={13} /> Hablar con una persona
                    </a>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-card rounded-bl-sm border border-line bg-bg px-3 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-center gap-2 border-t border-line px-3 py-2.5"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribí tu consulta…"
              aria-label="Mensaje para el asistente"
              maxLength={500}
              className="min-w-0 flex-1 rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-primary focus-visible:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Enviar mensaje"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary text-on-primary transition-colors hover:bg-accent disabled:opacity-40"
            >
              <PaperPlaneRight size={17} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
