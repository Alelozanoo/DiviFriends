import type { Claim, Item, Participant, SplitMode, TicketState } from "./types";

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
  tipCents: number;
  createdAt: string;
  updatedAt: string;
  items: ItemDoc[];
  participants: ParticipantDoc[];
  claims: Claim[];
}

export interface ItemDoc {
  id: string;
  name: string;
  qty: number;
  unitCents: number;
  totalCents: number;
  splitMode: SplitMode;
  position: number;
}

export interface ParticipantDoc {
  id: string;
  name: string;
  color: string;
  isPayer: boolean;
  paidCents: number;
}

/** Topes para que el documento no pueda crecer sin control. */
export const LIMITS = { items: 200, participants: 25 } as const;

export function docToState(code: string, doc: TicketDoc): TicketState {
  const items: Item[] = [...(doc.items ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((item) => ({ ...item, ticketId: code }));

  const participants: Participant[] = (doc.participants ?? []).map((person) => ({
    ...person,
    ticketId: code,
  }));

  return {
    ticket: {
      id: code,
      place: doc.place ?? null,
      tableLabel: doc.tableLabel ?? null,
      currency: doc.currency ?? "EUR",
      totalCents: doc.totalCents ?? 0,
      tipCents: doc.tipCents ?? 0,
      createdAt: doc.createdAt ?? "",
    },
    items,
    participants,
    // Un claim huérfano (plato o comensal ya borrado) descuadraría el reparto.
    claims: (doc.claims ?? []).filter(
      (claim) =>
        items.some((i) => i.id === claim.itemId) &&
        participants.some((p) => p.id === claim.participantId),
    ),
  };
}

export function isTicketDoc(value: unknown): value is TicketDoc {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as TicketDoc).items) &&
    Array.isArray((value as TicketDoc).participants)
  );
}
