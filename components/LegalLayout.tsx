import Link from "next/link";
import { parseLegalText } from "@/lib/markdown";

/**
 * Marco de las páginas legales.
 *
 * El contenido ya no está escrito a mano en el código: llega desde los ajustes
 * de la tienda (Administración → Contenido → Textos legales), así que quien
 * administra puede corregirlo sin tocar el código. `text` es Markdown mínimo y
 * se renderiza como elementos React, nunca como HTML crudo.
 */
export function LegalLayout({
  title,
  intro,
  text,
  children,
}: {
  title: string;
  intro?: string;
  text?: string;
  children?: React.ReactNode;
}) {
  const blocks = text ? parseLegalText(text) : [];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6">
      <Link href="/" className="text-xs uppercase tracking-[0.18em] text-muted hover:text-primary">
        ← Volver al catálogo
      </Link>
      <h1 className="mt-5 text-h2 text-ink">{title}</h1>
      {intro && <p className="mt-3 text-sm leading-relaxed text-muted">{intro}</p>}

      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted">
        {blocks.map((block, i) => {
          if (block.type === "heading") {
            return (
              <h2 key={i} className="mt-8 text-h3 text-ink">
                {block.text}
              </h2>
            );
          }
          if (block.type === "list") {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag
                key={i}
                className={`space-y-1.5 pl-5 ${block.ordered ? "list-decimal" : "list-disc"}`}
              >
                {block.items.map((spans, j) => (
                  <li key={j}>
                    {spans.map((s, k) => (s.bold ? <strong key={k} className="text-ink">{s.text}</strong> : <span key={k}>{s.text}</span>))}
                  </li>
                ))}
              </Tag>
            );
          }
          return (
            <p key={i}>
              {block.spans.map((s, k) => (s.bold ? <strong key={k} className="text-ink">{s.text}</strong> : <span key={k}>{s.text}</span>))}
            </p>
          );
        })}
        {children}
      </div>

      <div className="mt-12 border-t border-line pt-6 text-xs text-muted">
        <Link href="/legal/terminos" className="hover:text-primary">Términos</Link>
        <span className="mx-2">·</span>
        <Link href="/legal/privacidad" className="hover:text-primary">Privacidad</Link>
        <span className="mx-2">·</span>
        <Link href="/legal/cookies" className="hover:text-primary">Cookies</Link>
        <span className="mx-2">·</span>
        <Link href="/legal/reservas-pagos" className="hover:text-primary">Reservas y pagos</Link>
      </div>
    </div>
  );
}
