/**
 * Estado de carga a nivel de ruta: Next lo muestra mientras el servidor
 * prepara la página pedida (las que leen la base de datos tardan un instante).
 * Es un esqueleto con la forma del contenido, no un spinner suelto.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="h-3 w-24 rounded-full bg-line/70 skeleton" />
      <div className="mt-4 h-9 w-2/3 max-w-md rounded-control bg-line/70 skeleton" />
      <div className="mt-3 h-4 w-1/2 max-w-sm rounded-full bg-line/60 skeleton" />

      <div className="mt-12 grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-card border border-line bg-surface p-3">
            <div className="aspect-[4/5] w-full rounded-[12px] bg-line/60 skeleton" />
            <div className="mt-4 space-y-2 px-1.5">
              <div className="h-2.5 w-16 rounded-full bg-line/60 skeleton" />
              <div className="h-5 w-3/4 rounded-full bg-line/70 skeleton" />
              <div className="h-4 w-full rounded-full bg-line/50 skeleton" />
              <div className="mt-3 h-9 w-full rounded-control bg-line/60 skeleton" />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-muted">Cargando el catálogo…</p>
    </div>
  );
}
