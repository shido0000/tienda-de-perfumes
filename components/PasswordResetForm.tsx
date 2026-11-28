"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/ui/PasswordField";

export function PasswordResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("El link no es válido.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos cambiar la contraseña.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-0 sm:py-20">
      <div className="rounded-card border border-line bg-surface p-6 shadow-md sm:p-8">
        <span className="brand-tag">Recuperación</span>
        <h1 className="mt-4 text-h2">Nueva contraseña</h1>

        {done ? (
          <>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Tu contraseña se actualizó. Ya podés entrar con ella.
            </p>
            <Link
              href="/login"
              className="btn-sheen mt-6 inline-flex w-full items-center justify-center rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-accent"
            >
              Ir a ingresar
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <p className="text-sm leading-relaxed text-muted">
              Elegí una contraseña nueva de al menos 8 caracteres.
            </p>
            <PasswordField
              id="new-password"
              label="Contraseña nueva"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
              minLength={8}
              hint="Mínimo 8 caracteres."
              className="mt-1.5 w-full rounded-control border border-line bg-bg px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            {error && (
              <p
                role="alert"
                className="rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !token}
              aria-busy={busy}
              className="btn-sheen inline-flex w-full items-center justify-center rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-accent disabled:opacity-70"
            >
              {busy ? "Guardando…" : "Guardar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
