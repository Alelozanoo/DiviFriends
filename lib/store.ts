import { firestore, TICKETS } from "./firebaseAdmin";
import { docToState, LIMITS, type TicketDoc } from "./ticketDoc";
import { colorFor, id, ticketCode } from "./format";
import type { SplitMode, TicketState } from "./types";

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
      splitMode: "units" as SplitMode,
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
      splitMode: "units",
      position,
    });
  });
}

export function patchItem(
  code: string,
  itemId: string,
  patch: { name?: string; qty?: number; unitCents?: number; totalCents?: number; splitMode?: SplitMode },
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
      // Si la cantidad baja, nadie puede seguir reclamando más de lo que hay.
      for (const claim of doc.claims) {
        if (claim.itemId === itemId && claim.units > item.qty) claim.units = item.qty;
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

    if (patch.splitMode) {
      item.splitMode = patch.splitMode;
      // Al pasar a compartido todos cuentan igual; al volver a unidades, una cada uno.
      for (const claim of doc.claims) if (claim.itemId === itemId) claim.units = 1;
    }
  });
}

export function removeItem(code: string, itemId: string): Promise<TicketState> {
  return mutate(code, (doc) => {
    const before = doc.items.length;
    doc.items = doc.items.filter((i) => i.id !== itemId);
    if (doc.items.length === before) throw new StoreError("Ese plato no está en esta comanda.", 404);
    doc.claims = doc.claims.filter((c) => c.itemId !== itemId);
  });
}

/* ------------------------------------------------------------------ claims */

/**
 * Fija cuántas unidades de un plato se lleva un comensal.
 * `units <= 0` le quita el plato. En modo compartido sólo cuenta estar o no estar.
 */
export function setClaim(
  code: string,
  itemId: string,
  participantId: string,
  units: number,
): Promise<TicketState> {
  return mutate(code, (doc) => {
    const item = doc.items.find((i) => i.id === itemId);
    if (!item) throw new StoreError("Ese plato no está en esta comanda.", 404);
    if (!doc.participants.some((p) => p.id === participantId)) {
      throw new StoreError("Ese comensal no está en esta comanda.", 404);
    }

    const others = doc.claims.filter((c) => c.itemId === itemId && c.participantId !== participantId);

    if (units <= 0) {
      doc.claims = doc.claims.filter(
        (c) => !(c.itemId === itemId && c.participantId === participantId),
      );
      return;
    }

    let granted = units;
    if (item.splitMode === "shared") {
      granted = 1;
    } else {
      // Nadie puede llevarse más unidades de las que quedan libres.
      const room = item.qty - others.reduce((a, c) => a + c.units, 0);
      if (room <= 0) throw new StoreError("Ya no quedan unidades libres de este plato.", 409);
      granted = Math.min(units, room);
    }

    const mine = doc.claims.find((c) => c.itemId === itemId && c.participantId === participantId);
    if (mine) mine.units = granted;
    else doc.claims.push({ itemId, participantId, units: granted });
  });
}
