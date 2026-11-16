export type ProductDTO = {
  id: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  categoryId: string | null;
  notes: string | null;
  price: number;
  /** Precio anterior, para mostrar la rebaja tachada. */
  compareAtPrice?: number | null;
  currency: string;
  /** Precio de costo en USD — SOLO se envía a la administración. */
  costUsd?: number | null;
  images: string[];
  visible: boolean;
  stock: number | null;
  /** Duración en la piel, texto corto ("6-8 h"). */
  duration?: string | null;
  /** DIA | NOCHE | AMBAS */
  occasion?: string | null;
  /** Para quién es: HOMBRE | MUJER | UNISEX */
  gender?: string | null;
  /** Preguntas frecuentes cargadas por la tienda para este perfume. */
  faqs?: ProductFaqItem[];
};

/** Una pregunta frecuente de la ficha del perfume. */
export type ProductFaqItem = {
  q: string;
  a: string;
};

export type ComboItemDTO = {
  productId: string;
  name?: string;
  brand?: string;
  quantity: number;
  stock?: number | null;
};

export type ComboDTO = {
  id: string;
  title: string;
  description: string;
  image: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: string;
  visible: boolean;
  order: number;
  items: ComboItemDTO[];
  /** Cuántas unidades de la oferta se pueden vender (null = sin control). */
  available?: number | null;
};

export type BannerDTO = {
  id: string;
  title: string;
  subtitle: string;
  image: string | null;
  ctaLabel: string;
  ctaUrl: string;
  background: string;
  textColor: string;
  placement: "HOME" | "CATALOG" | "BOTH";
  visible: boolean;
  order: number;
  endsAt: string | null;
};

export type CategoryDTO = {
  id: string;
  name: string;
  slug: string;
  order: number;
  productCount?: number;
};

export type AdminUserDTO = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  reservationCount: number;
  totalSpent: number;
};

export type CampaignDTO = {
  id: string;
  title: string;
  platform: string;
  message: string;
  link: string | null;
  image?: string | null;
  status: string;
  scheduledAt: string | null;
  createdAt: string;
};

/** Plantilla de mensaje guardada para reusar con otro segmento. */
export type CampaignTemplateDTO = {
  id: string;
  title: string;
  platform: string;
  message: string;
  link: string | null;
  uses: number;
  createdAt: string;
};

export type ReservationItemDTO = {
  id: string;
  name: string;
  brand: string;
  priceOriginal: number;
  currencyOriginal: string;
  priceConverted: number;
  orderCurrency: string;
  quantity: number;
};

export type ReservationDTO = {
  id: string;
  code: string;
  currency: string;
  subtotal: number;
  deliveryType: string;
  address: string | null;
  distanceKm: number | null;
  shippingCost: number;
  total: number;
  paymentMethod: string;
  transferProofUrl: string | null;
  status: string;
  customerNote: string | null;
  createdAt: string;
  items: ReservationItemDTO[];
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendiente de confirmación",
  CONFIRMED: "Confirmada",
  PREPARING: "En preparación",
  SHIPPED: "Enviada",
  DELIVERED: "Entregada",
  CANCELLED: "Cancelada",
};

export const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Efectivo",
  TRANSFER: "Transferencia",
};

export const DELIVERY_LABEL: Record<string, string> = {
  PICKUP: "Retiro en tienda",
  DELIVERY: "Envío a domicilio",
};

export const PLATFORM_LABEL: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  WHATSAPP: "WhatsApp",
  TWITTER: "X / Twitter",
};

export const CAMPAIGN_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador",
  SCHEDULED: "Programada",
  PUBLISHED: "Publicada",
};

export const ROLE_LABEL: Record<string, string> = {
  CLIENT: "Cliente",
  ADMIN: "Administrador",
};

export type ReviewDTO = {
  id: string;
  productId: string;
  authorName: string;
  rating: number;
  comment: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
};

export type StockAlertDTO = {
  id: string;
  productId: string;
  productName: string;
  productStock?: number | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: "NEW" | "NOTIFIED" | "CLOSED";
  createdAt: string;
};

export type CheckoutIntentDTO = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  summary: string;
  itemCount: number;
  total: number;
  currency: string;
  status: "OPEN" | "CONTACTED" | "RECOVERED" | "DISMISSED";
  createdAt: string;
};

export const OCCASION_LABEL: Record<string, string> = {
  DIA: "Día",
  NOCHE: "Noche",
  AMBAS: "Día y noche",
};

export const GENDER_LABEL: Record<string, string> = {
  HOMBRE: "Hombre",
  MUJER: "Mujer",
  UNISEX: "Unisex",
};
