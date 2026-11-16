"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react/dist/ssr";

const THEME_KEY = "mistmood_theme";

/**
 * Alterna entre tema claro y oscuro.
 * El tema se aplica en <html class="dark"> y se guarda en localStorage.
 * El script inline de app/layout.tsx aplica la clase antes del primer paint
 * para que no haya parpadeo al cargar.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Re-aplica la preferencia guardada: cubre el caso en que el script inline
    // del layout no llegue a ejecutarse (por ejemplo tras una hidratación).
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(THEME_KEY);
    } catch {
      /* almacenamiento no disponible */
    }
    const prefersDark =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark =
      document.documentElement.classList.contains("dark") ||
      (saved ? saved === "dark" : prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
    setTheme(isDark ? "dark" : "light");
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* almacenamiento no disponible */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Activar tema claro" : "Activar tema oscuro"}
      aria-pressed={theme === "dark"}
      title={theme === "dark" ? "Tema claro" : "Tema oscuro"}
      className={`rounded-control p-2 text-muted transition-colors duration-200 ease-theme hover:text-primary ${className}`}
    >
      {mounted && theme === "dark" ? (
        <Sun size={20} weight="duotone" />
      ) : (
        <Moon size={20} weight="duotone" />
      )}
    </button>
  );
}
