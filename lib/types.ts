export interface Ticket {
  id: string;
  place: string | null;
  tableLabel: string | null;
  currency: string;
  /** Total impreso en el ticket, en céntimos. */
  totalCents: number;
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
  /** Quien puso la tarjeta. Sólo puede haber uno. */
  isPayer: boolean;
  /**
   * true cuando ya le ha devuelto su parte a quien pagó.
   *
   * Es un sí o un no, no un importe: lo que la mesa necesita saber es quién
   * falta, y cada uno debe exactamente su parte. Guardar cuánto puso cada cual
   * sólo hacía falta para repartir entre varios pagadores, que es justo la
   * complicación que sobraba.
   */
  settled: boolean;
}

/** Cuántas partes de una línea se ha quedado alguien. */
export interface Claim {
  itemId: string;
  participantId: string;
  shares: number;
}

/**
 * Un cambio que mueve dinero, con nombre y apellidos.
 *
 * Quitar una línea baja el total de la mesa, y hasta ahora desaparecía sin
 * dejar rastro: nadie podía saber que la paella había estado ahí. No es una
 * medida de seguridad —cualquiera puede entrar diciendo que se llama Ana— sino
 * social: lo que frena a quien iba a quitar su chuletón es que se vea.
 */
export interface ChangeEvent {
  /** ISO. Sirve además de clave: dos cambios no caen en el mismo milisegundo. */
  at: string;
  kind: "item.remove" | "item.add" | "total.edit";
  participantId: string | null;
  /**
   * El nombre congelado en el momento del cambio. Guardarlo duplicado es a
   * propósito: quien quitó la línea puede irse de la mesa después, y el
   * historial tiene que seguir diciendo quién fue.
   */
  by: string;
  /** La línea afectada, o el total viejo cuando se edita el total. */
  what: string;
  /** Lo que la línea costaba, o el total nuevo. */
  cents: number;
}

export interface TicketState {
  ticket: Ticket;
  items: Item[];
  participants: Participant[];
  claims: Claim[];
  /** Del más reciente al más viejo. */
  events: ChangeEvent[];
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
  /** Su parte proporcional de servicio, impuestos o descuento. */
  extrasCents: number;
  /** itemsCents + extrasCents: lo que le toca pagar. */
  owesCents: number;
  /** Ya ha devuelto lo suyo. Quien pagó lo está siempre: adelantó la cuenta. */
  settled: boolean;
}

export interface Settlement {
  itemsTotalCents: number;
  /** total del ticket - suma de platos (servicio, impuestos, descuentos…). */
  extrasCents: number;
  grandTotalCents: number;
  /** Importe de platos todavía sin dueño. */
  unassignedCents: number;
  assignedCents: number;
  /** Lo que falta por devolverle a quien pagó. */
  pendingCents: number;
  byItem: Record<string, ItemBreakdown>;
  /** De más a menos: arriba quien más debe, y los que ya pagaron al final. */
  byParticipant: ParticipantBalance[];
  complete: boolean;
}
