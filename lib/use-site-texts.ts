"use client";

import { useSettings } from "./settings-context";
import { DEFAULT_SITE_TEXTS, resolveSiteTexts, type SiteTexts } from "./site-texts";

/**
 * Devuelve los textos editables del sitio para los componentes cliente.
 *
 * El layout raíz monta `<SettingsProvider>` con los ajustes del servidor, así
 * que acá sólo hay que resolverlos: si la tienda guardó un texto se usa ese,
 * y si no, el valor por defecto. Nunca devuelve claves vacías, así que un
 * texto borrado en el panel no deja un hueco en la página.
 */
export function useSiteTexts(): SiteTexts {
  const { settings } = useSettings();
  if (!settings.siteTexts) return DEFAULT_SITE_TEXTS as unknown as SiteTexts;
  return resolveSiteTexts(settings.siteTexts);
}
