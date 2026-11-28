import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { AccountProfile } from "@/components/AccountProfile";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=%2Fmi-cuenta%2Fperfil");

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, phone: true, passwordSet: true },
  });
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <Link href="/mi-cuenta" className="text-xs text-muted hover:text-primary">
        ← Volver a mi cuenta
      </Link>
      <h1 className="mt-3 text-h2">Mi perfil</h1>
      <p className="mt-2 mb-8 text-sm text-muted">
        Actualizá tu nombre y teléfono, o cambiá tu contraseña.
      </p>
      <AccountProfile initial={profile} />
    </div>
  );
}
