export interface Ticket {
  id: string;
  place: string | null;
  tableLabel: string | null;
  currency: string;
  /** Total impreso en el ticket, en céntimos. */
  totalCents: number;
  payerId: string | null;
  createdAt: string;
  closed?: boolean;
}

export interface Item {
  id: string;
  ticketId: string;
  receiptId?: string;
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
  avatar?: string;
  color: string;
  /** Quien puso la tarjeta. Sólo puede haber uno. */
  isPayer: boolean;
  /**
   * Cómo quiere que le devuelvan lo suyo.
   *
   * Cuelga de la persona y no del papel de «el que pagó» a propósito: con
   * varios tickets puede haber dos cobrando a la vez, y así cada uno pone el
   * suyo y nadie tiene que poder tocar el de otro. Es la respuesta entera a
   * quién tiene permiso para esto.
   */
  revolut?: string;
  /** El móvil del Bizum, en nueve dígitos y sin prefijo. */
  bizum?: string;
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
  kind:
    | "item.remove"
    | "item.add"
    | "total.edit"
    | "payer.set"
    | "pago.ok"
    | "mesa.nombre"
    /** Alguien ha cambiado a qué móvil o a qué usuario se le paga. */
    | "cobro.edit";
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

/**
 * Un pago entre dos personas de la mesa, con sus dos mitades.
 *
 * Dos mitades porque el dinero sale de un sitio y entra en otro, y entre las
 * dos cosas pasa un rato: quien paga lo dice al volver de su banco, y hasta que
 * el otro no lo ve en su cuenta no está cobrado. Dar por hecho lo segundo al
 * ocurrir lo primero llenaría de pagos falsos la lista de quien adelantó la
 * cena, que es exactamente la persona a la que esto tiene que servirle.
 *
 * Un registro por pareja: `fromId` le debe a `toId`, y esa deuda es una sola.
 */
export interface Pago {
  fromId: string;
  toId: string;
  cents: number;
  via: Via;
  /** «dice» = lo ha enviado y falta que el otro lo vea. «ok» = cobrado. */
  estado: "dice" | "ok";
  /** ISO del último cambio de estado. */
  at: string;
}

/** Por dónde ha ido el dinero. «mano» es efectivo o cualquier otra cosa. */
export type Via = "revolut" | "bizum" | "mano";

export interface Receipt {
  id: string;
  label: string;
  totalCents: number;
  payerId: string | null;
}

export interface TicketState {
  ticket: Ticket;
  receipts: Receipt[];
  items: Item[];
  participants: Participant[];
  claims: Claim[];
  /** Del más reciente al más viejo. */
  events: ChangeEvent[];
  pagos: Pago[];
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
  avatar?: string;
  color: string;
  /** Lo que adelantó (si pagó algún ticket/recibo). */
  paidCents: number;
  /** Suma de sus platos. */
  itemsCents: number;
  /** Su parte proporcional de servicio, impuestos o descuento. */
  extrasCents: number;
  /** (itemsCents + extrasCents) - paidCents. Positivo = debe al bote. Negativo = el bote le debe. */
  owesCents: number;
  /** Ya ha saldado su balance. */
  settled: boolean;
}

export interface Transaction {
  fromId: string;
  toId: string;
  cents: number;
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
  transactions: Transaction[];
  complete: boolean;
}
