"use client";

import { useState } from "react";
import { Plus, Trash, PencilSimple, Check, X } from "@phosphor-icons/react/dist/ssr";
import type { CategoryDTO } from "@/lib/types";
import { useConfirm } from "@/components/ui/ConfirmProvider";
import { useToast } from "@/components/ui/ToastProvider";

/**
 * Categorías del catálogo. Son las que aparecen en los filtros del catálogo y
 * en el selector del formulario de producto.
 */
export function AdminCategories({ initial }: { initial: CategoryDTO[] }) {
  const [categories, setCategories] = useState(initial);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();
  const toast = useToast();

  const reload = () =>
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setError(d?.error ?? "No pudimos crear la categoría.");
      return;
    }
    setName("");
    toast.success("Categoría creada", `“${name.trim()}” ya está disponible al crear productos.`);
    reload();
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editName.trim() }),
    }).catch(() => null);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setError(d?.error ?? "No pudimos renombrar la categoría.");
      return;
    }
    setEditingId(null);
    toast.success("Categoría renombrada");
    reload();
  };

  const remove = async (c: CategoryDTO) => {
    const ok = await confirm({
      title: `¿Eliminar la categoría "${c.name}"?`,
      description:
        "Los productos que la usan quedan sin categoría hasta que les asignes otra. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      tone: "danger",
    });
    if (!ok) return;
    setError(null);
    const res = await fetch(`/api/admin/categories?id=${c.id}`, { method: "DELETE" }).catch(
      () => null,
    );
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      setError(d?.error ?? "No pudimos eliminar la categoría.");
      return;
    }
    toast.success("Categoría eliminada", `“${c.name}” ya no aparece en los filtros.`);
    reload();
  };

  const inputClass =
    "w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div className="max-w-2xl space-y-6">
      <form onSubmit={add} className="rounded-card border border-line bg-surface p-6">
        <h2 className="text-h3">Nueva categoría</h2>
        <p className="mt-1 text-xs text-muted">
          Las categorías organizan el catálogo y alimentan sus filtros. Cada producto
          elige una.
        </p>
        <div className="mt-4 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Amaderado, Floral, Cítrico…"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="flex shrink-0 items-center gap-1.5 rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={16} weight="bold" /> Agregar
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
      </form>

      <div className="overflow-hidden rounded-card border border-line bg-surface">
        <ul>
          {categories.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-muted">
              Todavía no hay categorías. Creá la primera arriba.
            </li>
          )}
          {categories.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-3 last:border-0"
            >
              {editingId === c.id ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  autoFocus
                  className={inputClass}
                />
              ) : (
                <div>
                  <span className="text-sm text-ink">{c.name}</span>
                  <span className="ml-2 text-xs text-muted">
                    {c.productCount ?? 0} producto(s)
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                {editingId === c.id ? (
                  <>
                    <button
                      onClick={() => saveEdit(c.id)}
                      aria-label="Guardar"
                      className="rounded-control p-1.5 text-primary hover:bg-primary/10"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      aria-label="Cancelar"
                      className="rounded-control p-1.5 text-muted hover:text-ink"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      aria-label="Renombrar"
                      className="rounded-control p-1.5 text-muted hover:text-primary"
                    >
                      <PencilSimple size={16} />
                    </button>
                    <button
                      onClick={() => remove(c)}
                      aria-label="Eliminar"
                      className="rounded-control p-1.5 text-muted hover:text-danger"
                    >
                      <Trash size={16} />
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
