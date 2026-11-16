"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
} from "@phosphor-icons/react/dist/ssr";
import { AdminProducts } from "./AdminProducts";
import { AdminAlertBanner } from "./AdminAlertBanner";
import { AdminReservations } from "./AdminReservations";
import { AdminSettings } from "./AdminSettings";
import { AdminDashboard } from "./AdminDashboard";
import { AdminCategories } from "./AdminCategories";
import { AdminUsers } from "./AdminUsers";
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

  // Permite llegar a una pestaña concreta desde un enlace (/admin?tab=alerts).
  // Se usa useSearchParams para que funcione también cuando ya estamos en
  // /admin y el enlace solo cambia el parámetro: así "Ver alertas" de la franja
  // superior abre la pestaña en vez de quedarse en Dashboard.
  const searchParams = useSearchParams();
  const wantedTab = searchParams?.get("tab") ?? null;
  useEffect(() => {
    if (wantedTab && ALL_TABS.includes(wantedTab as Tab)) setTab(wantedTab as Tab);
  }, [wantedTab]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
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
      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1 pb-px">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
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
        {tab === "users" && <AdminUsers />}
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
