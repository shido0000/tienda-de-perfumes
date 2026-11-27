"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Currency = { code: string; symbol: string; rate: number; label: string };

import type { SiteTexts } from "./site-texts";
import type { SessionUser } from "./session";
import { trackUrl } from "./manager-client";

export type StoreSettings = {
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
  /** Si está activo, el cliente ve además el precio en la segunda moneda. */
  showSecondCurrency?: boolean;
  /** Código de la segunda moneda (p. ej. USD). */
  secondCurrency?: string;
  /** Si está activo, el cliente ve cuántas unidades quedan. */
  showStock?: boolean;
  currencies: Currency[];
  /** Opcional: números que reciben el aviso de reservas (solo administración los usa). */
  notificationPhones?: string[];
  /** Logo subido desde Administración → Contenido (data URL o URL externa). */
  logoUrl?: string | null;
  /** Textos editables del sitio (nav, secciones, pie). */
  siteTexts?: SiteTexts;
};

export type CartLine = {
  /** Para combos es `combo:<id>`, para productos es el id del producto. */
  productId: string;
  quantity: number;
  name: string;
  brand: string;
  price: number;
  currency: string;
  image: string | null;
  /** Unidades disponibles. null = sin control de inventario. */
  stock?: number | null;
  /** "combo" cuando la línea es una oferta que agrupa varios productos. */
  kind?: "combo";
  comboId?: string;
  /** Qué productos y cantidades trae el combo (informativo para el carrito). */
  components?: { productId: string; quantity: number; name: string }[];
};

export const comboLineId = (comboId: string) => `combo:${comboId}`;
export const isComboLine = (line: CartLine) => line.kind === "combo";

/** Tope de unidades por línea: el stock disponible, o 20 si no se controla. */
function capFor(line: { stock?: number | null }): number {
  if (typeof line.stock === "number") return Math.max(0, Math.min(20, line.stock));
  return 20;
}

type CartContextValue = {
  lines: CartLine[];
  count: number;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  ready: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "nac_cart_v1";

function readLocal(): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartLine[]) : [];
  } catch {
    return [];
  }
}

/**
 * Cart that works for guests (localStorage) and for signed-in customers
 * (persisted in Postgres). The local copy is always the render source so the UI
 * never flickers; when a session exists we mirror changes to the server.
 */
export function CartProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: SessionUser | null;
}) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(Boolean(initialUser));

  useEffect(() => {
    setLines(readLocal());
    setReady(true);
    let cancelled = false;
    (async () => {
      try {
        let authenticated = Boolean(initialUser);
        if (initialUser === undefined) {
          authenticated = await fetch("/api/auth/me").then((r) => r.ok);
          if (cancelled) return;
          setSignedIn(authenticated);
        }
        if (!authenticated) return;
        const data = await fetch("/api/cart").then((r) => r.json());
        const serverLines: CartLine[] = (data.items ?? [])
          .filter((i: any) => i.product)
          .map((i: any) => ({
            productId: i.productId,
            quantity: i.quantity,
            name: i.product.name,
            brand: i.product.brand,
            price: Number(i.product.price),
            currency: i.product.currency,
            image: i.product.images?.[0] ?? null,
            stock: i.product.stock ?? null,
          }));
        if (!cancelled) {
          setLines((prev) => (serverLines.length ? serverLines : prev));
        }
      } catch {
        /* offline: keep the local cart */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialUser]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage full or private mode — the cart still works in memory */
    }
  }, [lines, ready]);

  const sync = useCallback(
    (productId: string, quantity: number) => {
      if (!signedIn) return;
      // Los combos no se guardan en el carrito del servidor (el servidor sólo
      // conoce productos sueltos); viven en el navegador y se envían al
      // confirmar la reserva, donde el servidor los expande.
      if (productId.startsWith("combo:")) return;
      if (quantity <= 0) {
        fetch(`/api/cart?productId=${encodeURIComponent(productId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, quantity: 0 }),
        }).catch(() => {});
        return;
      }
      fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      }).catch(() => {});
    },
    [signedIn],
  );

  /**
   * Avisa al servidor que alguien agregó algo al carrito, para que el panel
   * pueda mostrar los carritos que se están armando y por qué canal llegó la
   * persona (tienda directa o enlace de un gestor). Un fallo aquí no afecta al
   * carrito: es solo una anotación de audiencia.
   */
  const trackAdd = useCallback((line: Omit<CartLine, "quantity">, quantity: number) => {
    if (!(quantity > 0)) return;
    try {
      fetch(trackUrl(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: line.productId,
          productName: line.name,
          quantity,
          unitPrice: Number(line.price) || 0,
          currency: line.currency || "ARS",
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      /* nunca interrumpe el carrito */
    }
  }, []);

  const add: CartContextValue["add"] = useCallback(
    (line, quantity = 1) => {
      trackAdd(line, quantity);
      setLines((prev) => {
        const existing = prev.find((l) => l.productId === line.productId);
        if (existing) {
          const cap = capFor(existing);
          const nextQty = Math.min(cap, existing.quantity + quantity);
          sync(line.productId, nextQty);
          return prev.map((l) =>
            l.productId === line.productId ? { ...l, quantity: nextQty, stock: existing.stock } : l,
          );
        }
        const cap = capFor(line);
        const nextQty = Math.min(cap, Math.max(0, quantity));
        if (nextQty <= 0) return prev;
        sync(line.productId, nextQty);
        return [...prev, { ...line, quantity: nextQty }];
      });
    },
    [sync, trackAdd],
  );

  const setQuantity: CartContextValue["setQuantity"] = useCallback(
    (productId, quantity) => {
      setLines((prev) => {
        const line = prev.find((l) => l.productId === productId);
        const cap = line ? capFor(line) : 20;
        const q = Math.max(0, Math.min(cap, quantity));
        sync(productId, q);
        return q === 0
          ? prev.filter((l) => l.productId !== productId)
          : prev.map((l) => (l.productId === productId ? { ...l, quantity: q } : l));
      });
    },
    [sync],
  );

  const remove: CartContextValue["remove"] = useCallback(
    (productId) => {
      setLines((prev) => prev.filter((l) => l.productId !== productId));
      sync(productId, 0);
    },
    [sync],
  );

  const clear = useCallback(() => {
    setLines([]);
    if (signedIn) fetch("/api/cart", { method: "DELETE" }).catch(() => {});
  }, [signedIn]);

  const value = useMemo(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      add,
      setQuantity,
      remove,
      clear,
      ready,
    }),
    [lines, add, setQuantity, remove, clear, ready],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
