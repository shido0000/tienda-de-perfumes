"use client";

import { useSettings } from "./settings-context";
import { convert, formatMoney } from "./currency";

/**
 * Converts a product's own currency into the currency the visitor selected in
 * the header, and formats it with that currency's symbol.
 */
export function usePrice() {
  const { settings, currency } = useSettings();

  const price = (amount: number, fromCurrency: string) => {
    const converted = convert(
      Number(amount),
      fromCurrency,
      currency.code,
      settings.currencies,
    );
    return formatMoney(converted, currency);
  };

  return { price, currency };
}
