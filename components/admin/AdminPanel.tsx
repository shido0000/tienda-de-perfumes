"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChartBar,
  Package,
  Tag,
  Users,
  Megaphone,
  Gear,
  ClipboardText,
  PencilSimple,
  Gift,
  ChatCircleText,
  FilePdf,
  Robot,
  BellRinging,
  PaperPlaneTilt,
  Coins,
  Star,
  UsersThree,
  Pulse,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { AdminProducts } from "./AdminProducts";
import { AdminAlertBanner } from "./AdminAlertBanner";
import { AdminReservations } from "./AdminReservations";
import { AdminSettings } from "./AdminSettings";
import { AdminDashboard } from "./AdminDashboard";
import { AdminCategories } from "./AdminCategories";
import { AdminUsers } from "./AdminUsers";
import { AdminManagers } from "./AdminManagers";
import { AdminCampaigns } from "./AdminCampaigns";
import { AdminCampaignTemplates } from "./AdminCampaignTemplates";
import { AdminContent, type ContentForm } from "./AdminContent";
import { AdminCombos } from "./AdminCombos";
import { AdminBanners } from "./AdminBanners";
import { AdminPushToggle } from "./AdminPushToggle";
import { AdminReport } from "./AdminReport";
import { AdminAi } from "./AdminAi";
import { AdminAlerts } from "./AdminAlerts";
import { AdminNotifications } from "./AdminNotifications";
import { AdminReviews } from "./AdminReviews";
import { AdminCashClose } from "./AdminCashClose";
import { AdminAudience } from "./AdminAudience";
import type { Currency } from "@/lib/currency";
import type { BannerDTO, CategoryDTO, ComboDTO, ProductDTO, ReservationDTO } from "@/lib/types";

type Tab =
  | "dashboard"
  | "products"
  | "combos"
  | "banners"
  | "categories"
  | "reservations"
  | "alerts"
  | "notifications"
  | "reviews"
  | "cashclose"
  | "users"
  | "managers"
  | "audience"
  | "campaigns"
  | "templates"
  | "content"
  | "report"
  | "ai"
  | "settings";

const ALL_TABS: Tab[] = [
  "dashboard",
  "products",
  "combos",
  "banners",
  "categories",
  "reservations",
  "alerts",
  "notifications",
  "reviews",
  "cashclose",
  "users",
  "managers",
  "audience",
  "campaigns",
  "templates",
  "content",
  "report",
  "ai",
  "settings",
];

export function AdminPanel({
  products,
  combos,
  banners,
  reservations,
  settings,
  content,
}: {
  products: ProductDTO[];
  combos: ComboDTO[];
  banners: BannerDTO[];
  reservations: (ReservationDTO & {
    user: { email: string; name: string | null; phone: string | null };
  })[];
  settings: React.ComponentProps<typeof AdminSettings>["initial"] & { currencies: Currency[] };
  content: ContentForm;
}) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [categories, setCategories] = useState<CategoryDTO[]>([]);
  const [managerPrefill, setManagerPrefill] = useState<{ email: string; name: string | null } | null>(null);

  // Permite llegar a una pestaña concreta desde un enlace (/admin?tab=alerts).
  // Se usa useSearchParams para que funcione también cuando ya estamos en
  // /admin y el enlace solo cambia el parámetro: así "Ver alertas" de la franja
  // superior abre la pestaña en vez de quedarse en Dashboard.
  const searchParams = useSearchParams();
  const wantedTab = searchParams?.get("tab") ?? null;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Cada vez que se pide refrescar se incrementa: sirve para volver a pedir los
  // datos que no llegan por props (categorías) y para que los contadores de las
  // pestañas no queden viejos después de guardar algo.
  const [refreshKey, setRefreshKey] = useState(0);
  const lastRefreshAt = useRef(0);

  /**
   * Los props de /admin vienen del servidor. Solo se vuelven a pedir después
   * de guardar algo; cambiar de pestaña no debe repetir esa carga completa.
   */
  const refresh = () => {
    const now = Date.now();
    if (now - lastRefreshAt.current < 1500) return;
    lastRefreshAt.current = now;
    setRefreshKey((k) => k + 1);
    startTransition(() => router.refresh());
  };

  const selectTab = (id: Tab) => {
    setTab(id);
  };

  useEffect(() => {
    if (wantedTab && ALL_TABS.includes(wantedTab as Tab)) {
      setTab(wantedTab as Tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantedTab]);

  useEffect(() => {
    fetch("/api/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, [refreshKey]);

  // Todos los formularios del panel guardan con fetch(). En lugar de tocar
  // cada uno, se vigila aquí: cuando una llamada de escritura (POST/PATCH/
  // DELETE) termina bien, se refrescan los datos del servidor. Así la pestaña
  // que se abra después ya muestra lo último que se guardó.
  useEffect(() => {
    const original = window.fetch;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refresh(), 350);
    };
    const wrapped: typeof window.fetch = async (input, init) => {
      const response = await original(input, init);
      try {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;
        const method = (
          init?.method ??
          (input instanceof Request ? input.method : "GET")
        ).toUpperCase();
        if (response.ok && method !== "GET" && method !== "HEAD" && /\/api\//.test(url)) {
          scheduleRefresh();
        }
      } catch {
        // Si algo no se puede leer, se ignora: nunca debe romper la petición.
      }
      return response;
    };
    window.fetch = wrapped;
    return () => {
      window.fetch = original;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Los formularios del panel avisan por un evento cuando guardan algo, así el
  // panel vuelve a pedir los datos sin que haya que recargar la página.
  useEffect(() => {
    const onSaved = () => refresh();
    window.addEventListener("admin:updated", onSaved);
    return () => window.removeEventListener("admin:updated", onSaved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs: { id: Tab; label: string; icon: Icon; count?: number }[] = [
    { id: "dashboard", label: "Dashboard", icon: ChartBar },
    { id: "products", label: "Productos", icon: Package, count: products.length },
    { id: "combos", label: "Ofertas", icon: Gift, count: combos.length },
    { id: "banners", label: "Banners", icon: Megaphone, count: banners.length },
    { id: "categories", label: "Categorías", icon: Tag, count: categories.length },
    { id: "reservations", label: "Reservas", icon: ClipboardText, count: reservations.length },
    { id: "alerts", label: "Alertas", icon: BellRinging },
    { id: "notifications", label: "Avisos automáticos", icon: PaperPlaneTilt },
    { id: "reviews", label: "Opiniones", icon: Star },
    { id: "cashclose", label: "Cierre de caja", icon: Coins },
    { id: "users", label: "Usuarios", icon: Users },
    { id: "managers", label: "Gestores", icon: UsersThree },
    { id: "audience", label: "Audiencia", icon: Pulse },
    { id: "campaigns", label: "Campañas", icon: ChatCircleText },
    { id: "templates", label: "Plantillas", icon: PaperPlaneTilt },
    { id: "content", label: "Contenido", icon: PencilSimple },
    { id: "report", label: "Reporte", icon: FilePdf },
    { id: "ai", label: "Asistente IA", icon: Robot },
    { id: "settings", label: "Ajustes", icon: Gear },
  ];

  return (
    <div className="min-w-0">
      <AdminAlertBanner />
      <div className="relative -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1 pb-px">
        {isPending && (
          <span
            className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border-2 border-line border-t-primary"
            aria-label="Actualizando datos"
          />
        )}
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              aria-pressed={tab === t.id}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors duration-200 ease-theme ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <Icon size={15} />
              {t.label}
              {t.count !== undefined && (
                <span className="text-xs tabular-nums text-muted">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        {tab === "dashboard" && (
          <>
            <AdminDashboard />
            <AdminPushToggle />
          </>
        )}
        {tab === "products" && (
          <AdminProducts
            initialProducts={products}
            categories={categories}
            currencies={settings.currencies}
          />
        )}
        {tab === "combos" && (
          <AdminCombos
            initialCombos={combos as never}
            products={products}
            currencies={settings.currencies}
          />
        )}
        {tab === "banners" && <AdminBanners initialBanners={banners} />}
        {tab === "categories" && <AdminCategories initial={categories} />}
        {tab === "reservations" && (
          <AdminReservations initialReservations={reservations} currencies={settings.currencies} />
        )}
        {tab === "alerts" && <AdminAlerts currencies={settings.currencies} />}
        {tab === "notifications" && <AdminNotifications />}
        {tab === "reviews" && <AdminReviews />}
        {tab === "cashclose" && <AdminCashClose currencies={settings.currencies} />}
        {tab === "users" && (
          <AdminUsers
            onMakeManager={(email, name) => {
              setManagerPrefill({ email, name });
              setTab("managers");
            }}
          />
        )}
        {tab === "managers" && (
          <AdminManagers currencies={settings.currencies} prefill={managerPrefill} />
        )}
        {tab === "audience" && <AdminAudience currencies={settings.currencies} />}
        {tab === "campaigns" && <AdminCampaigns />}
        {tab === "templates" && <AdminCampaignTemplates />}
        {tab === "content" && <AdminContent initial={content} />}
        {tab === "report" && <AdminReport currency={settings.displayCurrency} />}
        {tab === "ai" && <AdminAi />}
        {tab === "settings" && <AdminSettings initial={settings} />}
      </div>
    </div>
  );
}
