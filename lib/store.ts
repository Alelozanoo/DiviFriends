import { firestore, TICKETS } from "./firebaseAdmin";
import { docToState, LIMITS, type EventDoc, type ItemDoc, type TicketDoc } from "./ticketDoc";
import { colorFor, id, ticketCode } from "./format";
import { totalAfterRemoving } from "./settle";
import type { TicketState } from "./types";

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
async function mutate(code: string, apply: (doc: TicketDoc) => void): Promise<TicketState> {
  const ref = firestore().collection(TICKETS).doc(code);
  const updated = await firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new StoreError("Esta comanda no existe o ha caducado.", 404);
    const doc = snap.data() as TicketDoc;
    apply(doc);
    doc.updatedAt = new Date().toISOString();
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
  patch: { totalCents?: number; place?: string; tableLabel?: string },
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
    if (patch.place !== undefined) doc.place = patch.place.trim() || null;
    if (patch.tableLabel !== undefined) doc.tableLabel = patch.tableLabel.trim() || null;
  });
}

/* ------------------------------------------------------------- comensales */

export async function addParticipant(
  code: string,
  rawName: string,
  avatar?: string,
): Promise<{ state: TicketState; participantId: string }> {
  const name = rawName.trim().slice(0, 40);
  if (!name) throw new StoreError("Escribe un nombre.");

  let participantId = "";
  const state = await mutate(code, (doc) => {
    // Si alguien vuelve a entrar desde otro móvil, reutilizamos su ficha:
    // el QR es el mismo para toda la mesa.
    const already = doc.participants.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (already) {
      if (avatar) already.avatar = avatar; // Actualizar avatar si se proporciona uno nuevo
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
      avatar,
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
  patch: { name?: string; settled?: boolean; isPayer?: boolean },
): Promise<TicketState> {
  return mutate(code, (doc) => {
    const person = doc.participants.find((p) => p.id === participantId);
    if (!person) throw new StoreError("Este comensal no está en la comanda.", 404);

    if (patch.name !== undefined) {
      const name = patch.name.trim().slice(0, 40);
      if (!name) throw new StoreError("Escribe un nombre.");
      person.name = name;
    }
    if (patch.settled !== undefined) person.settled = patch.settled;
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
      // Por limpieza, quitamos el isPayer de todos los participantes si estamos usando payerId
      if (participantId) {
        for (const p of doc.participants) p.isPayer = false;
      }
    }
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
): Promise<TicketState> {
  const receiptId = id("rcp");
  return mutate(code, (doc) => {
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
}
