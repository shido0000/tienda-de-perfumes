import Link from "next/link";

export const metadata = { title: "Sin conexión — Mist & Mood" };

/** Página que muestra el service worker cuando el móvil se queda sin datos. */
export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Sin conexión</p>
      <h1 className="mt-4 text-h2 text-ink">No pudimos cargar la página</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Parece que se cortó internet. Tus productos y reservas siguen guardados: cuando vuelvas a
        tener señal, recargá y todo aparece igual.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
      >
        Reintentar
      </Link>
    </div>
  );
}
