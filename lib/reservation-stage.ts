/**
 * Etapas visibles de una reserva para el cliente.
 *
 * La base guarda un solo campo `status` (PENDING → CONFIRMED → PREPARING →
 * SHIPPED → DELIVERED, o CANCELLED) más la forma de pago y el comprobante. El
 * cliente no tiene que interpretar eso: ve un recorrido de 4 pasos con un
 * nombre claro en cada uno y sabe exactamente dónde está su pedido.
 *
 * Todo lo que muestra la web sale de aquí para que la etiqueta de "Mis
 * reservas", el correo de estado y el panel no puedan contradecirse.
 */

export type ReservationStageInput = {
  status: string;
  paymentMethod: string;
  transferProofUrl: string | null;
  deliveryType: string;
};

export type StageKey = "created" | "paid" | "ready" | "done";

export const STAGE_LABEL: Record<StageKey, string> = {
  created: "Reserva creada",
  paid: "Comprobante / pago",
  ready: "Lista o en camino",
  done: "Entregada",
};

export type ReservationStage = {
  /** 0..3 — en qué paso está hoy. */
  index: number;
  key: StageKey;
  /** Etiqueta corta del estado actual, la que el cliente lee primero. */
  label: string;
  /** Frase que explica qué hacer ahora (o qué está pasando). */
  hint: string;
  /** true cuando la reserva terminó (entregada o cancelada). */
  closed: boolean;
  cancelled: boolean;
  /** Tono visual para las etiquetas. */
  tone: "pending" | "info" | "success" | "danger";
};

const steps: StageKey[] = ["created", "paid", "ready", "done"];

export function reservationStage(r: ReservationStageInput): ReservationStage {
  const isPickup = r.deliveryType === "PICKUP";
  const isTransfer = r.paymentMethod === "TRANSFER";
  const hasProof = Boolean(r.transferProofUrl);

  if (r.status === "CANCELLED") {
    return {
      index: 0,
      key: "created",
      label: "Cancelada",
      hint: "Esta reserva se canceló. Si fue un error, escribinos por WhatsApp y la revisamos.",
      closed: true,
      cancelled: true,
      tone: "danger",
    };
  }

  if (r.status === "DELIVERED") {
    return {
      index: 3,
      key: "done",
      label: isPickup ? "Retirada" : "Entregada",
      hint: "¡Gracias por tu compra! Podés volver a pedir cuando quieras.",
      closed: true,
      cancelled: false,
      tone: "success",
    };
  }

  if (r.status === "SHIPPED") {
    return {
      index: 2,
      key: "ready",
      label: "En camino",
      hint: "Tu pedido salió del local. Coordinamos la entrega por WhatsApp.",
      closed: false,
      cancelled: false,
      tone: "info",
    };
  }

  if (r.status === "PREPARING") {
    return {
      index: 2,
      key: "ready",
      label: isPickup ? "Preparando tu retiro" : "Preparando el envío",
      hint: "Estamos alistando tu pedido. Te avisamos cuando esté listo.",
      closed: false,
      cancelled: false,
      tone: "info",
    };
  }

  if (r.status === "CONFIRMED") {
    return {
      index: 2,
      key: "ready",
      label: isPickup ? "Lista para retirar" : "Lista para enviar",
      hint: isPickup
        ? "Ya podés pasar por la tienda a retirarla."
        : "Confirmamos tu reserva y coordinamos el envío por WhatsApp.",
      closed: false,
      cancelled: false,
      tone: "success",
    };
  }

  // status PENDING — depende de si el pago ya está justificado.
  if (isTransfer && !hasProof) {
    return {
      index: 0,
      key: "created",
      label: "Pendiente de comprobante",
      hint: "Subí el comprobante de la transferencia para que podamos confirmarla.",
      closed: false,
      cancelled: false,
      tone: "pending",
    };
  }

  if (isTransfer && hasProof) {
    return {
      index: 1,
      key: "paid",
      label: "Comprobante recibido",
      hint: "Recibimos tu comprobante. Estamos verificando el pago.",
      closed: false,
      cancelled: false,
      tone: "info",
    };
  }

  return {
    index: 1,
    key: "paid",
    label: "Esperando confirmación",
    hint: "Pagás en efectivo al retirar o recibir. La tienda está revisando tu reserva.",
    closed: false,
    cancelled: false,
    tone: "pending",
  };
}

/** Nombres legibles de los cuatro pasos, ya adaptados a retiro o envío. */
export function stagePath(deliveryType: string): { key: StageKey; label: string }[] {
  const isPickup = deliveryType === "PICKUP";
  return steps.map((key) => ({
    key,
    label:
      key === "ready"
        ? isPickup
          ? "Lista para retirar"
          : "En camino"
        : key === "done"
          ? isPickup
            ? "Retirada"
            : "Entregada"
          : STAGE_LABEL[key],
  }));
}
