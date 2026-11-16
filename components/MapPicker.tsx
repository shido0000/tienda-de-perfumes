"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * Map used to pick the delivery point. Tiles are OpenStreetMap's public tile
 * server — no API key, no secret. Store position and the picked point are
 * passed straight to /api/shipping/quote for the distance calculation.
 */
// Colores tomados de los tokens del tema (--color-accent / --color-ink / --color-surface).
const markerIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:rgb(var(--color-primary));border:2px solid rgb(var(--color-surface));box-shadow:0 0 0 4px rgb(var(--color-primary) / 0.25)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const storeIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:2px;background:rgb(var(--color-accent));border:2px solid rgb(var(--color-ink))"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prev = useRef<string>("");
  useEffect(() => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (prev.current === key) return;
    prev.current = key;
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function MapPicker({
  storeLat,
  storeLng,
  lat,
  lng,
  onPick,
}: {
  storeLat: number;
  storeLng: number;
  lat: number | null;
  lng: number | null;
  onPick: (lat: number, lng: number) => void;
}) {
  const center = useMemo<[number, number]>(
    () => [lat ?? storeLat, lng ?? storeLng],
    [lat, lng, storeLat, storeLng],
  );

  return (
    <div className="overflow-hidden rounded-card border border-line">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: 280, width: "100%", background: "rgb(var(--color-line))" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[storeLat, storeLng]} icon={storeIcon} title="Tienda" />
        {lat !== null && lng !== null && (
          <>
            <Marker position={[lat, lng]} icon={markerIcon} title="Tu entrega" />
            <Recenter lat={lat} lng={lng} />
          </>
        )}
        <ClickHandler onPick={onPick} />
      </MapContainer>
    </div>
  );
}
