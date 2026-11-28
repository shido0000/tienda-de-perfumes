"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PasswordField } from "@/components/ui/PasswordField";
import { useSiteTexts } from "@/lib/use-site-texts";

type GoogleCredentialResponse = { credential: string };
type GoogleIdConfiguration = {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  nonce: string;
  ux_mode: "popup";
};
type GoogleButtonOptions = {
  theme: "outline";
  size: "large";
  width: number;
  text: "signin_with" | "signup_with";
};
type GoogleAccounts = {
  id: {
    initialize: (config: GoogleIdConfiguration) => void;
    renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
  };
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

function createNonce(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const t = useSiteTexts();
  const requestedNext = params.get("next") || "/";
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/";
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = (role?: string) => {
    const target = role === "GESTOR" && next === "/" ? "/gestor" : next;
    router.push(target);
    router.refresh();
  };

  const handleGoogleCredential = async (response: GoogleCredentialResponse) => {
    setBusy(true);
    setError(null);
    try {
      const nonce = sessionStorage.getItem("google-auth-nonce") ?? "";
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential, nonce }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos entrar con Google.");
      sessionStorage.removeItem("google-auth-nonce");
      finish(data?.user?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;
      const nonce = createNonce();
      sessionStorage.setItem("google-auth-nonce", nonce);
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        nonce,
        ux_mode: "popup",
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        text: mode === "register" ? "signup_with" : "signin_with",
      });
    };

    if (window.google?.accounts?.id) {
      render();
      return;
    }

    const existing = document.getElementById("google-gis") as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.id = "google-gis";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [googleClientId, mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register" ? { email, password, name, phone } : { email, password },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos completar la operación.");
      finish(data?.user?.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusy(false);
    }
  };

  const field =
    "mt-1.5 w-full rounded-control border border-line bg-bg px-3 py-2.5 text-sm text-ink transition-colors duration-200 ease-theme hover:border-primary/60 focus:border-primary focus-visible:outline-none";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16 sm:px-0 sm:py-20">
      <div className="rounded-card border border-line bg-surface p-6 shadow-md sm:p-8">
        <span className="brand-tag">{mode === "login" ? "Sesión" : "Nueva cuenta"}</span>
        <h1 className="mt-4 text-h2">{mode === "login" ? "Ingresar" : "Crear cuenta"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {mode === "login"
            ? "Entrá para ver tus reservas y tu lista de deseos."
            : "Con una cuenta guardamos tus reservas, tus favoritos y tu carrito."}
        </p>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "register" && (
            <div>
              <label htmlFor="name" className="text-xs uppercase tracking-[0.14em] text-muted">
                Nombre
              </label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className={field}
              />
            </div>
          )}

          {mode === "register" && (
            <div>
              <label htmlFor="phone" className="text-xs uppercase tracking-[0.14em] text-muted">
                Teléfono
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="+53 5000 0000"
                className={field}
              />
              <p className="mt-1.5 text-xs text-muted">
                Para avisarte por tu reserva.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="text-xs uppercase tracking-[0.14em] text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className={field}
            />
          </div>

          <PasswordField
            id="password"
            label="Contraseña"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            required
            minLength={mode === "register" ? 8 : 1}
            hint={mode === "register" ? "Mínimo 8 caracteres." : undefined}
            className={field}
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
            disabled={busy}
            aria-busy={busy}
            className="btn-sheen inline-flex w-full items-center justify-center gap-2 rounded-control bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition-colors duration-200 ease-theme hover:bg-accent disabled:opacity-70"
          >
            {busy && (
              <span
                aria-hidden
                className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary"
              />
            )}
            {busy
              ? mode === "login"
                ? "Entrando…"
                : "Creando tu cuenta…"
              : mode === "login"
                ? "Ingresar"
                : "Crear cuenta"}
          </button>
        </form>

        {googleClientId && (
          <div className="mt-6">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.14em] text-muted">
              <span className="h-px flex-1 bg-line" />
              o continuá con
              <span className="h-px flex-1 bg-line" />
            </div>
            <div ref={googleButtonRef} className="mt-4 flex justify-center" />
          </div>
        )}

        {/* Aviso flotante mientras se valida la sesión y se abre la cuenta. */}
        {busy && (
          <div
            role="status"
            aria-live="polite"
            className="fixed inset-0 z-[110] flex items-center justify-center bg-bg/70 backdrop-blur-[2px]"
          >
            <div className="flex flex-col items-center gap-3 rounded-card border border-line bg-surface px-8 py-6 shadow-lg">
              <span
                aria-hidden
                className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary"
              />
              <p className="text-sm font-medium text-ink">
                {mode === "login" ? "Iniciando sesión…" : "Creando tu cuenta…"}
              </p>
              <p className="text-xs text-muted">Verificamos tus datos, un momento.</p>
            </div>
          </div>
        )}

        <p className="mt-6 text-sm text-muted">
          {mode === "login" ? (
            <>
              ¿No tenés cuenta?{" "}
              <Link href="/registro" className="text-primary underline decoration-primary/40 underline-offset-4">
                Crear una
              </Link>
            </>
          ) : (
            <>
              ¿Ya tenés cuenta?{" "}
              <Link href="/login" className="text-primary underline decoration-primary/40 underline-offset-4">
                Ingresar
              </Link>
            </>
          )}
          {mode === "login" && (
            <span className="mt-2 block">
              <Link
                href="/recuperar"
                className="text-primary underline decoration-primary/40 underline-offset-4"
              >
                {t.authForgotPassword}
              </Link>
            </span>
          )}
        </p>
      </div>

      {mode === "login" && (
        <div className="mt-4 rounded-card border border-line bg-surface px-5 py-4 text-sm">
          <p className="font-medium text-ink">¿Administrás la tienda?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Entrá con la cuenta de administrador para editar el catálogo, ver las
            reservas y cambiar los ajustes.
          </p>
          <Link
            href="/admin"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary underline decoration-primary/40 underline-offset-4 hover:text-accent"
          >
            Ir al panel de administración
          </Link>
        </div>
      )}
    </div>
  );
}
