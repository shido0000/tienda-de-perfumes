"use client";

import Link from "next/link";
import { useState } from "react";

export function PasswordResetRequestForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-0 sm:py-20">
      <div className="rounded-card border border-line bg-surface p-6 shadow-md sm:p-8">
        <span className="brand-tag">Recuperación</span>
        <h1 className="mt-4 text-h2">Olvidé mi contraseña</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Ingresá el email de tu cuenta y te enviaremos un link para crear una
          contraseña nueva. El link vence en 30 minutos.
        </p>

        {sent ? (
          <div className="mt-7 rounded-control border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            Si existe una cuenta con ese email, enviamos un link a {email}.
            Revisá también tu carpeta de spam.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7 space-y-4">
            <label htmlFor="email" className="block text-xs uppercase tracking-[0.14em] text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="mt-1.5 w-full rounded-control border border-line bg-bg px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            />
            <button
              type="submit"
              disabled={busy}
              aria-busy={busy}
              className="btn-sheen inline-flex w-full items-center justify-center rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-accent disabled:opacity-70"
            >
              {busy ? "Enviando…" : "Enviar link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-sm text-muted">
          <Link href="/login" className="text-primary underline decoration-primary/40 underline-offset-4">
            Volver a ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
