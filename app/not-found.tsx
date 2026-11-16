import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-28 text-center sm:px-6">
      <p className="text-xs uppercase tracking-[0.2em] text-muted">Error 404</p>
      <h1 className="mt-4 text-h2">Esta página no existe</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted">
        El producto pudo haberse ocultado o la dirección está mal escrita. Volvé
        al catálogo para seguir mirando.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
      >
        Ver el catálogo
      </Link>
    </div>
  );
}
