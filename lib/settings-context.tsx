"use client";

import { createContext, useContext, useMemo } from "react";
import type { Currency, StoreSettings } from "./cart-context";

type SettingsContextValue = {
  // Always present: the provider is mounted in the root layout with server
  // settings, so components never have to null-check store configuration.
  settings: StoreSettings;
  /** Moneda de visualización fijada por el administrador (la decide la tienda). */
  currency: Currency;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * La moneda ya NO la elige el visitante: la define la tienda en
 * Administración → Ajustes y todos los precios se muestran en ella.
 */
export function SettingsProvider({
  initial,
  children,
}: {
  initial: StoreSettings;
  children: React.ReactNode;
}) {
  const settings = initial;

  const currency: Currency = useMemo(
    () =>
      settings.currencies.find((c) => c.code === settings.displayCurrency) ??
      settings.currencies.find((c) => c.code === settings.baseCurrency) ??
      settings.currencies[0],
    [settings.currencies, settings.displayCurrency, settings.baseCurrency],
  );

  return (
    <SettingsContext.Provider value={{ settings, currency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
