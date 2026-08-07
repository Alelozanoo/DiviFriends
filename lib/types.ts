export type SplitMode = "units" | "shared";

export interface Ticket {
  id: string;
  place: string | null;
  tableLabel: string | null;
  currency: string;
  /** Total impreso en el ticket, en céntimos. */
  totalCents: number;
  /** Propina añadida por el grupo (no está en el ticket), en céntimos. */
  tipCents: number;
  createdAt: string;
}

export interface Item {
  id: string;
  ticketId: string;
  name: string;
  qty: number;
  unitCents: number;
  totalCents: number;
  splitMode: SplitMode;
  position: number;
}

export interface Participant {
  id: string;
  ticketId: string;
  name: string;
  color: string;
  isPayer: boolean;
  paidCents: number;
}

export interface Claim {
  itemId: string;
  participantId: string;
  units: number;
}

export interface TicketState {
  ticket: Ticket;
  items: Item[];
  participants: Participant[];
  claims: Claim[];
}

/** Lo que un comensal debe por un plato concreto. */
export interface ItemShare {
  participantId: string;
  units: number;
  cents: number;
}

export interface ItemBreakdown {
  itemId: string;
  claimedUnits: number;
  freeUnits: number;
  unassignedCents: number;
  shares: ItemShare[];
  /** true cuando ya no queda nada por repartir de este plato. */
  settled: boolean;
}

export interface ParticipantBalance {
  participantId: string;
  name: string;
  color: string;
  isPayer: boolean;
  /** Suma de sus platos. */
  itemsCents: number;
  /** Su parte proporcional de servicio/descuento/propina. */
  extrasCents: number;
  /** itemsCents + extrasCents: lo que le toca pagar. */
  owesCents: number;
  paidCents: number;
  /** paidCents - owesCents. Positivo = le deben; negativo = debe. */
  balanceCents: number;
}

export interface Settlement {
  itemsTotalCents: number;
  /** total del ticket - suma de platos (servicio, impuestos, descuentos…). */
  extrasCents: number;
  tipCents: number;
  grandTotalCents: number;
  /** Importe de platos todavía sin dueño. */
  unassignedCents: number;
  assignedCents: number;
  paidCents: number;
  /** paidCents - grandTotalCents. Positivo = se ha pagado de más. */
  overpaidCents: number;
  byItem: Record<string, ItemBreakdown>;
  byParticipant: ParticipantBalance[];
  /** Quién le paga a quién, con el mínimo de transferencias. */
  transfers: Transfer[];
  complete: boolean;
}

export interface Transfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  cents: number;
}
