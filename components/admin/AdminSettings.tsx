"use client";

import { useState } from "react";
import { Plus, Trash } from "@phosphor-icons/react/dist/ssr";
import type { Currency } from "@/lib/currency";
import { useToast } from "@/components/ui/ToastProvider";
import { StoreMapPicker } from "./StoreMapPicker";
import { RateHistory } from "./RateHistory";

type SettingsForm = {
  brand: string;
  tagline: string;
  bankDetails: string;
  whatsapp: string;
  whatsappDisplay: string;
  storeAddress: string;
  storeLat: number;
  storeLng: number;
  baseRate: number;
  perKm: number;
  maxRadius: number;
  baseCurrency: string;
  displayCurrency: string;
  showSecondCurrency: boolean;
  secondCurrency: string;
  showStock: boolean;
  notificationPhones: string[];
  currencies: Currency[];
};

export function AdminSettings({ initial }: { initial: SettingsForm }) {
  const [form, setForm] = useState<SettingsForm>(initial);
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const setCurrency = (index: number, patch: Partial<Currency>) =>
    setForm((f) => ({
      ...f,
      currencies: f.currencies.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));

  const addCurrency = () =>
    setForm((f) => ({
      ...f,
      currencies: [...f.currencies, { code: "", symbol: "", rate: 1, label: "" }],
    }));

  const removeCurrency = (index: number) =>
    setForm((f) => ({ ...f, currencies: f.currencies.filter((_, i) => i !== index) }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar la configuración.");
      const okText = "Configuración guardada. Los cambios ya se aplican en toda la tienda.";
      setStatus({ kind: "ok", text: okText });
      toast.success("Configuración guardada", okText);
    } catch (e) {
      const errText = e instanceof Error ? e.message : "Error de red";
      setStatus({ kind: "error", text: errText });
      toast.error("No se pudo guardar", errText);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-8">
      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Tienda</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Marca">
            <input value={form.brand} onChange={(e) => set("brand", e.target.value)} className={inputClass} required />
          </Field>
          <Field label="Bajada / tagline">
            <input value={form.tagline} onChange={(e) => set("tagline", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Dirección de la tienda">
            <input
              value={form.storeAddress}
              onChange={(e) => set("storeAddress", e.target.value)}
              className={inputClass}
              required
            />
          </Field>
          <Field label="WhatsApp (solo dígitos, con código de país)">
            <input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value.replace(/\D/g, ""))}
              className={inputClass}
              required
            />
          </Field>
          <Field label="WhatsApp para mostrar">
            <input
              value={form.whatsappDisplay}
              onChange={(e) => set("whatsappDisplay", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Latitud tienda">
              <input
                type="number"
                step="any"
                value={form.storeLat}
                onChange={(e) => set("storeLat", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="Longitud tienda">
              <input
                type="number"
                step="any"
                value={form.storeLng}
                onChange={(e) => set("storeLng", Number(e.target.value))}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <StoreMapPicker
              lat={form.storeLat}
              lng={form.storeLng}
              onPick={(lat, lng) => setForm((f) => ({ ...f, storeLat: Number(lat.toFixed(6)), storeLng: Number(lng.toFixed(6)) }))}
            />
          </div>
        </div>

        <Field label="Datos bancarios (se muestran en el checkout con transferencia)">
          <textarea
            value={form.bankDetails}
            onChange={(e) => set("bankDetails", e.target.value)}
            rows={5}
            className={`${inputClass} mt-1.5`}
          />
        </Field>
      </section>

      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Envío</h2>
        <p className="mt-1 text-xs text-muted">
          El costo se calcula como tarifa base + (costo por km × distancia). Fuera del radio máximo no se ofrece envío.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Field label="Tarifa base">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.baseRate}
              onChange={(e) => set("baseRate", Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Costo por km">
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.perKm}
              onChange={(e) => set("perKm", Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Radio máximo (km)">
            <input
              type="number"
              step="0.1"
              min="1"
              value={form.maxRadius}
              onChange={(e) => set("maxRadius", Number(e.target.value))}
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-card border border-line bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-h3">Monedas y tipos de cambio</h2>
            <p className="mt-1 text-xs text-muted">
              La tasa indica cuántas unidades de la moneda base vale 1 unidad de esa moneda.
            </p>
          </div>
          <button
            type="button"
            onClick={addCurrency}
            className="flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <Plus size={14} /> Agregar moneda
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {form.currencies.map((c, i) => (
            <div key={i} className="grid grid-cols-1 gap-3 rounded-control border border-line p-3 sm:grid-cols-[80px_80px_1fr_120px_auto]">
              <input
                value={c.code}
                onChange={(e) => setCurrency(i, { code: e.target.value.toUpperCase() })}
                placeholder="USD"
                aria-label="Código de moneda"
                className={inputClass}
              />
              <input
                value={c.symbol}
                onChange={(e) => setCurrency(i, { symbol: e.target.value })}
                placeholder="US$"
                aria-label="Símbolo"
                className={inputClass}
              />
              <input
                value={c.label}
                onChange={(e) => setCurrency(i, { label: e.target.value })}
                placeholder="Dólar"
                aria-label="Nombre de la moneda"
                className={inputClass}
              />
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                value={c.rate}
                onChange={(e) => setCurrency(i, { rate: Number(e.target.value) })}
                aria-label="Tasa de cambio"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeCurrency(i)}
                aria-label={`Quitar ${c.code || "moneda"}`}
                className="self-center rounded-control p-2 text-muted transition-colors hover:text-danger"
              >
                <Trash size={16} />
              </button>
            </div>
          ))}
        </div>

        <Field label="Moneda base de la tienda (los costos de envío se definen en esta moneda)">
          <select
            value={form.baseCurrency}
            onChange={(e) => set("baseCurrency", e.target.value)}
            className={`${inputClass} mt-1.5 max-w-xs`}
          >
            {form.currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Moneda en la que el cliente ve los precios">
          <p className="mt-1 text-xs text-muted">
            La elige la tienda. El visitante ya no puede cambiarla: todos los precios del
            catálogo, el carrito y el checkout se muestran en esta moneda.
          </p>
          <select
            value={form.displayCurrency}
            onChange={(e) => set("displayCurrency", e.target.value)}
            className={`${inputClass} mt-1.5 max-w-xs`}
          >
            {form.currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} — {c.label}
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-card border border-line bg-bg/60 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.showSecondCurrency}
              onChange={(e) => set("showSecondCurrency", e.target.checked)}
              className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Mostrar el precio en dos monedas
              </span>
              <span className="block text-xs text-muted">
                Si está marcado, junto al precio principal aparece el equivalente en la
                segunda moneda. Si lo desmarcás, el cliente ve solo una moneda.
              </span>
            </span>
          </label>
          <div className="mt-4 max-w-xs">
            <Field label="Segunda moneda que ve el cliente">
              <select
                value={form.secondCurrency}
                onChange={(e) => set("secondCurrency", e.target.value)}
                disabled={!form.showSecondCurrency}
                className={`${inputClass} mt-1.5 disabled:opacity-50`}
              >
                {form.currencies
                  .filter((c) => c.code !== form.displayCurrency)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.label}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
        </div>

        <div className="rounded-card border border-line bg-bg/60 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={form.showStock}
              onChange={(e) => set("showStock", e.target.checked)}
              className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Mostrar al cliente cuántas unidades hay
              </span>
              <span className="block text-xs text-muted">
                Si está marcado, el cliente ve el número exacto de unidades disponibles.
                Si lo desmarcás, solo sabe que está disponible (o que está agotado),
                nunca la cantidad.
              </span>
            </span>
          </label>
        </div>

        <RateHistory />
      </section>

      <section className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Avisos de reservas por WhatsApp</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Cada reserva nueva intenta avisar a estos números. Para que el mensaje salga
          solo se necesitan las credenciales de la API de WhatsApp de Meta en el
          servidor; si no están, la reserva igual queda registrada y podés escribirle al
          cliente desde su número en este mismo panel.
        </p>
        <div className="mt-4 space-y-2">
          {form.notificationPhones.length === 0 && (
            <p className="text-xs text-muted">Sin números: se usará el WhatsApp de la tienda.</p>
          )}
          {form.notificationPhones.map((phone, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={phone}
                onChange={(e) =>
                  set(
                    "notificationPhones",
                    form.notificationPhones.map((p, idx) =>
                      idx === i ? e.target.value.replace(/\D/g, "") : p,
                    ),
                  )
                }
                placeholder="5350000001"
                aria-label={`Número de aviso ${i + 1}`}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() =>
                  set(
                    "notificationPhones",
                    form.notificationPhones.filter((_, idx) => idx !== i),
                  )
                }
                aria-label="Quitar número"
                className="self-center rounded-control p-2 text-muted transition-colors hover:text-danger"
              >
                <Trash size={16} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("notificationPhones", [...form.notificationPhones, ""])}
            className="flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-primary hover:text-primary"
          >
            <Plus size={14} /> Agregar número
          </button>
        </div>
      </section>

      {status && (
        <p
          role="status"
          className={`rounded-control border px-3 py-2 text-sm ${
            status.kind === "ok"
              ? "border-success/40 bg-success/10 text-success"
              : "border-danger/40 bg-danger/10 text-danger"
          }`}
        >
          {status.text}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="rounded-control bg-primary px-5 py-2.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {busy ? "Guardando…" : "Guardar configuración"}
      </button>
    </form>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink transition-colors hover:border-primary/60 focus-visible:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="text-xs uppercase tracking-[0.14em] text-muted">{label}</span>
      {children}
    </label>
  );
}
