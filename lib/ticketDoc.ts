import type { Claim, Item, Participant, TicketState } from "./types";

/**
 * Una comanda entera vive en un solo documento de Firestore (`tickets/{CODE}`).
 *
 * Es deliberado: una mesa tiene decenas de líneas, no miles, así que el
 * documento se queda muy por debajo del límite de 1 MiB. A cambio se gana lo
 * que de verdad importa aquí: un único `onSnapshot` sincroniza toda la pantalla,
 * y cada cambio es una transacción sobre un solo documento, o sea atómica de
 * verdad — dos personas tocando el mismo plato a la vez no se pisan.
 *
 * Todos los campos son primitivos serializables (nada de Timestamp), para que
 * el mismo objeto valga tal cual en el servidor y en el navegador.
 */
export interface TicketDoc {
  place: string | null;
  tableLabel: string | null;
  currency: string;
  totalCents: number;
  /** @deprecated La propina se quitó: complicaba la pantalla de cuentas. */
  tipCents?: number;
  createdAt: string;
  updatedAt: string;
  items: ItemDoc[];
  participants: ParticipantDoc[];
  claims: ClaimDoc[];
}

export interface ItemDoc {
  id: string;
  name: string;
  qty: number;
  unitCents: number;
  totalCents: number;
  splitInto: number;
  manualSplit?: boolean;
  position: number;
  /** @deprecated Comandas anteriores al modelo de partes. */
  splitMode?: "units" | "shared";
}

export interface ClaimDoc {
  itemId: string;
  participantId: string;
  shares?: number;
  /** @deprecated Se llamaba así antes de hablar de partes. */
  units?: number;
}

export interface ParticipantDoc {
  id: string;
  name: string;
  color: string;
  isPayer: boolean;
  settled?: boolean;
  /** @deprecated Antes se guardaba cuánto puso cada uno; ahora es un sí o un no. */
  paidCents?: number;
}

/** Topes para que el documento no pueda crecer sin control. */
export const LIMITS = { items: 200, participants: 25, splitInto: 50 } as const;

export function docToState(code: string, doc: TicketDoc): TicketState {
  const rawClaims = doc.claims ?? [];

  const items: Item[] = [...(doc.items ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((raw) => ({
      id: raw.id,
      ticketId: code,
      name: raw.name,
      qty: raw.qty,
      unitCents: raw.unitCents,
      totalCents: raw.totalCents,
      splitInto: resolveSplitInto(raw, rawClaims),
      manualSplit: raw.manualSplit === true,
      position: raw.position,
    }));

  const participants: Participant[] = (doc.participants ?? []).map((person) => ({
    id: person.id,
    ticketId: code,
    name: person.name,
    color: person.color,
    isPayer: person.isPayer === true,
    // Comandas abiertas ahora mismo en algún móvil guardan un importe en vez de
    // un sí/no. Haber puesto algo equivale a estar saldado.
    settled: person.settled ?? (person.paidCents ?? 0) > 0,
  }));

  const claims: Claim[] = rawClaims
    .map((raw) => ({
      itemId: raw.itemId,
      participantId: raw.participantId,
      shares: Math.max(1, Math.round(raw.shares ?? raw.units ?? 1)),
    }))
    // Un claim huérfano (plato o comensal ya borrado) descuadraría el reparto.
    .filter(
      (claim) =>
        items.some((i) => i.id === claim.itemId) &&
        participants.some((p) => p.id === claim.participantId),
    );

  return {
    ticket: {
      id: code,
      place: doc.place ?? null,
      tableLabel: doc.tableLabel ?? null,
      currency: doc.currency ?? "EUR",
      totalCents: doc.totalCents ?? 0,
      createdAt: doc.createdAt ?? "",
    },
    items,
    participants,
    claims,
  };
}

/**
 * Comandas creadas con el modelo viejo (`splitMode`) siguen abiertas en móviles
 * ahora mismo, así que se traducen al vuelo en vez de migrar la base de datos:
 * «por unidades» era repartir entre las unidades impresas, y «compartido» era
 * repartir entre quienes se hubieran apuntado.
 */
function resolveSplitInto(item: ItemDoc, claims: ClaimDoc[]): number {
  if (typeof item.splitInto === "number" && item.splitInto >= 1) {
    return Math.round(item.splitInto);
  }
  if (item.splitMode === "shared") {
    const takers = claims.filter((c) => c.itemId === item.id).length;
    return Math.max(1, takers);
  }
  return Math.max(1, Math.round(item.qty || 1));
}

export function isTicketDoc(value: unknown): value is TicketDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as TicketDoc).items) &&
    Array.isArray((value as TicketDoc).participants)
  );
}
