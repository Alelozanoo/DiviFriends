import { Timestamp } from "firebase-admin/firestore";
import { firestore, TICKETS } from "./firebaseAdmin";
import { docToState, LIMITS, type EventDoc, type ItemDoc, type TicketDoc } from "./ticketDoc";
import { colorFor, id, ticketCode } from "./format";
import { computeSettlement, totalAfterRemoving } from "./settle";
import { limpiaRevolut, limpiaTelefono } from "./cobro";
import type { TicketState, Via } from "./types";

export class StoreError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

/* --------------------------------------------------------------- lecturas */

export async function getTicketState(code: string): Promise<TicketState | null> {
  const snap = await firestore().collection(TICKETS).doc(code).get();
  if (!snap.exists) return null;
  return docToState(code, snap.data() as TicketDoc);
}

/* -------------------------------------------------------------- escrituras */

/**
 * Toda mutación es una transacción sobre el único documento de la comanda:
 * dos personas tocando el mismo plato a la vez no se pisan, y siempre se
 * devuelve el estado completo ya recalculado.
 */
/**
 * Cuánto vive una comanda sin que nadie la toque.
 *
 * Treinta días es de sobra para la vida real de una cuenta —se reparte esa
 * noche y se salda en unos días— y evita guardar para siempre nombres, fotos y
 * móviles de gente que ya se olvidó de esto. El reloj se reinicia con cada
 * cambio, así que una mesa en uso no caduca nunca.
 */
const DIAS_DE_VIDA = 30;

export function caducidad(): Timestamp {
  return Timestamp.fromMillis(Date.now() + DIAS_DE_VIDA * 24 * 60 * 60 * 1000);
}

async function mutate(code: string, apply: (doc: TicketDoc) => void): Promise<TicketState> {
  const ref = firestore().collection(TICKETS).doc(code);
  const updated = await firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new StoreError("Esta comanda no existe o ha caducado.", 404);
    const doc = snap.data() as TicketDoc;
    apply(doc);
    doc.updatedAt = new Date().toISOString();
    // Tocarla la mantiene viva otros treinta días.
    doc.caducaEl = caducidad();
    tx.set(ref, doc);
    return doc;
  });
  return docToState(code, updated);
}

/**
 * Deja constancia de un cambio que mueve dinero de sitio.
 *
 * El nombre se copia aquí en vez de mirarse luego por el id: quien quitó la
 * línea puede irse de la mesa después, y el historial tiene que seguir
 * diciendo quién fue. Y `by` llega del navegador sin comprobar nada, así que
 * esto no impide que nadie mienta: sirve para que se vea, no para bloquear.
 */
function log(
  doc: TicketDoc,
  kind: EventDoc["kind"],
  by: string | null | undefined,
  what: string,
  cents: number,
): void {
  const person = by ? doc.participants.find((p) => p.id === by) : null;
  const events = doc.events ?? (doc.events = []);
  events.push({
    at: new Date().toISOString(),
    kind,
    participantId: person?.id ?? null,
    by: person?.name ?? "Alguien sin nombre",
    what,
    cents,
  });
  // Con tope, o una mesa muy trasteada engordaría el documento sin freno.
  if (events.length > LIMITS.events) doc.events = events.slice(-LIMITS.events);
}

export interface NewTicket {
  place: string | null;
  tableLabel: string | null;
  currency: string;
  totalCents: number;
  items: { name: string; qty: number; unitCents: number; totalCents: number }[];
}

export async function createTicket(input: NewTicket): Promise<string> {
  const now = new Date().toISOString();
  const doc: TicketDoc = {
    place: input.place,
    tableLabel: input.tableLabel,
    currency: input.currency,
    totalCents: input.totalCents,
    createdAt: now,
    updatedAt: now,
    caducaEl: caducidad(),
    items: input.items.slice(0, LIMITS.items).map((item, index) => ({
      id: id("itm"),
      name: item.name,
      qty: item.qty,
      unitCents: item.unitCents,
      totalCents: item.totalCents,
      // Por defecto se reparte en tantas partes como unidades trae el ticket.
      splitInto: Math.max(1, Math.round(item.qty || 1)),
      manualSplit: false,
      position: index,
    })),
    participants: [],
    claims: [],
  };

  const db = firestore();
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = attempt < 10 ? ticketCode() : ticketCode(10);
    try {
      // create() falla si el código ya existe: así no hay carrera al generarlo.
      await db.collection(TICKETS).doc(code).create(doc);
      return code;
    } catch (error) {
      if (isAlreadyExists(error)) continue;
      throw error;
    }
  }
  throw new StoreError("No se ha podido generar un código libre.", 500);
}

function isAlreadyExists(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    ((error as { code?: number | string }).code === 6 ||
      /already exists/i.test((error as Error).message ?? ""))
  );
}

export function patchTicket(
  code: string,
  patch: { totalCents?: number; place?: string; tableLabel?: string; closed?: boolean },
  by?: string | null,
): Promise<TicketState> {
  return mutate(code, (doc) => {
    if (patch.totalCents !== undefined) {
      const antes = doc.totalCents;
      doc.totalCents = Math.max(0, Math.round(patch.totalCents));
      // Tocar el total le cambia la cuenta a todos a la vez, así que va al
      // historial igual que quitar una línea. `what` guarda el total viejo.
      if (doc.totalCents !== antes) log(doc, "total.edit", by, String(antes), doc.totalCents);
    }
    if (patch.place !== undefined) {
      const antes = doc.place;
      /* Con tope: el nombre viaja en el título del enlace y en la estampa que
         sale al compartirlo, y una parrafada ahí no se lee ni cabe. */
      doc.place = patch.place.trim().slice(0, 40) || null;
      if (doc.place !== antes) log(doc, "mesa.nombre", by, doc.place ?? "", 0);
    }
    if (patch.tableLabel !== undefined) doc.tableLabel = patch.tableLabel.trim() || null;
    if (patch.closed !== undefined) doc.closed = patch.closed;
  });
}

/* ------------------------------------------------------------- comensales */

/**
 * Una foto de perfil, o un bicho, y nada más.
 *
 * El navegador ya recorta la foto a 150 px y la comprime a JPEG, pero eso pasa
 * en el móvil de quien la sube: la API se traga lo que le manden. Sin este
 * filtro, una llamada a mano puede dejar novecientos kilobytes dentro del
 * documento y pegarlo al límite de 1 MiB de Firestore —a partir de ahí esa mesa
 * no se puede escribir más y se queda inservible para todos los de la cena—.
 *
 * Valen las dos formas que entiende `Avatar`: la imagen metida en la propia
 * cadena, o el emoji que se elige en la app.
 */
/*
  Veinticinco mil caracteres, medidos y no a ojo: de las 21 fotos que hay
  guardadas ahora mismo, la mediana ocupa 9,7 KB y la mayor de las que hace la
  app de hoy, 12,3 KB. Esto deja el doble de sitio para una foto con mucho
  detalle sin dejar sitio para reventar nada — veinticinco comensales, que es el
  tope de la mesa, caben así de sobra bajo el MiB de Firestore.

  Las tres de 82, 96 y 113 KB que quedan por ahí son del 17 de agosto, de cuando
  la foto se guardaba sin recortar. Siguen funcionando: abajo sólo se comprueba
  lo que cambia.
*/
const AVATAR_MAX = 25_000;

function limpiaAvatar(raw: string): string {
  const avatar = raw.trim();
  if (avatar.startsWith("data:")) {
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar)) {
      throw new StoreError("Esa imagen no vale como foto de perfil.");
    }
    // La del navegador ronda los 6 KB; esto deja sitio de sobra sin dejar sitio
    // para reventar el documento.
    if (avatar.length > AVATAR_MAX) throw new StoreError("Esa foto es demasiado grande.");
    return avatar;
  }
  // Un bicho es un emoji: con los pares suplentes y los enlaces de ancho cero,
  // dieciséis unidades es un techo generoso para uno solo.
  if (avatar.length > 16) throw new StoreError("Ese avatar no vale.");
  return avatar;
}

/** Un dato de cobro opcional: o falta, o está bien escrito. */
function cobroValido(
  raw: string | undefined,
  limpia: (v: string) => string | null,
  error: string,
): string | undefined {
  if (raw === undefined || raw.trim() === "") return undefined;
  const limpio = limpia(raw);
  if (!limpio) throw new StoreError(error);
  return limpio;
}

export async function addParticipant(
  code: string,
  rawName: string,
  avatar?: string,
  bizum?: string,
  revolut?: string
): Promise<{ state: TicketState; participantId: string }> {
  const name = rawName.trim().slice(0, 40);
  if (!name) throw new StoreError("Escribe un nombre.");

  /*
    Apuntarse pasa por el mismo filtro que editarse después.

    `patchParticipant` ya validaba el usuario de Revolut y el móvil del Bizum
    —«se valida también aquí y no sólo en la pantalla»— pero esta puerta, que es
    justo por donde la gente los escribe la primera vez, los guardaba tal cual.
  */
  const limpio = {
    avatar: avatar === undefined ? undefined : limpiaAvatar(avatar),
    bizum: cobroValido(bizum, limpiaTelefono, "Ese móvil no parece válido."),
    revolut: cobroValido(revolut, limpiaRevolut, "Ese usuario de Revolut no parece válido."),
  };

  let participantId = "";
  const state = await mutate(code, (doc) => {
    // Si alguien vuelve a entrar desde otro móvil, reutilizamos su ficha:
    // el QR es el mismo para toda la mesa.
    const already = doc.participants.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (already) {
      // Con lo ya limpio, no con lo que llegó: por aquí pasa quien vuelve a
      // entrar desde otro móvil, y guardar el móvil tal y como lo teclea deja
      // un Bizum con espacios que luego no sirve para pagar.
      if (limpio.avatar) already.avatar = limpio.avatar;
      if (limpio.bizum !== undefined) already.bizum = limpio.bizum;
      if (limpio.revolut !== undefined) already.revolut = limpio.revolut;
      participantId = already.id;
      return;
    }
    if (doc.participants.length >= LIMITS.participants) {
      throw new StoreError("Demasiados comensales en esta mesa.");
    }
    participantId = id("prt");
    doc.participants.push({
      id: participantId,
      name,
      avatar: limpio.avatar,
      bizum: limpio.bizum,
      revolut: limpio.revolut,
      color: colorFor(doc.participants.length),
      isPayer: false,
      settled: false,
    });
  });

  return { state, participantId };
}

export function patchParticipant(
  code: string,
  participantId: string,
  patch: {
    name?: string;
    avatar?: string;
    settled?: boolean;
    isPayer?: boolean;
    revolut?: string | null;
    bizum?: string | null;
  },
): Promise<TicketState> {
  return mutate(code, (doc) => {
    const person = doc.participants.find((p) => p.id === participantId);
    if (!person) throw new StoreError("Este comensal no está en la comanda.", 404);

    if (patch.name !== undefined) {
      const name = patch.name.trim().slice(0, 40);
      if (!name) throw new StoreError("Escribe un nombre.");
      person.name = name;
    }
    // Sólo si cambia: la pantalla de perfil manda el bloque entero al guardar
    // cualquier cosa, y sin esto quien lleve una de las fotos viejas y gordas no
    // podría ni cambiarse el nombre.
    if (patch.avatar !== undefined && patch.avatar !== person.avatar) {
      person.avatar = limpiaAvatar(patch.avatar);
    }
    if (patch.settled !== undefined) person.settled = patch.settled;

    /*
      La forma de cobrar se valida también aquí y no sólo en la pantalla.

      Un usuario mal escrito no da un error: da un botón de pagar que lleva a
      una página vacía, y quien lo pulsa se cree que la culpa es suya. Vale más
      no guardarlo. Firestore no admite `undefined`, así que borrar es borrar
      la clave, no ponerla a nada.
    */
    /*
      Y cambiar la forma de cobrar de alguien queda escrito.

      Aquí no hay sesiones: quien tenga el enlace puede editar la ficha de
      cualquiera, y el único sitio donde eso mueve dinero de verdad es el móvil
      al que la mesa hace el Bizum. Sin cuentas no hay forma de impedirlo, así
      que se hace lo mismo que con las líneas que alguien borra: que se vea.
      Sólo se anota cambiar algo que ya estaba puesto —ponerlo la primera vez es
      lo normal y sería ruido—. La línea nombra a quien cobra y no a quien tocó
      el dato, porque esto último no hay forma de saberlo: lo que tiene que
      saltar a la vista es que el móvil de Ana ya no es el que era.
    */
    if (patch.revolut !== undefined) {
      const antes = person.revolut;
      if (patch.revolut === null || patch.revolut.trim() === "") delete person.revolut;
      else {
        const user = limpiaRevolut(patch.revolut);
        if (!user) throw new StoreError("Ese usuario de Revolut no parece válido.");
        person.revolut = user;
      }
      if (antes && antes !== person.revolut) log(doc, "cobro.edit", person.id, "revolut", 0);
    }
    if (patch.bizum !== undefined) {
      const antes = person.bizum;
      if (patch.bizum === null || patch.bizum.trim() === "") delete person.bizum;
      else {
        const tel = limpiaTelefono(patch.bizum);
        if (!tel) throw new StoreError("Ese móvil no parece válido.");
        person.bizum = tel;
      }
      if (antes && antes !== person.bizum) log(doc, "cobro.edit", person.id, "bizum", 0);
    }
    if (patch.isPayer !== undefined) {
      // (Legacy) Sólo puede haber un pagador original
      if (patch.isPayer) for (const other of doc.participants) other.isPayer = false;
      person.isPayer = patch.isPayer;
    }
  });
}

export function setPayer(
  code: string,
  participantId: string | null,
  receiptId: string | null,
  by?: string | null,
): Promise<TicketState> {
  return mutate(code, (doc) => {
    // Si payerId no es null, asegurarse de que el participante existe
    if (participantId) {
      const exists = doc.participants.some((p) => p.id === participantId);
      if (!exists) throw new StoreError("Ese comensal no está en la comanda.", 404);
    }

    if (receiptId) {
      const receipt = doc.receipts?.find((r) => r.id === receiptId);
      if (!receipt) throw new StoreError("Ese ticket no existe.", 404);
      receipt.payerId = participantId;
    } else {
      doc.payerId = participantId;
      /*
        El `isPayer` de las comandas viejas se limpia en los dos sentidos.
        Sólo al asignar dejaba un rastro: al quitar el pagador, `payerId`
        quedaba a null pero el `isPayer` seguía puesto y la pantalla —que mira
        los dos— seguía viendo a la misma persona. O sea que quitarse no
        quitaba nada.
      */
      for (const p of doc.participants) p.isPayer = false;
    }

    /*
      Quién puso el dinero es el dato del que cuelga toda la pantalla de
      cuentas, así que cambiarlo mueve dinero de sitio igual que quitar una
      línea, y va al historial por la misma razón: aquí no hay contraseñas, y
      lo que frena a quien fuera a apuntarse los cobros de otro es que se vea.

      No se apunta al quitarlo, que es casi siempre corregir un toque mal dado.
    */
    if (participantId) {
      const quien = doc.participants.find((p) => p.id === participantId);
      const recibo = receiptId ? doc.receipts?.find((r) => r.id === receiptId) : null;
      log(
        doc,
        "payer.set",
        by,
        quien?.name ?? "",
        recibo ? recibo.totalCents : doc.totalCents,
      );
    }
  });
}

/* ------------------------------------------------------------------- pagos */

/**
 * «Ya te lo he mandado», que es la mitad del deudor.
 *
 * No lo damos por cobrado: hasta aquí lo único que ha pasado es que alguien ha
 * vuelto de su banco y dice que lo ha enviado. Un Bizum tarda segundos pero una
 * transferencia puede tardar un día, así que la otra mitad la pone quien lo
 * recibe cuando lo ve en su cuenta.
 *
 * Hay un solo registro por pareja: volver a decirlo pisa el anterior en vez de
 * apilar avisos, que es lo que pasaría con quien toque el botón dos veces.
 */
export function declararPago(
  code: string,
  fromId: string,
  toId: string,
  cents: number,
  via: Via,
): Promise<TicketState> {
  return mutate(code, (doc) => {
    if (fromId === toId) throw new StoreError("Nadie se paga a sí mismo.");
    for (const quien of [fromId, toId]) {
      if (!doc.participants.some((p) => p.id === quien)) {
        throw new StoreError("Ese comensal no está en la comanda.", 404);
      }
    }

    const pagos = doc.pagos ?? (doc.pagos = []);
    const ya = pagos.find((p) => p.fromId === fromId && p.toId === toId);
    // Lo ya cobrado no se reabre desde el lado del que paga: eso sólo puede
    // hacerlo quien tiene el dinero delante.
    // EXCEPCIÓN: si el pagador desmarcó manualmente el "saldado" (settled === false),
    // permitimos que el deudor vuelva a notificar el pago.
    const deudor = doc.participants.find(p => p.id === fromId);
    if (ya?.estado === "ok" && deudor?.settled) return;

    const nuevo = {
      fromId,
      toId,
      cents: Math.max(0, Math.round(cents)),
      via,
      estado: "dice" as const,
      at: new Date().toISOString(),
    };
    if (ya) Object.assign(ya, nuevo);
    else {
      if (pagos.length >= LIMITS.pagos) throw new StoreError("Demasiados pagos en esta comanda.");
      pagos.push(nuevo);
    }
  });
}

/**
 * «Sí, me ha llegado» o «todavía no», que es la mitad de quien cobra.
 *
 * Que no haya llegado no se anuncia a nadie: el aviso vuelve a desaparecer y
 * se queda entre los dos. Puede ser verdad y estar el dinero de camino —una
 * transferencia tarda hasta un día— y decirle a ocho personas que fulano no ha
 * pagado, por diez euros y pudiendo ser mentira, hace más daño que bien.
 *
 * Lo bueno sí se anuncia: eso es lo que la mesa quiere saber.
 */
export function resolverPago(
  code: string,
  fromId: string,
  toId: string,
  ok: boolean,
): Promise<TicketState> {
  return mutate(code, (doc) => {
    const pagos = doc.pagos ?? (doc.pagos = []);
    const pago = pagos.find((p) => p.fromId === fromId && p.toId === toId);
    if (!pago) throw new StoreError("Ese pago ya no está.", 404);

    if (!ok) {
      doc.pagos = pagos.filter((p) => p !== pago);
      const deudor = doc.participants.find((p) => p.id === fromId);
      // Si se había dado por saldado, deja de estarlo: el dinero no está.
      if (deudor) deudor.settled = false;
      return;
    }

    pago.estado = "ok";
    pago.at = new Date().toISOString();
    log(doc, "pago.ok", fromId, doc.participants.find((p) => p.id === toId)?.name ?? "", pago.cents);

    /*
      Saldar a alguien es cosa de todas sus deudas, no de ésta.

      Con un solo pagador —el caso de siempre— confirmar es saldar y ya está.
      Pero si la mesa pagó entre dos, uno puede deberle a los dos, y dar por
      saldado con la primera confirmación le borraría la otra deuda de encima.
      Por eso se mira el reparto entero antes de decidir.
    */
    const settlement = computeSettlement(docToState(code, doc));
    const suyas = settlement.transactions.filter((t) => t.fromId === fromId);
    const todasOk =
      suyas.length > 0 &&
      suyas.every((t) =>
        (doc.pagos ?? []).some(
          (p) => p.fromId === t.fromId && p.toId === t.toId && p.estado === "ok",
        ),
      );
    const deudor = doc.participants.find((p) => p.id === fromId);
    if (deudor && todasOk) deudor.settled = true;
  });
}

export function removeParticipant(code: string, participantId: string): Promise<TicketState> {
  return mutate(code, (doc) => {
    const before = doc.participants.length;
    doc.participants = doc.participants.filter((p) => p.id !== participantId);
    if (doc.participants.length === before) {
      throw new StoreError("Este comensal no está en la comanda.", 404);
    }
    // Al irse, sus platos vuelven a quedar libres.
    doc.claims = doc.claims.filter((c) => c.participantId !== participantId);
    if (doc.pagos) {
      doc.pagos = doc.pagos.filter(
        (p) => p.fromId !== participantId && p.toId !== participantId,
      );
    }
  });
}

/* ------------------------------------------------------------------ platos */

export function addItem(
  code: string,
  input: { name: string; qty: number; unitCents: number; receiptId?: string },
  by?: string | null,
): Promise<TicketState> {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new StoreError("El plato necesita un nombre.");
  const qty = Math.max(1, input.qty);
  const unitCents = Math.max(0, Math.round(input.unitCents));

  return mutate(code, (doc) => {
    if (doc.items.length >= LIMITS.items) throw new StoreError("Demasiadas líneas en la comanda.");
    const position = doc.items.reduce((max, i) => Math.max(max, i.position), -1) + 1;
    const totalCents = Math.round(unitCents * qty);
    doc.items.push({
      id: id("itm"),
      receiptId: input.receiptId,
      name,
      qty,
      unitCents,
      totalCents,
      splitInto: qty,
      manualSplit: false,
      position,
    });
    doc.totalCents += totalCents;
    log(doc, "item.add", by, name, totalCents);
  });
}

export function patchItem(
  code: string,
  itemId: string,
  patch: {
    name?: string;
    qty?: number;
    unitCents?: number;
    totalCents?: number;
    splitInto?: number;
  },
): Promise<TicketState> {
  return mutate(code, (doc) => {
    const item = doc.items.find((i) => i.id === itemId);
    if (!item) throw new StoreError("Ese plato no está en esta comanda.", 404);

    if (patch.name !== undefined) {
      const name = patch.name.trim().slice(0, 80);
      if (name) item.name = name;
    }

    if (patch.qty !== undefined) {
      const oldTotalCents = item.totalCents;
      item.qty = Math.max(1, patch.qty);
      item.totalCents = Math.round(item.unitCents * item.qty);
      item.splitInto = item.qty;
      clampShares(doc, item);

      const diffCents = item.totalCents - oldTotalCents;
      if (diffCents !== 0) {
        doc.totalCents = Math.max(0, doc.totalCents + diffCents);
        if (item.receiptId) {
          const r = doc.receipts?.find(r => r.id === item.receiptId);
          if (r) r.totalCents = Math.max(0, r.totalCents + diffCents);
        }
      }
    }

    if (patch.unitCents !== undefined) {
      item.unitCents = Math.max(0, Math.round(patch.unitCents));
      item.totalCents = Math.round(item.unitCents * item.qty);
    }

    if (patch.totalCents !== undefined) {
      item.totalCents = Math.max(0, Math.round(patch.totalCents));
      item.unitCents = Math.round(item.totalCents / Math.max(1, item.qty));
    }

    if (patch.splitInto !== undefined) {
      applySplitInto(doc, item, patch.splitInto);
    }
  });
}

/** Nadie puede tener más partes de las que la línea tiene en total. */
function clampShares(doc: TicketDoc, item: ItemDoc): void {
  for (const claim of doc.claims) {
    const shares = claim.shares ?? claim.units ?? 1;
    if (claim.itemId === item.id && shares > item.splitInto) {
      claim.shares = item.splitInto;
      delete claim.units;
    }
  }
}

function applySplitInto(doc: TicketDoc, item: ItemDoc, requested: number): void {
  const taken = sharesOn(doc, item.id);
  // No se puede partir en menos trozos de los que ya hay repartidos: si tres
  // personas se apuntaron, «entre 2» dejaría a alguien fuera sin avisar.
  item.splitInto = Math.min(LIMITS.splitInto, Math.max(1, Math.round(requested), taken));
  // Volver a las unidades del ticket es dejar de compartir a propósito.
  item.manualSplit = item.splitInto !== Math.max(1, Math.round(item.qty || 1));
}

function sharesOn(doc: TicketDoc, itemId: string, exceptParticipant?: string): number {
  return doc.claims
    .filter((c) => c.itemId === itemId && c.participantId !== exceptParticipant)
    .reduce((a, c) => a + (c.shares ?? c.units ?? 1), 0);
}

/**
 * Separa unas cuantas unidades de una línea a una línea propia.
 *
 * Es lo que hace falta para «de las dos carnes, ésta la partimos entre cinco y
 * la otra entre dos»: el reparto vive en la línea, así que dos repartos
 * distintos piden dos líneas. No hace falta ningún concepto nuevo — cada una
 * sigue siendo una línea normal con su `splitInto`, y las cuentas, el ticket y
 * el histórico funcionan sin enterarse.
 *
 * Devuelve la ficha de la nueva para que quien lo pidió siga con ella: la ha
 * separado justo para repartirla.
 */
export async function splitOffUnits(
  code: string,
  itemId: string,
  unidades: number,
): Promise<{ state: TicketState; newItemId: string }> {
  let newItemId = "";

  const state = await mutate(code, (doc) => {
    const item = doc.items.find((i) => i.id === itemId);
    if (!item) throw new StoreError("Ese plato no está en esta comanda.", 404);

    const total = Math.max(1, Math.round(item.qty || 1));
    const corte = Math.round(unidades);
    if (corte < 1 || corte >= total) {
      throw new StoreError("No hay tantas unidades que separar.");
    }
    if (doc.items.length >= LIMITS.items) {
      throw new StoreError("Demasiadas líneas en la comanda.");
    }

    // El importe se parte de forma que las dos mitades sumen exactamente lo que
    // costaba la línea. Multiplicar por `unitCents` dejaría céntimos por el
    // camino siempre que el ticket no cuadre al céntimo con el precio unitario,
    // que es lo normal en cuanto hay IVA de por medio.
    const centsCorte = Math.round((item.totalCents * corte) / total);

    newItemId = id("itm");
    const nueva: ItemDoc = {
      id: newItemId,
      name: item.name,
      qty: corte,
      unitCents: item.unitCents,
      totalCents: centsCorte,
      splitInto: corte,
      manualSplit: false,
      position: 0,
      receiptId: item.receiptId,
    };

    item.qty = total - corte;
    item.totalCents = item.totalCents - centsCorte;
    // Lo que queda vuelve a su reparto natural. Quien tuviera más partes de las
    // que ahora hay se queda con las que caben, y el resto sale sin dueño en la
    // línea nueva, donde se ve y se puede volver a repartir.
    item.splitInto = item.qty;
    item.manualSplit = false;
    clampShares(doc, item);

    // La nueva va pegada a su hermana, y se renumeran todas: sumarle media
    // posición chocaría consigo misma al separar dos veces la misma línea.
    const ordenadas = [...doc.items].sort((a, b) => a.position - b.position);
    ordenadas.splice(ordenadas.findIndex((i) => i.id === itemId) + 1, 0, nueva);
    ordenadas.forEach((i, n) => {
      i.position = n;
    });
    doc.items = ordenadas;
  });

  return { state, newItemId };
}

export function removeItem(
  code: string,
  itemId: string,
  by?: string | null,
): Promise<TicketState> {
  return mutate(code, (doc) => {
    const quitado = doc.items.find((i) => i.id === itemId);
    if (!quitado) {
      throw new StoreError("Ese plato no está en esta comanda.", 404);
    }
    log(doc, "item.remove", by, quitado.name, quitado.totalCents);
    // El total baja con la línea. Si no, su importe reaparecería como «extras»
    // repartidos entre todos y borrar no serviría de nada.
    doc.totalCents = totalAfterRemoving(doc.totalCents, doc.items, itemId);
    if (quitado.receiptId) {
      const r = doc.receipts?.find(r => r.id === quitado.receiptId);
      if (r) r.totalCents = Math.max(0, r.totalCents - quitado.totalCents);
    }
    
    doc.items = doc.items.filter((i) => i.id !== itemId);
    doc.claims = doc.claims.filter((c) => c.itemId !== itemId);
  });
}

/* ------------------------------------------------------------------ claims */

/**
 * Fija cuántas partes de una línea se lleva un comensal. `shares <= 0` se la quita.
 *
 * Nunca da más partes de las que quedan libres. Antes la línea crecía sola para
 * hacer sitio a quien la tocaba, y eso cobraba de más sin avisar: en una línea
 * de 9 cervezas partida entre 2, un toque de más pasaba de 9 € a 18 €. Ahora
 * compartir algo que ya tiene dueño se pide a propósito con `splitInto`, que
 * viene del «entre N» y se aplica antes de repartir para que la parte del que
 * pulsa quede fijada al momento.
 */
export function setClaim(
  code: string,
  itemId: string,
  participantId: string,
  shares: number,
  splitInto?: number,
): Promise<TicketState> {
  return mutate(code, (doc) => {
    const item = doc.items.find((i) => i.id === itemId);
    if (!item) throw new StoreError("Ese plato no está en esta comanda.", 404);
    if (!doc.participants.some((p) => p.id === participantId)) {
      throw new StoreError("Ese comensal no está en esta comanda.", 404);
    }

    if (shares <= 0) {
      doc.claims = doc.claims.filter(
        (c) => !(c.itemId === itemId && c.participantId === participantId),
      );
      // Lo que creció solo, se encoge solo: si dos compartían un vino por
      // auto-compartir y uno se echa atrás, el otro vuelve a pagarlo entero en
      // vez de dejar media botella sin dueño. Un «entre 4» pedido a mano se
      // respeta: quien lo dijo sigue queriendo pagar su cuarta parte.
      if (!item.manualSplit) {
        item.splitInto = Math.max(1, Math.round(item.qty || 1), sharesOn(doc, itemId));
      }
      return;
    }

    if (splitInto !== undefined) applySplitInto(doc, item, splitInto);

    const wanted = Math.max(1, Math.round(shares));
    const byOthers = sharesOn(doc, itemId, participantId);

    // Se da lo que quede, ni una parte más: pedir cuatro cuando sólo hay dos
    // libres te deja con dos, no parte la línea en más trozos.
    const granted = Math.min(wanted, (item.splitInto ?? item.qty) - byOthers);
    if (granted <= 0) {
      throw new StoreError("Esta línea ya está completa. Repártela con ÷ si quieres entrar.", 409);
    }

    const mine = doc.claims.find((c) => c.itemId === itemId && c.participantId === participantId);
    if (mine) {
      mine.shares = granted;
      delete mine.units;
    } else {
      doc.claims.push({ itemId, participantId, shares: granted });
    }
  });
}

export async function addReceipt(
  code: string,
  input: {
    label: string;
    totalCents: number;
    items: { name: string; qty: number; unitCents: number; totalCents: number }[];
  },
): Promise<{ state: TicketState; receiptId: string }> {
  const receiptId = id("rcp");
  const state = await mutate(code, (doc) => {
    const receipts = doc.receipts ?? (doc.receipts = []);
    receipts.push({
      id: receiptId,
      label: input.label.trim() || `Ticket ${receipts.length + 1}`,
      totalCents: input.totalCents,
    });

    // Añadir el nuevo total al total global de la comanda
    doc.totalCents += input.totalCents;

    const startPosition = doc.items.reduce((max, i) => Math.max(max, i.position), -1) + 1;
    const newItems = input.items.slice(0, LIMITS.items - doc.items.length).map((item, index) => ({
      id: id("itm"),
      receiptId,
      name: item.name,
      qty: item.qty,
      unitCents: item.unitCents,
      totalCents: item.totalCents,
      splitInto: Math.max(1, Math.round(item.qty || 1)),
      manualSplit: false,
      position: startPosition + index,
    }));
    
    doc.items.push(...newItems);
  });
  // Quien lo sube tiene el papel en la mano, así que la pantalla le va a
  // preguntar en seguida quién lo pagó. Para eso hace falta saber cuál es.
  return { state, receiptId };
}
