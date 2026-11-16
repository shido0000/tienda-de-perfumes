"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { MapPin } from "@phosphor-icons/react/dist/ssr";
import { MapBoundary } from "../MapBoundary";

/**
 * Leaflet toca `window` en cuanto se importa, así que el mapa se carga solo en
 * el cliente. Este envoltorio existe para que AdminSettings (un componente de
 * cliente normal) no arrastre la librería al render del servidor.
 *
 * Además: el mapa se carga bajo demanda (al pulsar "Mostrar mapa") y va envuelto
 * en un error boundary. Así, si el trozo de Leaflet no llega (red lenta, proxy o
 * bloqueo), la pestaña de Ajustes NO se cae entera: las coordenadas se siguen
 * pudiendo escribir a mano.
 */
const MapPicker = dynamic(() => import("../MapPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-card border border-line bg-bg text-xs text-muted">
      Cargando mapa…
    </div>
  ),
});

export function StoreMapPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number) => void;
}) {
  const [show, setShow] = useState(false);
  const valid =
    Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

  if (!show) {
    return (
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          Las coordenadas de arriba definen desde dónde se calcula el envío.
        </p>
        <button
          type="button"
          onClick={() => setShow(true)}
          className="flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-xs text-ink transition-colors hover:border-primary hover:text-primary"
        >
          <MapPin size={14} /> Mostrar mapa
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <MapBoundary hint="Escribí la latitud y la longitud de la tienda arriba y guardá igual.">
        <MapPicker
          storeLat={valid ? lat : 23.1136}
          storeLng={valid ? lng : -82.3666}
          lat={valid ? lat : null}
          lng={valid ? lng : null}
          onPick={onPick}
        />
      </MapBoundary>
      <p className="text-xs text-muted">
        Tocá el punto exacto de la tienda en el mapa y las coordenadas de arriba
        se completan solas.
      </p>
    </div>
  );
}
