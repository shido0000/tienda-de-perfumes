/**
 * prisma/seed.ts — DESACTIVADO A PROPÓSITO.
 *
 * La base de datos de PRODUCCIÓN es la única fuente de verdad: ya tiene el
 * catálogo real, las cuentas, los gestores y las reservas. Cargar datos de
 * ejemplo duplicaría o pisaría información real, así que este archivo NO
 * escribe absolutamente nada, nunca.
 *
 * Se conserva sólo como punto de entrada para que `prisma db seed` (o cualquier
 * comando que lo invoque) termine sin tocar la base. El catálogo y la
 * configuración se administran desde el panel en /admin.
 */
async function main() {
  console.log(
    "Seed desactivado: la tienda usa la base de producción y no se cargan datos de ejemplo.\n" +
      "Cargá el catálogo y la configuración desde Administración en /admin.",
  );
}

main()
  .then(() => {
    // Sin conexión a la base: nada que cerrar.
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(0);
  });
