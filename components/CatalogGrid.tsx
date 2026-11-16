"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { MagnifyingGlass, SlidersHorizontal, X } from "@phosphor-icons/react/dist/ssr";
import { ProductCard } from "./ProductCard";
import { Reveal } from "./Reveal";
import { EmptyState } from "./EmptyState";
import type { CategoryDTO, ProductDTO } from "@/lib/types";
import { useSettings } from "@/lib/settings-context";
import { cleanEditableText } from "@/lib/editable-text";

type Sort = "new" | "price-asc" | "price-desc" | "name";

/**
 * Catálogo con filtros combinables. Cada cambio dispara una consulta que
 * cancela la anterior, así una respuesta lenta no pisa a una más nueva.
 */
export function CatalogGrid({
  initialProducts,
  categories: initialCategories,
  wishlistIds,
  signedIn,
  title,
  intro,
}: {
  initialProducts: ProductDTO[];
  categories: string[];
  wishlistIds: string[];
  signedIn: boolean;
  /** Textos editables desde Administración → Contenido. */
  title?: string;
  intro?: string;
}) {
  const [query, setQuery] = useState("");
  const { settings } = useSettings();
  const waHref = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
    `Hola ${settings.brand}, busco un perfume que no está en el catálogo.`,
  )}`;
  const [category, setCategory] = useState("all");
  const [brand, setBrand] = useState("all");
  const [inStock, setInStock] = useState(false);
  const [occasion, setOccasion] = useState("all");
  const [gender, setGender] = useState("all");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState<Sort>("new");

  const [products, setProducts] = useState<ProductDTO[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showFilters, setShowFilters] = useState(false);

  const [categories, setCategories] = useState<string[]>(initialCategories);
  const [brands, setBrands] = useState<string[]>(() =>
    [...new Set(initialProducts.map((p) => p.brand))].sort(),
  );

  // Categorías administrables: alimentan el filtro del catálogo.
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d: { categories?: CategoryDTO[] }) => {
        const names = (d.categories ?? []).map((c) => c.name);
        if (names.length) setCategories(names);
      })
      .catch(() => {});
  }, []);

  const activeFilters =
    (category !== "all" ? 1 : 0) +
    (brand !== "all" ? 1 : 0) +
    (inStock ? 1 : 0) +
    (occasion !== "all" ? 1 : 0) +
    (gender !== "all" ? 1 : 0) +
    (min.trim() ? 1 : 0) +
    (max.trim() ? 1 : 0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("q", query.trim());
        if (category !== "all") params.set("category", category);
        if (brand !== "all") params.set("brand", brand);
        if (inStock) params.set("inStock", "1");
        if (occasion !== "all") params.set("occasion", occasion);
        if (gender !== "all") params.set("gender", gender);
        if (min.trim()) params.set("min", min.trim());
        if (max.trim()) params.set("max", max.trim());
        if (sort !== "new") params.set("sort", sort);
        const res = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        const list: ProductDTO[] = data.products ?? [];
        startTransition(() => {
          setProducts(list);
          // Las marcas se acumulan de lo ya visto, para no perder opciones.
          setBrands((prev) => [...new Set([...prev, ...list.map((p) => p.brand)])].sort());
        });
      } catch (e) {
        if ((e as Error).name !== "AbortError") setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, category, brand, inStock, occasion, gender, min, max, sort]);

  const clear = () => {
    setQuery("");
    setCategory("all");
    setBrand("all");
    setInStock(false);
    setOccasion("all");
    setGender("all");
    setMin("");
    setMax("");
    setSort("new");
  };

  const busy = loading || isPending;
  const filtered = activeFilters > 0 || query.trim().length > 0;

  const control =
    "rounded-control border border-line bg-surface px-3 py-2.5 text-sm text-ink transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  const filterPanel = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="block">
        <span className="text-xs uppercase tracking-[0.1em] text-muted">Categoría</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={`${control} mt-1.5 w-full`}
        >
          <option value="all">Todas</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.1em] text-muted">Marca</span>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className={`${control} mt-1.5 w-full`}
        >
          <option value="all">Todas</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.1em] text-muted">Para quién</span>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className={`${control} mt-1.5 w-full`}
        >
          <option value="all">Todos</option>
          <option value="MUJER">Mujer</option>
          <option value="HOMBRE">Hombre</option>
          <option value="UNISEX">Unisex</option>
        </select>
      </label>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.1em] text-muted">Ocasión</span>
        <select
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
          className={`${control} mt-1.5 w-full`}
        >
          <option value="all">Todas</option>
          <option value="DIA">Día</option>
          <option value="NOCHE">Noche</option>
          <option value="AMBAS">Día y noche</option>
        </select>
      </label>

      <div>
        <span className="text-xs uppercase tracking-[0.1em] text-muted">Precio</span>
        <div className="mt-1.5 flex items-center gap-2">
          <input
            value={min}
            onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Mín"
            inputMode="decimal"
            aria-label="Precio mínimo"
            className={`${control} w-full tabular-nums`}
          />
          <span className="text-muted">–</span>
          <input
            value={max}
            onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))}
            placeholder="Máx"
            inputMode="decimal"
            aria-label="Precio máximo"
            className={`${control} w-full tabular-nums`}
          />
        </div>
      </div>

      <label className="block">
        <span className="text-xs uppercase tracking-[0.1em] text-muted">Ordenar</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className={`${control} mt-1.5 w-full`}
        >
          <option value="new">Más recientes</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
          <option value="name">Nombre (A–Z)</option>
        </select>
      </label>

      <label className="flex items-center gap-2 self-end pb-2 text-sm text-ink sm:col-span-2 lg:col-span-4">
        <input
          type="checkbox"
          checked={inStock}
          onChange={(e) => setInStock(e.target.checked)}
          className="h-4 w-4 rounded border-line accent-primary"
        />
        Mostrar solo productos con stock
      </label>
    </div>
  );

  return (
    <section id="catalogo" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="flex flex-col gap-5 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-h2">{cleanEditableText(title, "Catálogo")}</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
            {cleanEditableText(
              intro,
              "Filtrá por familia olfativa, marca o precio para encontrar tu fragancia.",
            )}
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <div className="relative flex-1 md:w-64">
            <MagnifyingGlass
              size={16}
              weight="duotone"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Perfume, casa o familia olfativa…"
              aria-label="Buscar perfumes"
              className="w-full rounded-control border border-line bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-muted transition-colors hover:border-primary/60 focus-visible:outline-none"
            />
          </div>

          <button
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            className={`flex items-center justify-center gap-1.5 ${control} whitespace-nowrap`}
          >
            <SlidersHorizontal size={15} />
            Filtros
            {activeFilters > 0 && (
              <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-on-primary">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* El panel lo controla el botón Filtros en TODOS los tamaños: antes
          `md:block` lo dejaba siempre abierto en escritorio y el botón parecía
          no hacer nada. */}
      <div className={`${showFilters ? "mt-5 block" : "mt-5 hidden"}`}>
        {filterPanel}
      </div>

      {activeFilters > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Filtros activos:</span>
          {category !== "all" && (
            <Chip label={category} onClear={() => setCategory("all")} />
          )}
          {brand !== "all" && <Chip label={brand} onClear={() => setBrand("all")} />}
          {gender !== "all" && (
            <Chip
              label={gender === "MUJER" ? "Mujer" : gender === "HOMBRE" ? "Hombre" : "Unisex"}
              onClear={() => setGender("all")}
            />
          )}
          {inStock && <Chip label="Con stock" onClear={() => setInStock(false)} />}
          {(min.trim() || max.trim()) && (
            <Chip
              label={`${min || "0"} – ${max || "∞"}`}
              onClear={() => {
                setMin("");
                setMax("");
              }}
            />
          )}
          <button
            onClick={clear}
            className="text-xs text-primary underline hover:no-underline"
          >
            Limpiar todo
          </button>
        </div>
      )}

      {busy && products.length === 0 ? (
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i}>
              <div className="skeleton aspect-[4/5] w-full rounded-card" />
              <div className="skeleton mt-4 h-3 w-24 rounded" />
              <div className="skeleton mt-2 h-5 w-40 rounded" />
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        filtered ? (
          <div className="mt-16 flex flex-col items-center rounded-card border border-dashed border-line px-6 py-16 text-center">
            <p className="font-display text-h3 text-ink">No encontramos productos</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
              {query.trim()
                ? `Nada coincide con “${query.trim()}”. Probá con la categoría o el nombre de la marca.`
                : "Ningún producto coincide con estos filtros."}
            </p>
            <button
              onClick={clear}
              className="mt-5 rounded-control border border-line px-4 py-2 text-sm text-ink transition-colors duration-200 ease-theme hover:border-primary hover:text-primary"
            >
              Ver todo el catálogo
            </button>
          </div>
        ) : (
          <div className="mt-16">
            <EmptyState
              title="El catálogo está vacío"
              description="Todavía no hay perfumes publicados. Si administrás la tienda, entrá al panel para cargar el primero; el catálogo se actualiza solo."
              actionLabel="Ir al panel"
              actionHref="/admin"
            />
          </div>
        )
      ) : (
        <>
          <p className="mt-6 text-xs text-muted">
            {products.length} {products.length === 1 ? "producto" : "productos"}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={(i % 3) * 90} className="h-full">
                <ProductCard
                  product={p}
                  initialSaved={wishlistIds.includes(p.id)}
                  signedIn={signedIn}
                />
              </Reveal>
            ))}
          </div>
        </>
      )}

      <p className="mt-10 text-center text-xs text-muted">
        ¿Buscás algo que no está?{" "}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-primary"
        >
          Escribinos por WhatsApp
        </a>{" "}
        y lo conseguimos.
      </p>
    </section>
  );
}

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
    >
      {label}
      <X size={12} />
    </button>
  );
}
