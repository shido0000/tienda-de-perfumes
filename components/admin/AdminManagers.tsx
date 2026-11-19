"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { formatMoney } from "@/lib/currency";
import type { Currency } from "@/lib/currency";
import {
  UserPlus,
  Link as LinkIcon,
  Copy,
  CheckCircle,
  ArrowClockwise,
  Money,
  UsersThree,
  TrendUp,
  Power,
  Trash,
  CaretDown,
} from "@phosphor-icons/react/dist/ssr";

type Manager = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  code: string | null;
  rateType: "PERCENT" | "FIXED";
  rateValue: number;
  active: boolean;
  createdAt: string;
  salesCount: number;
  salesTotal: number;
  surchargeTotal: number;
  earned: number;
  paid: number;
  pending: number;
  lastSaleAt: string | null;
};

type Sale = {
  id: string;
  code: string;
  status: string;
  total: number;
  currency: string;
  commission: number;
  surcharge: number;
  settled: boolean;
  createdAt: string;
};

type Payout = {
  id: string;
  amount: number;
  currency: string;
  note: string | null;
  createdAt: string;
};

const inputClass =
  "w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

function money(n: number, currency: Currency) {
  return formatMoney(n, currency);
}

function rateLabel(m: Pick<Manager, "rateType" | "rateValue">, currency: Currency) {
  return m.rateType === "FIXED"
    ? `${money(m.rateValue, currency)} por unidad`
    : `${m.rateValue}% sobre el precio`;
}

/**
 * GESTORES: revendedores con enlace propio.
 *
 * El administrador da de alta a la persona, define su ganancia (% o cantidad
 * fija) y le entrega un enlace. Quien entra por ese enlace ve los precios con
 * el recargo; la diferencia es la ganancia del gestor, que se acumula aquí y se
 * liquida con "Registrar pago".
 */
export function AdminManagers({
  currencies,
  prefill,
}: {
  currencies: Currency[];
  /** Correo preseleccionado al llegar desde Usuarios → «Hacer gestor». */
  prefill?: { email: string; name: string | null } | null;
}) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(Boolean(prefill?.email));
  const [openId, setOpenId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const toast = useToast();
  const currency = currencies[0];

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/managers")
      .then(async (r) => {
        if (!r.ok) throw new Error("No pudimos cargar los gestores.");
        return r.json();
      })
      .then((d) => setManagers(d.managers ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    setOrigin(window.location.origin);
  }, [load]);

  const totalEarned = managers.reduce((s, m) => s + m.earned, 0);
  const totalPaid = managers.reduce((s, m) => s + m.paid, 0);
  const totalPending = managers.reduce((s, m) => s + m.pending, 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-ink">Gestores</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Un gestor recibe un enlace propio de la tienda. Quien compre por ese enlace
          paga el precio con la ganancia del gestor sumada, y esa diferencia se acumula
          aquí hasta que la liquidás.
        </p>
      </header>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<TrendUp size={18} />}
          label="Ganado por gestores"
          value={money(totalEarned, currency)}
          hint="Comisiones de ventas no canceladas"
        />
        <StatCard
          icon={<CheckCircle size={18} />}
          label="Ya pagado"
          value={money(totalPaid, currency)}
          hint="Liquidaciones registradas"
        />
        <StatCard
          icon={<Money size={18} />}
          label="Pendiente de pago"
          value={money(totalPending, currency)}
          hint="Lo que aún se les debe"
          emphasis={totalPending > 0}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCreating((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-control bg-primary px-3 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90"
        >
          <UserPlus size={15} /> {creating ? "Cerrar" : "Nuevo gestor"}
        </button>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-ink hover:border-primary hover:text-primary"
        >
          <ArrowClockwise size={14} /> Actualizar
        </button>
      </div>

      {creating && (
        <CreateForm
          currencies={currencies}
          initialEmail={prefill?.email}
          initialName={prefill?.name ?? undefined}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Cargando gestores…</p>
      ) : managers.length === 0 ? (
        <div className="rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
          <UsersThree size={28} className="mx-auto text-muted" />
          <p className="mt-3 text-sm font-medium text-ink">Todavía no hay gestores</p>
          <p className="mt-1 text-sm text-muted">
            Creá el primero con «Nuevo gestor»: definís su ganancia y te damos su enlace
            para compartir.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {managers.map((m) => (
            <ManagerRow
              key={m.id}
              manager={m}
              currencies={currencies}
              origin={origin}
              currency={currency}
              open={openId === m.id}
              onToggle={() => setOpenId(openId === m.id ? null : m.id)}
              onChanged={load}
              onToast={toast}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`rounded-card border p-4 ${
        emphasis ? "border-primary/40 bg-primary/5" : "border-line bg-surface"
      }`}
    >
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-[0.1em] text-muted">
        <span className={emphasis ? "text-primary" : "text-muted"}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      <div className="mt-1 text-xs text-muted">{hint}</div>
    </div>
  );
}

function CreateForm({
  currencies,
  initialEmail,
  initialName,
  onCreated,
}: {
  currencies: Currency[];
  initialEmail?: string;
  initialName?: string;
  onCreated: () => void;
}) {
  const toast = useToast();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [name, setName] = useState(initialName ?? "");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [rateType, setRateType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [rateValue, setRateValue] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const value = Number(rateValue);
    if (!(value > 0)) {
      setError("Escribí una ganancia mayor que cero.");
      setBusy(false);
      return;
    }
    const res = await fetch("/api/admin/managers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        rateType,
        rateValue: value,
        password: password.trim() || undefined,
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setError(d?.error ?? "No pudimos crear el gestor.");
      return;
    }
    toast.success("Gestor creado", "Copiá su enlace y compartilo: ya suma ganancias.");
    setEmail("");
    setName("");
    setPhone("");
    setPassword("");
    setRateValue("10");
    onCreated();
  };

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-card border border-line bg-surface p-5"
    >
      <h3 className="text-sm font-semibold text-ink">Nuevo gestor</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">Correo</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="gestor@ejemplo.com"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Nombre (opcional)
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Laura Pérez"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Teléfono (opcional)
          </span>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+53 5000 0000"
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Cómo gana
          </span>
          <select
            value={rateType}
            onChange={(e) => setRateType(e.target.value as "PERCENT" | "FIXED")}
            className={inputClass}
          >
            <option value="PERCENT">Porcentaje sobre el precio</option>
            <option value="FIXED">Cantidad fija por unidad</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            {rateType === "PERCENT" ? "Ganancia (%)" : `Ganancia por unidad (${currencies[0]?.code ?? "CUP"})`}
          </span>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={rateValue}
            onChange={(e) => setRateValue(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-muted">
            Contraseña de acceso (opcional)
          </span>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Solo si el gestor va a entrar a ver sus ventas"
            className={inputClass}
          />
        </label>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        <CheckCircle size={15} /> {busy ? "Creando…" : "Crear gestor"}
      </button>
    </form>
  );
}

function ManagerRow({
  manager,
  currencies,
  origin,
  currency,
  open,
  onToggle,
  onChanged,
  onToast,
}: {
  manager: Manager;
  currencies: Currency[];
  origin: string;
  currency: Currency;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
  onToast: ReturnType<typeof useToast>;
}) {
  const [busy, setBusy] = useState(false);
  const [rateValue, setRateValue] = useState(String(manager.rateValue));
  const [rateType, setRateType] = useState(manager.rateType);
  const [phone, setPhone] = useState(manager.phone ?? "");

  useEffect(() => {
    setRateValue(String(manager.rateValue));
    setRateType(manager.rateType);
  }, [manager.rateValue, manager.rateType]);

  useEffect(() => {
    setPhone(manager.phone ?? "");
  }, [manager.phone]);

  const link = manager.code ? `${origin}/r/${manager.code}` : "";

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      onToast.success("Enlace copiado", link);
    } catch {
      onToast.error("No se pudo copiar", link);
    }
  };

  const patch = async (payload: Record<string, unknown>, msg: string) => {
    setBusy(true);
    const res = await fetch(`/api/admin/managers/${manager.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      onToast.error("No se pudo guardar", d?.error ?? "Intentá de nuevo.");
      return;
    }
    onToast.success("Guardado", msg);
    onChanged();
  };

  const remove = async () => {
    if (!window.confirm(`¿Quitar a ${manager.name ?? manager.email} como gestor? Su enlace dejará de sumar precios. Las ventas ya hechas se conservan.`)) {
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/managers/${manager.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      onToast.error("No se pudo quitar", "Intentá de nuevo.");
      return;
    }
    onToast.success("Gestor quitado", "Su enlace ya no está activo.");
    onChanged();
  };

  return (
    <div className="rounded-card border border-line bg-surface">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{manager.name || manager.email}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${
                manager.active ? "bg-primary/10 text-primary" : "bg-line/40 text-muted"
              }`}
            >
              {manager.active ? "Enlace activo" : "Inactivo"}
            </span>
            <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] text-muted">
              {rateLabel(manager, currency)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">{manager.email}</p>
          {manager.phone && (
            <p className="mt-0.5 truncate text-xs text-muted">{manager.phone}</p>
          )}
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted">Ganado</div>
            <div className="text-sm font-semibold tabular-nums text-ink">
              {money(manager.earned, currency)}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-muted">Pendiente</div>
            <div
              className={`text-sm font-semibold tabular-nums ${
                manager.pending > 0 ? "text-primary" : "text-muted"
              }`}
            >
              {money(manager.pending, currency)}
            </div>
          </div>
          <button
            onClick={onToggle}
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-control border border-line px-2.5 py-1.5 text-xs text-ink hover:border-primary hover:text-primary"
          >
            Detalle
            <CaretDown size={12} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-4 border-t border-line p-4">
          {/* Enlace */}
          <div>
            <span className="mb-1 block text-xs font-medium text-muted">
              Enlace del gestor
            </span>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-1 items-center gap-2 rounded-control border border-line bg-bg px-3 py-2">
                <LinkIcon size={14} className="shrink-0 text-muted" />
                <span className="truncate text-xs text-ink">{link || "Sin enlace"}</span>
              </div>
              <button
                onClick={copy}
                disabled={!link}
                className="inline-flex items-center justify-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-ink hover:border-primary hover:text-primary disabled:opacity-50"
              >
                <Copy size={14} /> Copiar
              </button>
            </div>
          </div>

          {/* Teléfono de contacto */}
          <div className="flex flex-wrap items-end gap-2">
            <label className="block flex-1 sm:max-w-xs">
              <span className="mb-1 block text-xs font-medium text-muted">
                Teléfono de contacto (opcional)
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+53 5000 0000"
                className={inputClass}
              />
            </label>
            <button
              onClick={() => patch({ phone: phone.trim() || null }, "Teléfono guardado.")}
              disabled={busy}
              className="rounded-control bg-primary px-3 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
            >
              Guardar teléfono
            </button>
          </div>

          {/* Tasa */}
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Tipo</span>
              <select
                value={rateType}
                onChange={(e) => setRateType(e.target.value as "PERCENT" | "FIXED")}
                className={inputClass}
              >
                <option value="PERCENT">% sobre el precio</option>
                <option value="FIXED">Fijo por unidad</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Ganancia</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={rateValue}
                onChange={(e) => setRateValue(e.target.value)}
                className={`${inputClass} w-32`}
              />
            </label>
            <button
              onClick={() =>
                patch(
                  { rateType, rateValue: Number(rateValue) },
                  "La nueva ganancia se aplica a las próximas ventas.",
                )
              }
              disabled={busy}
              className="rounded-control bg-primary px-3 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
            >
              Guardar ganancia
            </button>
            <button
              onClick={() =>
                patch(
                  { active: !manager.active },
                  manager.active ? "Enlace desactivado." : "Enlace activado.",
                )
              }
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-ink hover:border-primary hover:text-primary disabled:opacity-60"
            >
              <Power size={14} /> {manager.active ? "Desactivar" : "Activar"}
            </button>
            <button
              onClick={remove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-danger hover:border-danger disabled:opacity-60"
            >
              <Trash size={14} /> Quitar gestor
            </button>
          </div>

          <ManagerDetail managerId={manager.id} currency={currency} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}

function ManagerDetail({
  managerId,
  currency,
  onChanged,
}: {
  managerId: string;
  currency: Currency;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/admin/managers/${managerId}`)
      .then((r) => r.json())
      .then((d) => {
        setSales(d.sales ?? []);
        setPayouts(d.payouts ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [managerId]);

  useEffect(() => {
    load();
  }, [load]);

  const pendingTotal = sales
    .filter((s) => !s.settled && s.status !== "CANCELLED")
    .reduce((sum, s) => sum + s.commission, 0);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0)) {
      toast.error("Importe inválido", "Escribí cuánto le pagás.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/managers/${managerId}/payouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: value, currency: currency.code, note: note.trim() || undefined }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      toast.error("No se registró el pago", d?.error ?? "Intentá de nuevo.");
      return;
    }
    toast.success("Pago registrado", `${formatMoney(value, currency)} liquidado.`);
    setAmount("");
    setNote("");
    load();
    onChanged();
  };

  if (loading) return <p className="text-sm text-muted">Cargando historial…</p>;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Ventas */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Ventas por su enlace
        </h4>
        {sales.length === 0 ? (
          <p className="text-sm text-muted">Aún no hay ventas con este enlace.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-control border border-line">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-bg/80 text-left text-muted backdrop-blur">
                <tr>
                  <th className="px-2 py-1.5">Reserva</th>
                  <th className="px-2 py-1.5 text-right">Venta</th>
                  <th className="px-2 py-1.5 text-right">Comisión</th>
                  <th className="px-2 py-1.5">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-line/60">
                    <td className="px-2 py-1.5 text-ink">
                      {s.code}
                      <span className="block text-[10px] text-muted">
                        {new Date(s.createdAt).toLocaleDateString("es-CU")}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-ink">
                      {formatMoney(s.total, currency)}
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-ink">
                      {formatMoney(s.commission, currency)}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          s.status === "CANCELLED"
                            ? "bg-line/40 text-muted"
                            : s.settled
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {s.status === "CANCELLED"
                          ? "Cancelada"
                          : s.settled
                            ? "Pagada"
                            : "Por pagar"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagos */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted">
          Pagos registrados
        </h4>
        <form onSubmit={pay} className="mb-3 space-y-2 rounded-control border border-line p-3">
          <p className="text-xs text-muted">
            Pendiente: <span className="font-semibold text-ink">{formatMoney(pendingTotal, currency)}</span>
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={pendingTotal > 0 ? String(pendingTotal) : "Importe"}
              className={`${inputClass} flex-1`}
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-control bg-primary px-3 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-60"
            >
              {busy ? "…" : "Registrar pago"}
            </button>
          </div>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (ej. efectivo, transferencia…)"
            className={inputClass}
          />
        </form>
        {payouts.length === 0 ? (
          <p className="text-sm text-muted">Todavía no se le ha pagado nada.</p>
        ) : (
          <ul className="space-y-1.5">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-control border border-line/70 px-3 py-2 text-xs"
              >
                <span className="text-muted">
                  {new Date(p.createdAt).toLocaleDateString("es-CU")}
                  {p.note ? ` · ${p.note}` : ""}
                </span>
                <span className="font-semibold tabular-nums text-ink">
                  {formatMoney(p.amount, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
