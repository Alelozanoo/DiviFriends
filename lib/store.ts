import { firestore, TICKETS } from "./firebaseAdmin";
import { docToState, LIMITS, type ItemDoc, type TicketDoc } from "./ticketDoc";
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
    tipCents: 0,
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
  patch: { tipCents?: number; totalCents?: number; place?: string; tableLabel?: string },
): Promise<TicketState> {
  return mutate(code, (doc) => {
    if (patch.tipCents !== undefined) doc.tipCents = Math.max(0, Math.round(patch.tipCents));
    if (patch.totalCents !== undefined) doc.totalCents = Math.max(0, Math.round(patch.totalCents));
    if (patch.place !== undefined) doc.place = patch.place.trim() || null;
    if (patch.tableLabel !== undefined) doc.tableLabel = patch.tableLabel.trim() || null;
  });
}

/* ------------------------------------------------------------- comensales */

export async function addParticipant(
  code: string,
  rawName: string,
): Promise<{ state: TicketState; participantId: string }> {
  const name = rawName.trim().slice(0, 40);
  if (!name) throw new StoreError("Escribe un nombre.");

  let participantId = "";
  const state = await mutate(code, (doc) => {
    // Si alguien vuelve a entrar desde otro móvil, reutilizamos su ficha:
    // el QR es el mismo para toda la mesa.
    const already = doc.participants.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (already) {
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
      color: colorFor(doc.participants.length),
      isPayer: false,
      paidCents: 0,
    });
  });

  return { state, participantId };
}

export function patchParticipant(
  code: string,
  participantId: string,
  patch: { name?: string; paidCents?: number; isPayer?: boolean },
): Promise<TicketState> {
  return mutate(code, (doc) => {
    const person = doc.participants.find((p) => p.id === participantId);
    if (!person) throw new StoreError("Este comensal no está en la comanda.", 404);

    if (patch.name !== undefined) {
      const name = patch.name.trim().slice(0, 40);
      if (!name) throw new StoreError("Escribe un nombre.");
      person.name = name;
    }
    if (patch.paidCents !== undefined) person.paidCents = Math.max(0, Math.round(patch.paidCents));
    if (patch.isPayer !== undefined) {
      // Sólo puede haber un pagador: es la referencia del «quién debe a quién».
      if (patch.isPayer) for (const other of doc.participants) other.isPayer = false;
      person.isPayer = patch.isPayer;
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
  input: { name: string; qty: number; unitCents: number },
): Promise<TicketState> {
  const name = input.name.trim().slice(0, 80);
  if (!name) throw new StoreError("El plato necesita un nombre.");
  const qty = Math.max(1, input.qty);
  const unitCents = Math.max(0, Math.round(input.unitCents));

  return mutate(code, (doc) => {
    if (doc.items.length >= LIMITS.items) throw new StoreError("Demasiadas líneas en la comanda.");
    const position = doc.items.reduce((max, i) => Math.max(max, i.position), -1) + 1;
    doc.items.push({
      id: id("itm"),
      name,
      qty,
      unitCents,
      totalCents: Math.round(unitCents * qty),
      splitInto: qty,
      manualSplit: false,
      position,
    });
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
      item.qty = Math.max(1, patch.qty);
      item.totalCents = Math.round(item.unitCents * item.qty);
      item.splitInto = item.qty;
      clampShares(doc, item);
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

export function removeItem(code: string, itemId: string): Promise<TicketState> {
  return mutate(code, (doc) => {
    if (!doc.items.some((i) => i.id === itemId)) {
      throw new StoreError("Ese plato no está en esta comanda.", 404);
    }
    // El total baja con la línea. Si no, su importe reaparecería como «extras»
    // repartidos entre todos y borrar no serviría de nada.
    doc.totalCents = totalAfterRemoving(doc.totalCents, doc.items, itemId);
    doc.items = doc.items.filter((i) => i.id !== itemId);
    doc.claims = doc.claims.filter((c) => c.itemId !== itemId);
  });
}

/* ------------------------------------------------------------------ claims */

/**
 * Fija cuántas partes de una línea se lleva un comensal. `shares <= 0` se la quita.
 *
 * Si pide más partes de las que quedan libres, la línea se parte en más trozos
 * en vez de rechazar la petición: es el «si alguien más toca lo tuyo, se
 * comparte solo». Tocar una paella que ya tiene dueño la deja al 50 %, sin que
 * nadie tenga que pulsar ningún botón de compartir.
 *
 * `splitInto` opcional viene del «compartir entre N», y se aplica antes de
 * repartir para que la parte del que pulsa quede fijada al momento.
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

    const free = Math.max(0, (item.splitInto ?? item.qty) - byOthers);
    if (wanted > free) {
      // Auto-compartir: crecen los trozos, no se rechaza a nadie.
      item.splitInto = Math.min(LIMITS.splitInto, byOthers + wanted);
    }
    const granted = Math.min(wanted, item.splitInto - byOthers);
    if (granted <= 0) throw new StoreError("Esta línea ya no admite más gente.", 409);

    const mine = doc.claims.find((c) => c.itemId === itemId && c.participantId === participantId);
    if (mine) {
      mine.shares = granted;
      delete mine.units;
    } else {
      doc.claims.push({ itemId, participantId, shares: granted });
    }
  });
}
