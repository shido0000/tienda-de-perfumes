"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Bag,
  Heart,
  List,
  SignOut,
  UserCircle,
  X,
  Storefront,
} from "@phosphor-icons/react/dist/ssr";
import { useCart } from "@/lib/cart-context";
import { useSettings } from "@/lib/settings-context";
import { DEFAULT_SITE_TEXTS } from "@/lib/site-texts";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SafeImage } from "@/components/SafeImage";

type SessionUser = { id: string; email: string; name: string | null; role: string } | null;

export function Header({ user }: { user: SessionUser }) {
  const { count } = useCart();
  const { settings } = useSettings();
  const t = settings.siteTexts ?? DEFAULT_SITE_TEXTS;
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const BASE_NAV = [
    { href: "/", label: t.navCatalog },
    { href: "/encuentra-tu-aroma", label: t.navQuiz },
    { href: "/ofertas", label: t.navOffers },
    { href: "/rebajas", label: t.navSale },
    { href: "/deseos", label: t.navWishlist },
    { href: "/mis-reservas", label: t.navReservations },
  ];
  const ACCOUNT_NAV = [
    { href: "/mi-cuenta", label: t.navAccount },
    { href: "/mi-cuenta/perfil", label: t.navProfile },
  ];

  // Close the mobile drawer on navigation.
  useEffect(() => setOpen(false), [pathname]);

  const logout = async () => {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setLeaving(false);
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  const isAdmin = user?.role === "ADMIN";
  const accountHref = "/mi-cuenta";
  const NAV = user ? [...BASE_NAV, ...ACCOUNT_NAV] : BASE_NAV;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5">
          {settings.logoUrl ? (
            <SafeImage
              src={settings.logoUrl.startsWith("data:") ? "/api/logo" : settings.logoUrl}
              alt={settings.brand}
              className="h-9 w-9 object-contain transition-transform duration-300 ease-theme group-hover:-translate-y-0.5"
            />
          ) : (
            <Storefront
              size={22}
              weight="duotone"
              className="text-primary transition-transform duration-300 ease-theme group-hover:-translate-y-0.5"
            />
          )}
          <span className="whitespace-nowrap font-display text-lg tracking-tight text-ink">
            {settings.brand}
          </span>
        </Link>

        <nav className="hidden items-center gap-5 whitespace-nowrap md:flex" aria-label="Principal">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative text-sm transition-colors duration-200 ease-theme hover:text-primary after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left after:bg-primary after:transition-transform after:duration-300 after:ease-theme ${
                  active
                    ? "text-primary after:scale-x-100"
                    : "text-muted after:scale-x-0 hover:after:scale-x-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className="rounded-full border border-primary/40 px-3 py-1 text-sm text-primary transition-colors duration-200 hover:bg-primary hover:text-on-primary"
            >
              {t.navPanel}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle />

          <Link
            href="/deseos"
            aria-label="Lista de deseos"
            className="hidden rounded-control p-2 text-muted transition-colors hover:text-primary sm:block"
          >
            <Heart size={20} weight="duotone" />
          </Link>

          <Link
            href="/carrito"
            aria-label={`Carrito, ${count} ${count === 1 ? "artículo" : "artículos"}`}
            className="relative rounded-control p-2 text-muted transition-colors hover:text-primary"
          >
            <Bag size={20} weight="duotone" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-on-primary">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <Link
                href={accountHref}
                aria-label="Mi cuenta"
                className="hidden items-center gap-1.5 whitespace-nowrap rounded-control border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-primary hover:text-primary sm:flex"
              >
                <UserCircle size={16} weight="duotone" aria-hidden="true" />
                {t.navAccount}
              </Link>
              <button
                onClick={logout}
                disabled={leaving}
                aria-label="Cerrar sesión"
                className="hidden rounded-control p-2 text-muted transition-colors hover:text-primary disabled:opacity-50 sm:block"
              >
                <SignOut size={20} weight="duotone" />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="hidden items-center gap-1.5 whitespace-nowrap rounded-control border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-primary hover:text-primary sm:flex"
            >
              <UserCircle size={16} weight="duotone" />
              {t.navLogin}
            </Link>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            className="rounded-control p-2 text-ink md:hidden"
          >
            {open ? <X size={22} /> : <List size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-surface md:hidden">
          <nav className="mx-auto flex w-full max-w-6xl flex-col px-4 py-2" aria-label="Menú móvil">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="border-b border-line/60 py-3 text-sm text-ink last:border-0"
              >
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="border-b border-line/60 py-3 text-sm text-primary"
              >
                {t.navPanel} de administración
              </Link>
            )}
            {user ? (
              <button onClick={logout} className="py-3 text-left text-sm text-muted">
                {t.navLogout} ({user.email})
              </button>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="py-3 text-sm text-primary">
                {t.navLogin} / Crear cuenta
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
