import type { Settlement, TicketState } from "./types";

/**
 * Quién puede reclamarle a quién, y cuánto.
 *
 * Vive aparte de la ruta —y no dentro, que es donde nació— porque es lo único
 * que decide si a alguien le llega un correo a su bandeja con su nombre y una
 * cifra. Eso hay que poder probarlo sin sesión, sin red y sin mandar nada, y
 * una función que sólo mira la mesa y las cuentas sí se puede.
 *
 * La regla es la de la mesa, no la de la app: reclama quien puso la tarjeta,
 * a quien le debe. Ni al revés, ni a uno mismo, ni cuando ya está saldado.
 */

export type NoPuede =
  | "no-sentado"
  | "no-pagaste"
  | "a-ti-mismo"
  | "no-debe";

export type Veredicto = { puede: true; cents: number } | { puede: false; porque: NoPuede };

/** Los mensajes que ve quien lo intenta, con el código que devuelve la ruta. */
export const PORQUE: Record<NoPuede, { mensaje: string; status: number }> = {
  "no-sentado": { mensaje: "Primero siéntate en la mesa.", status: 403 },
  "no-pagaste": { mensaje: "Sólo quien puso la tarjeta puede recordarlo.", status: 403 },
  "a-ti-mismo": { mensaje: "A ti mismo no.", status: 400 },
  "no-debe": { mensaje: "Esta persona no debe nada.", status: 409 },
};

/** ¿Puso este la tarjeta? Vale la mesa entera o cualquiera de sus tickets. */
export function pagoLaCuenta(state: TicketState, participantId: string): boolean {
  return (
    state.ticket.payerId === participantId ||
    state.participants.some((p) => p.id === participantId && p.isPayer) ||
    (state.receipts ?? []).some((r) => r.payerId === participantId)
  );
}

export function puedeRecordar(p: {
  state: TicketState;
  settlement: Settlement;
  /** Quien reclama, por su sitio en la mesa. */
  yo: string | null;
  aQuien: string;
}): Veredicto {
  const { state, settlement, yo, aQuien } = p;
  if (!yo || !state.participants.some((x) => x.id === yo)) return { puede: false, porque: "no-sentado" };
  if (!pagoLaCuenta(state, yo)) return { puede: false, porque: "no-pagaste" };
  if (yo === aQuien) return { puede: false, porque: "a-ti-mismo" };

  const deudor = settlement.byParticipant.find((x) => x.participantId === aQuien);
  if (!deudor || deudor.owesCents <= 0 || deudor.settled) return { puede: false, porque: "no-debe" };

  /*
    Lo que te debe *a ti*, no lo que debe al bote.

    Con dos personas poniendo tarjeta, la mesa netea: puede deber 30 € en total
    y a ti sólo 12. El correo lleva la cifra que esa persona te tiene que
    mandar, que es la misma que le enseña su propia pantalla. Si no hay
    transacción hacia ti —la mesa no la ha calculado— se cae a lo que debe, que
    en una mesa de un solo pagador es exactamente lo mismo.
  */
  const cents =
    settlement.transactions.find((tx) => tx.fromId === aQuien && tx.toId === yo)?.cents ??
    deudor.owesCents;
  if (cents <= 0) return { puede: false, porque: "no-debe" };
  return { puede: true, cents };
}

/* ---------------------------------------------------------- lo que se dice */

/** Los cuatro tonos, por su nombre en la hoja. */
export const TONOS = ["neutro", "serio", "gracioso", "agresivo"] as const;
export type Tono = (typeof TONOS)[number];

/**
 * El texto del correo, según el tono.
 *
 * Ninguno insulta: va firmado por DiviFriends y llega a la bandeja de una
 * persona real, a veces por una deuda de tres euros. El agresivo es seco, no
 * grosero — la diferencia es la que hay entre apretar y agredir, y la paga
 * quien lo recibe.
 */
export function textoRecordatorio(p: {
  mesa: string | null;
  quien: string;
  /** Ya formateado, «12,50 €». */
  dinero: string;
  tono: Tono;
}): { asunto: string; texto: string; boton: string } {
  const mesa = p.mesa ?? "la mesa";
  const { quien, dinero } = p;
  const textos: Record<Tono, { asunto: string; texto: string; boton: string }> = {
    neutro: {
      asunto: `Te falta pagar ${dinero} a ${quien}`,
      texto: `${quien} puso la tarjeta en ${mesa} y te toca devolverle ${dinero}. Entra y salda tu parte cuando puedas.`,
      boton: "Ver mi parte",
    },
    serio: {
      asunto: `${quien} sigue esperando ${dinero}`,
      texto: `De la cuenta de ${mesa}, tu parte son ${dinero} y todavía no le han llegado a ${quien}. Te agradecería que lo dejaras hecho hoy.`,
      boton: "Saldar mi parte",
    },
    gracioso: {
      asunto: `Tu parte de ${mesa} sigue viva: ${dinero}`,
      texto: `Sabemos que lo de ${mesa} ya queda lejos, pero los ${dinero} de ${quien} no se han evaporado. Bizum, Revolut o en mano, y aquí paz.`,
      boton: "Pagar y quedar como un señor",
    },
    agresivo: {
      asunto: `${dinero}. A ${quien}. Hoy.`,
      texto: `${quien} pagó lo tuyo en ${mesa} y llevas ${dinero} a deber. No es un favor, es tu cuenta: entra y págala.`,
      boton: "Pagar ahora",
    },
  };
  return textos[p.tono];
}

/**
 * Una al día por persona y mesa. El tono no entra en la clave a propósito:
 * si entrara, cambiar de tono sería la forma de escribir cuatro veces seguidas.
 */
export function claveRecordatorio(code: string, uid: string, dia: string): string {
  return `recordatorio.${code}.${uid}.${dia}`;
}
