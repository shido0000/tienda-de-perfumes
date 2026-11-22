"use client";

import { useSettings } from "./settings-context";
import { convert, findCurrency, formatMoney } from "./currency";

/**
 * Converts a product's own currency into the currency the visitor sees, and
 * formats it with that currency's symbol.
 *
 * `secondary` devuelve el mismo importe en la segunda moneda cuando la tienda
 * activó "mostrar el precio en dos monedas" (Administración → Ajustes).
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

  const second = settings.showSecondCurrency
    ? findCurrency(settings.currencies, settings.secondCurrency ?? "USD")
    : null;

  /** Precio en la segunda moneda, o null si la opción está apagada. */
  const priceSecond = (amount: number, fromCurrency: string) => {
    if (!second) return null;
    const converted = convert(
      Number(amount),
      fromCurrency,
      second.code,
      settings.currencies,
    );
    return formatMoney(converted, second);
  };

  return { price, priceSecond, currency, secondCurrency: second };
}
