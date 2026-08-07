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
  /** Unidades impresas en el ticket. Sólo informativo. */
  qty: number;
  unitCents: number;
  totalCents: number;
  /**
   * En cuántas partes se reparte esta línea. Es el denominador y basta él solo
   * para describir cualquier caso:
   *
   *   3 cañas          -> splitInto 3, cada uno coge la suya
   *   una paella       -> splitInto 1, se la queda quien la pida
   *   paella entre 4   -> splitInto 4, tu parte vale 1/4 desde el primer toque,
   *                       sin esperar a que los otros tres se apunten
   *
   * Sólo cambia cuando alguien lo pide con el ÷. Antes crecía solo para hacer
   * hueco a quien tocaba una línea llena, y eso cobraba de más sin avisar.
   */
  splitInto: number;
  /** true cuando el reparto lo pidió una persona con el ÷ («entre 4»). */
  manualSplit: boolean;
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

/** Cuántas partes de una línea se ha quedado alguien. */
export interface Claim {
  itemId: string;
  participantId: string;
  shares: number;
}

export interface TicketState {
  ticket: Ticket;
  items: Item[];
  participants: Participant[];
  claims: Claim[];
}

export interface ItemShare {
  participantId: string;
  shares: number;
  cents: number;
}

export interface ItemBreakdown {
  itemId: string;
  takenShares: number;
  freeShares: number;
  unassignedCents: number;
  /** Lo que vale una parte, para poder enseñarlo antes de tocar nada. */
  perShareCents: number;
  shares: ItemShare[];
  /** true cuando ya no queda nada por repartir de esta línea. */
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
