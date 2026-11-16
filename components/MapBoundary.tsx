"use client";

import { Component, type ReactNode } from "react";

/**
 * Evita que un fallo al cargar el mapa (Leaflet se importa de forma dinámica y
 * su trozo puede no llegar por red lenta, proxy o bloqueo) tumbe la página
 * entera. Muestra un aviso en su lugar; el resto del formulario sigue usable.
 */
export class MapBoundary extends Component<
  { children: ReactNode; hint?: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="rounded-card border border-line bg-bg p-6 text-center">
          <p className="text-sm text-ink">No se pudo cargar el mapa ahora mismo.</p>
          <p className="mt-1 text-xs text-muted">
            {this.props.hint ??
              "Podés seguir igual: escribí la dirección a mano y guardá."}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
