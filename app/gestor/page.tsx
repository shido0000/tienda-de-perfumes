import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ManagerPanel } from "@/components/gestor/ManagerPanel";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mi panel de gestor" };

export default async function GestorPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fgestor");

  if (user.role !== "GESTOR") {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-24 text-center sm:px-6">
        <div className="rounded-card border border-line bg-surface p-8 shadow-md">
          <h1 className="text-h2">Esta sección es para gestores</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Iniciaste sesión como <strong className="text-ink">{user.email}</strong>, pero esa
            cuenta no es de gestor. Si compartís un enlace de la tienda y querés ver tus
            ganancias, pedile al dueño que te active como gestor.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-accent"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <ManagerPanel />
    </div>
  );
}
