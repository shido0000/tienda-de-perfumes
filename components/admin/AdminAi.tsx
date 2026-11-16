"use client";

import { useEffect, useState } from "react";
import { Robot, CheckCircle, WarningCircle, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import {
  AI_MODEL_PRESETS,
  AI_PROVIDER_HELP,
  AI_PROVIDER_LABEL,
  AI_PROVIDERS,
  defaultModelFor,
  isAiProvider,
  type AiProvider,
} from "@/lib/ai-presets";
import { useToast } from "@/components/ui/ToastProvider";

type SafeAi = {
  provider: AiProvider;
  model: string;
  hasKey: boolean;
  source: "db" | "env" | "none";
  keyHint: string;
};

const SOURCE_LABEL: Record<SafeAi["source"], string> = {
  db: "clave guardada desde este panel",
  env: "clave del servidor (variables de entorno)",
  none: "sin clave: el asistente usa sus respuestas básicas",
};

const inputClass =
  "mt-1.5 w-full rounded-control border border-line bg-bg px-3 py-2 text-sm text-ink transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

/**
 * Asistente con IA. El dueño elige un proveedor con plan gratuito, pega la
 * clave y prueba la conexión sin salir del panel: la clave se guarda en la
 * base, así que no hace falta volver a desplegar.
 */
export function AdminAi() {
  const toast = useToast();
  const [state, setState] = useState<SafeAi | null>(null);
  const [provider, setProvider] = useState<AiProvider>("groq");
  const [model, setModel] = useState(defaultModelFor("groq"));
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/ai").catch(() => null);
    const data = await res?.json().catch(() => null);
    const ai: SafeAi | undefined = data?.ai;
    if (!ai) return;
    setState(ai);
    setProvider(ai.provider);
    setModel(ai.model || defaultModelFor(ai.provider));
  };

  useEffect(() => {
    void load();
  }, []);

  const switchProvider = (next: AiProvider) => {
    setProvider(next);
    setModel(defaultModelFor(next));
    setTestResult(null);
  };

  const save = async (e: import("react").FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, apiKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar.");
      setState(data.ai as SafeAi);
      setApiKey("");
      toast.success("Asistente actualizado", "La próxima respuesta ya la redacta el modelo de IA.");
    } catch (err) {
      toast.error("No se pudo guardar", err instanceof Error ? err.message : "Error de red");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "¿Qué perfumes frescos tienen?" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "El proveedor no respondió.");
      setTestResult({ ok: true, text: String(data.reply ?? "") });
    } catch (err) {
      setTestResult({ ok: false, text: err instanceof Error ? err.message : "Error de red" });
    } finally {
      setTesting(false);
    }
  };

  const models = AI_MODEL_PRESETS[provider];

  return (
    <form onSubmit={save} className="space-y-8">
      <section className="rounded-card border border-line bg-surface p-6">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <Robot size={18} weight="duotone" />
          </span>
          <div>
            <h2 className="text-h3">Asistente con IA</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
              El chat de la tienda responde con datos reales del catálogo, del envío y de las
              ofertas. Si conectás un modelo de lenguaje, además entiende preguntas escritas con
              otras palabras y redacta la respuesta. Todos los proveedores de aquí tienen plan
              gratuito y la clave se guarda en tu base de datos.
            </p>
            {state && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">
                {state.hasKey ? <CheckCircle size={12} className="text-success" /> : <WarningCircle size={12} className="text-danger" />}
                {state.hasKey ? `Activo · ${SOURCE_LABEL[state.source]} ${state.keyHint}` : SOURCE_LABEL[state.source]}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {AI_PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => switchProvider(p)}
              aria-pressed={provider === p}
              className={`rounded-card border px-4 py-3 text-left transition-colors duration-200 ease-theme ${
                provider === p
                  ? "border-primary bg-primary/5"
                  : "border-line hover:border-primary/60"
              }`}
            >
              <span className="block text-sm font-medium text-ink">{AI_PROVIDER_LABEL[p]}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                {AI_PROVIDER_HELP[p].free}
              </span>
              <a
                href={AI_PROVIDER_HELP[p].keysUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                Conseguir clave gratis <ArrowSquareOut size={11} />
              </a>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">Modelo</span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className={inputClass}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
              {model && !models.some((m) => m.id === model) && (
                <option value={model}>{model}</option>
              )}
            </select>
          </label>

          <label className="block">
            <span className="text-xs uppercase tracking-[0.14em] text-muted">
              Clave de API {state?.hasKey && <span className="normal-case tracking-normal">(guardada {state.keyHint})</span>}
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={state?.hasKey ? "Dejalo vacío para conservar la clave actual" : "Pegá la clave del proveedor"}
              autoComplete="off"
              className={inputClass}
            />
            <span className="mt-1 block text-[11px] text-muted">
              Se guarda cifrada por HTTPS en tu base y nunca se muestra en el navegador.
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-control bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Guardando…" : "Guardar asistente"}
          </button>
          <button
            type="button"
            onClick={test}
            disabled={testing || !state?.hasKey}
            className="rounded-control border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {testing ? "Probando…" : "Probar respuesta"}
          </button>
          {state?.hasKey && (
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                try {
                  const res = await fetch("/api/admin/ai", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ provider, model, apiKey: "" }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (res.ok) {
                    setState(data.ai as SafeAi);
                    toast.success("Clave eliminada", "El asistente vuelve a sus respuestas básicas.");
                  }
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="rounded-control px-3 py-2 text-sm text-muted transition-colors hover:text-danger disabled:opacity-50"
            >
              Quitar clave
            </button>
          )}
        </div>

        {testResult && (
          <p
            role="status"
            className={`mt-4 rounded-control border px-3 py-2 text-sm ${
              testResult.ok
                ? "border-success/40 bg-success/10 text-success"
                : "border-danger/40 bg-danger/10 text-danger"
            }`}
          >
            {testResult.ok ? `El modelo respondió: “${testResult.text}”` : testResult.text}
          </p>
        )}
      </section>

      <section className="rounded-card border border-line bg-surface p-6">
        <h3 className="text-h4">Qué hace sin IA</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          Si no hay clave, el asistente sigue funcionando: busca en el catálogo por nombre, marca,
          familia olfativa y notas, y explica el envío, los pagos, cómo reservar y el estado de tus
          reservas. La IA solo mejora la redacción y la comprensión de preguntas poco habituales.
        </p>
      </section>
    </form>
  );
}
