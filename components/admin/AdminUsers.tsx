"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { MagnifyingGlass, ShieldCheck, UserCircle, ArrowClockwise, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import type { AdminUserDTO } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/types";

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUserDTO[]>([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<"all" | "CLIENT" | "ADMIN">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (role !== "all") params.set("role", role);
    fetch(`/api/admin/users?${params}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("No pudimos cargar los usuarios.");
        return r.json();
      })
      .then((d) => setUsers(d.users ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role]);

  const changeRole = async (u: AdminUserDTO, next: "CLIENT" | "ADMIN") => {
    setBusyId(u.id);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u.id, role: next }),
    }).catch(() => null);
    setBusyId(null);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setError(d?.error ?? "No pudimos cambiar el rol.");
      return;
    }
    setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: next } : x)));
    toast.success(
      "Rol actualizado",
      `${u.email} ahora es ${ROLE_LABEL[next as keyof typeof ROLE_LABEL] ?? next}.`,
    );
  };

  const inputClass =
    "w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  /** Descarga la lista visible (con los filtros actuales) como CSV. */
  const exportCsv = () => {
    const header = ["Nombre", "Correo", "Teléfono", "Rol", "Alta"];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = users.map((u) => [
      u.name ?? "",
      u.email,
      u.phone ?? "",
      ROLE_LABEL[u.role as keyof typeof ROLE_LABEL] ?? u.role,
      new Date(u.createdAt).toLocaleDateString("es-CU"),
    ]);
    const csv = [header, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lista exportada", `${users.length} clientes en el archivo.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono…"
            className={`${inputClass} pl-9`}
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className={`${inputClass} sm:w-48`}
        >
          <option value="all">Todos los roles</option>
          <option value="CLIENT">Clientes</option>
          <option value="ADMIN">Administradores</option>
        </select>
        <button
          onClick={load}
          className="flex items-center justify-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-ink hover:border-primary hover:text-primary"
        >
          <ArrowClockwise size={14} /> Actualizar
        </button>
        <button
          onClick={exportCsv}
          disabled={users.length === 0}
          className="flex items-center justify-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-ink hover:border-primary hover:text-primary disabled:opacity-50"
          title="Descargar la lista como CSV para abrir en Excel"
        >
          <DownloadSimple size={14} /> Exportar CSV
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-card border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-bg/40 text-left text-xs uppercase tracking-[0.1em] text-muted">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3 text-right">Reservas</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  Cargando usuarios…
                </td>
              </tr>
            )}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No hay usuarios que coincidan con la búsqueda.
                </td>
              </tr>
            )}
            {!loading &&
              users.map((u) => (
                <tr key={u.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      <UserCircle size={15} className="text-muted" />
                      {u.name || "Sin nombre"}
                    </span>
                    <span className="block text-xs text-muted">{u.email}</span>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.phone || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink">
                    {u.reservationCount}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${
                        u.role === "ADMIN"
                          ? "bg-primary/10 text-primary"
                          : "bg-line/40 text-muted"
                      }`}
                    >
                      {u.role === "ADMIN" && <ShieldCheck size={12} />}
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => changeRole(u, u.role === "ADMIN" ? "CLIENT" : "ADMIN")}
                      disabled={busyId === u.id}
                      className="rounded-control border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                    >
                      {busyId === u.id
                        ? "Guardando…"
                        : u.role === "ADMIN"
                          ? "Quitar admin"
                          : "Hacer admin"}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        Al hacer administrador, esa persona puede entrar al panel, gestionar productos,
        reservas y ajustes. Siempre queda al menos un administrador en la tienda.
      </p>
    </div>
  );
}
