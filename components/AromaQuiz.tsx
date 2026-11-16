"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkle, ArrowClockwise } from "@phosphor-icons/react/dist/ssr";
import type { ProductDTO } from "@/lib/types";
import { useSettings } from "@/lib/settings-context";
import { ProductCard } from "./ProductCard";

/**
 * "Encuentra tu aroma" — mini test de 4 preguntas.
 *
 * Todo pasa en el cliente: las respuestas se comparan con los datos reales del
 * catálogo (familia olfativa, ocasión, notas y precio) y se puntúan. No se envía
 * nada al servidor, así que el test responde al instante y se puede compartir.
 */

type Step = {
  key: string;
  question: string;
  hint?: string;
  options: { value: string; label: string; detail?: string }[];
};

const STEPS: Step[] = [
  {
    key: "family",
    question: "¿Qué familia olfativa te atrae más?",
    hint: "Si no estás seguro, elegí la que más te intrigue: el test igual te da opciones.",
    options: [
      { value: "Amaderado", label: "Amaderado", detail: "Cedro, sándalo, vetiver" },
      { value: "Floral", label: "Floral", detail: "Rosa, jazmín, peonía" },
      { value: "Fresco", label: "Fresco", detail: "Cítricos, menta, acuático" },
      { value: "Oriental", label: "Oriental / dulce", detail: "Vainilla, ámbar, especias" },
      { value: "Clásico", label: "Clásico / chipre", detail: "Cuero, musgo, elegante" },
    ],
  },
  {
    key: "occasion",
    question: "¿Para qué momento lo querés?",
    options: [
      { value: "DIA", label: "Para el día", detail: "Trabajo, estudios, salidas de día" },
      { value: "NOCHE", label: "Para la noche", detail: "Cenas, eventos, salidas" },
      { value: "AMBAS", label: "Para todo", detail: "Un perfume que sirva siempre" },
    ],
  },
  {
    key: "intensity",
    question: "¿Qué intensidad preferís?",
    options: [
      { value: "suave", label: "Suave y discreto", detail: "Se nota cuando te acercás" },
      { value: "media", label: "Equilibrado", detail: "Presencia sin invadir" },
      { value: "fuerte", label: "Potente y duradero", detail: "Que se sienta a distancia" },
    ],
  },
  {
    key: "budget",
    question: "¿Cuánto querés gastar?",
    options: [
      { value: "low", label: "Lo más accesible" },
      { value: "mid", label: "Un precio medio" },
      { value: "high", label: "Lo mejor, sin importar el precio" },
    ],
  },
];

/** Palabras que sugieren intensidad fuerte / media / suave en las notas. */
const STRONG_NOTES = ["ambar", "ámbar", "oud", "incienso", "tabaco", "cuero", "vainilla", "pachuli", "almizcle"];
const SOFT_NOTES = ["citrico", "cítrico", "limon", "limón", "menta", "floral", "rosa", "jazmin", "jazmín", "agua", "fresco"];

function scoreProduct(
  p: ProductDTO,
  a: { family: string; occasion: string; intensity: string; budget: string },
  priceRange: { min: number; max: number },
): number {
  let score = 0;
  const category = (p.category ?? "").toLowerCase();
  const notes = (p.notes ?? "").toLowerCase();

  // Familia olfativa: coincidencia directa o aproximada.
  const fam = a.family.toLowerCase();
  if (category.includes(fam.slice(0, 6))) score += 40;
  else if (fam.includes("oriental") && /(oriental|dulce|ambar|vainilla)/.test(category + notes)) score += 30;
  else if (fam.includes("clasic") && /(clasic|chipre|cuero|musgo)/.test(category + notes)) score += 30;

  // Ocasión.
  if (p.occasion) {
    if (a.occasion === "AMBAS" && (p.occasion === "AMBAS" || p.occasion === "DIA")) score += 15;
    else if (p.occasion === a.occasion) score += 22;
    else if (p.occasion === "AMBAS") score += 12;
  }

  // Intensidad a partir de las notas.
  const strong = STRONG_NOTES.some((n) => notes.includes(n));
  const soft = SOFT_NOTES.some((n) => notes.includes(n));
  if (a.intensity === "fuerte" && strong) score += 15;
  if (a.intensity === "suave" && soft) score += 15;
  if (a.intensity === "media" && (strong || soft)) score += 8;

  // Presupuesto: se compara con el rango real del catálogo.
  const span = Math.max(1, priceRange.max - priceRange.min);
  const pos = (p.price - priceRange.min) / span; // 0 = más barato, 1 = más caro
  if (a.budget === "low" && pos < 0.34) score += 18;
  if (a.budget === "mid" && pos >= 0.2 && pos <= 0.8) score += 18;
  if (a.budget === "high" && pos > 0.6) score += 18;

  // Desempate: lo que hay en stock gana.
  if (p.stock === null || p.stock === undefined || p.stock > 0) score += 3;

  return score;
}

export function AromaQuiz({ products }: { products: ProductDTO[] }) {
  const { settings } = useSettings();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  const priceRange = useMemo(() => {
    const values = products.map((p) => p.price).filter((n) => Number.isFinite(n));
    return values.length
      ? { min: Math.min(...values), max: Math.max(...values) }
      : { min: 0, max: 1 };
  }, [products]);

  const results = useMemo(() => {
    if (!done) return [];
    const a = {
      family: answers.family ?? "",
      occasion: answers.occasion ?? "AMBAS",
      intensity: answers.intensity ?? "media",
      budget: answers.budget ?? "mid",
    };
    return [...products]
      .map((p) => ({ p, s: scoreProduct(p, a, priceRange) }))
      .sort((x, y) => y.s - x.s)
      .slice(0, 3)
      .map((x) => x.p);
  }, [done, answers, products, priceRange]);

  const current = STEPS[step];
  const progress = done ? 100 : Math.round((step / STEPS.length) * 100);

  function choose(value: string) {
    const next = { ...answers, [current.key]: value };
    setAnswers(next);
    if (step + 1 < STEPS.length) setStep(step + 1);
    else setDone(true);
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setDone(false);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">
          <Sparkle size={13} weight="fill" className="text-accent" />
          4 preguntas · menos de un minuto
        </span>
        <h1 className="mt-5 font-display text-h1 text-ink">Encontrá tu aroma</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Contanos qué te gusta y te proponemos tres fragancias de {settings.brand} que
          van con vos. Sin registro, sin vueltas.
        </p>
      </div>

      <div className="mt-8 h-1 w-full overflow-hidden rounded-full bg-line" aria-hidden="true">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-theme"
          style={{ width: `${progress}%` }}
        />
      </div>

      {!done ? (
        <div className="mx-auto mt-8 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Paso {step + 1} de {STEPS.length}
          </p>
          <h2 className="mt-2 font-display text-h2 text-ink">{current.question}</h2>
          {current.hint && <p className="mt-2 text-sm text-muted">{current.hint}</p>}

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {current.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => choose(o.value)}
                className={`flex items-center justify-between gap-3 rounded-card border px-4 py-3.5 text-left transition-colors duration-200 ease-theme focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  answers[current.key] === o.value
                    ? "border-primary bg-primary/8"
                    : "border-line bg-surface hover:border-primary/40 hover:bg-primary/5"
                }`}
              >
                <span>
                  <span className="block text-sm font-medium text-ink">{o.label}</span>
                  {o.detail && <span className="mt-0.5 block text-xs text-muted">{o.detail}</span>}
                </span>
                <ArrowRight size={16} className="shrink-0 text-muted" />
              </button>
            ))}
          </div>

          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
            >
              <ArrowLeft size={14} /> Volver
            </button>
          )}
        </div>
      ) : (
        <div className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-h2 text-ink">Tu selección</h2>
              <p className="mt-1 text-sm text-muted">
                Elegimos estas tres por su familia, su momento y su intensidad.
              </p>
            </div>
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-1.5 rounded-control border border-line px-3 py-2 text-sm text-muted transition-colors hover:text-ink"
            >
              <ArrowClockwise size={15} /> Repetir el test
            </button>
          </div>

          {results.length === 0 ? (
            <div className="mt-8 rounded-card border border-line bg-surface p-8 text-center">
              <p className="text-sm text-muted">
                El catálogo está vacío por el momento. Volvé pronto para descubrir las novedades.
              </p>
              <Link
                href="/"
                className="mt-4 inline-block rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
              >
                Ver la tienda
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((p) => (
                <ProductCard key={p.id} product={p} initialSaved={false} signedIn={false} />
              ))}
            </div>
          )}

          <div className="mt-10 rounded-card border border-line bg-surface p-6 text-center">
            <p className="text-sm text-muted">
              ¿Ninguno te convenció? Escribinos y te ayudamos a elegir a mano.
            </p>
            <a
              href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(
                `Hola ${settings.brand}, hice el test de aroma y quiero una recomendación más personalizada.`,
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90"
            >
              Pedir una recomendación
            </a>
          </div>
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted">
        Precios en {settings.baseCurrency ?? "CUP"} · podés cambiar la moneda desde el encabezado.
      </p>
    </div>
  );
}
