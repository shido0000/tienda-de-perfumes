"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FloppyDisk, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { PasswordField } from "@/components/ui/PasswordField";

/**
 * El cliente edita su nombre, su teléfono de contacto y su contraseña.
 * El email no se cambia desde acá: es el identificador de la cuenta.
 */
export function AccountProfile({
  initial,
}: {
  initial: { name: string | null; email: string; phone: string | null };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial.name ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setOk(null);
    setError(null);

    if (!name.trim()) {
      setError("Escribí tu nombre.");
      setBusy(false);
      return;
    }
    if (newPassword && !currentPassword) {
      setError("Para cambiar la contraseña escribí la actual.");
      setBusy(false);
      return;
    }

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        phone: phone.trim(),
        ...(newPassword ? { currentPassword, newPassword } : {}),
      }),
    }).catch(() => null);
    setBusy(false);

    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setError(d?.error ?? "No pudimos guardar los cambios.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setOk("Tus datos se guardaron.");
    router.refresh();
  };

  const inputClass =
    "mt-1.5 w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <form onSubmit={submit} className="max-w-xl space-y-6">
      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Mis datos</h2>
        <p className="mt-1 text-xs text-muted">
          El teléfono nos permite contactarte por una reserva o coordinar la entrega.
        </p>

        <label className="mt-4 block">
          <span className="text-xs uppercase tracking-[0.14em] text-muted">Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>

        <label className="mt-4 block">
          <span className="text-xs uppercase tracking-[0.14em] text-muted">
            Teléfono de contacto
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+53 5000 0000"
            inputMode="tel"
            className={inputClass}
          />
        </label>

        <label className="mt-4 block">
          <span className="text-xs uppercase tracking-[0.14em] text-muted">Email de la cuenta</span>
          <input
            value={initial.email}
            readOnly
            disabled
            className={`${inputClass} cursor-not-allowed opacity-60`}
          />
        </label>
      </section>

      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Cambiar contraseña</h2>
        <p className="mt-1 text-xs text-muted">Dejalo vacío si no querés cambiarla ahora.</p>

        <PasswordField
          id="current-password"
          label="Contraseña actual"
          value={currentPassword}
          onChange={setCurrentPassword}
          autoComplete="current-password"
          className={inputClass}
        />

        <PasswordField
          id="new-password"
          label="Contraseña nueva"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
          minLength={6}
          hint="Mínimo 6 caracteres."
          className={inputClass}
        />
      </section>

      {ok && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-control border border-success/40 bg-success/10 px-3 py-2 text-sm text-success"
        >
          <CheckCircle size={16} weight="fill" /> {ok}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-control border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="flex items-center gap-2 rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <FloppyDisk size={16} /> {busy ? "Guardando…" : "Guardar cambios"}
      </button>
    </form>
  );
}
