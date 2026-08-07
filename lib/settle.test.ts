import assert from "node:assert/strict";
import test from "node:test";
// Extensiones explícitas: así corre con el stripping de tipos nativo de Node,
// sin runner ni dependencias de test.
import { computeSettlement, splitCents } from "./settle.ts";
import type { Claim, Item, Participant, TicketState } from "./types.ts";

function item(over: Partial<Item> & Pick<Item, "id" | "totalCents">): Item {
  return {
    ticketId: "T",
    name: over.id,
    qty: 1,
    unitCents: over.totalCents,
    splitInto: over.qty ?? 1,
    manualSplit: false,
    position: 0,
    ...over,
  };
}

function person(id: string, over: Partial<Participant> = {}): Participant {
  return { id, ticketId: "T", name: id, color: "#fff", isPayer: false, paidCents: 0, ...over };
}

function state(
  items: Item[],
  participants: Participant[],
  claims: Claim[],
  totalCents: number,
  tipCents = 0,
): TicketState {
  return {
    ticket: {
      id: "T",
      place: null,
      tableLabel: null,
      currency: "EUR",
      totalCents,
      tipCents,
      createdAt: "",
    },
    items,
    participants,
    claims,
  };
}

test("splitCents nunca pierde ni inventa un céntimo", () => {
  assert.deepEqual(splitCents(1000, [1, 1, 1]), [334, 333, 333]);
  assert.equal(splitCents(1000, [1, 1, 1]).reduce((a, b) => a + b), 1000);
  assert.deepEqual(splitCents(0, [1, 2]), [0, 0]);
  assert.deepEqual(splitCents(100, [0, 0]), [0, 0]);
  // Descuentos: el signo se conserva y la suma sigue cuadrando.
  assert.equal(splitCents(-1000, [1, 1, 1]).reduce((a, b) => a + b), -1000);
});

test("un plato de una unidad va entero a quien lo reclama", () => {
  const s = state(
    [item({ id: "i1", totalCents: 1200 })],
    [person("a"), person("b")],
    [{ itemId: "i1", participantId: "a", shares: 1 }],
    1200,
  );
  const out = computeSettlement(s);
  assert.equal(out.byParticipant[0].owesCents, 1200);
  assert.equal(out.byParticipant[1].owesCents, 0);
  assert.equal(out.unassignedCents, 0);
  assert.equal(out.complete, true);
});

test("un plato compartido se parte a partes iguales aunque no sea divisible", () => {
  const s = state(
    [item({ id: "i1", totalCents: 1000, splitInto: 3 })],
    [person("a"), person("b"), person("c")],
    [
      { itemId: "i1", participantId: "a", shares: 1 },
      { itemId: "i1", participantId: "b", shares: 1 },
      { itemId: "i1", participantId: "c", shares: 1 },
    ],
    1000,
  );
  const out = computeSettlement(s);
  const owed = out.byParticipant.map((p) => p.owesCents).sort();
  assert.deepEqual(owed, [333, 333, 334]);
  assert.equal(owed.reduce((a, b) => a + b), 1000);
  assert.equal(out.unassignedCents, 0);
});

test("las unidades sin reclamar se quedan sin asignar", () => {
  const s = state(
    [item({ id: "i1", totalCents: 900, qty: 3, unitCents: 300 })],
    [person("a")],
    [{ itemId: "i1", participantId: "a", shares: 1 }],
    900,
  );
  const out = computeSettlement(s);
  assert.equal(out.byParticipant[0].owesCents, 300);
  assert.equal(out.unassignedCents, 600);
  assert.equal(out.complete, false);
});

test("«compartir entre 4» fija tu parte sin esperar a que se apunte nadie", () => {
  // Lo que antes obligaba a esperar: ahora tocas, dices «entre 4» y ya sabes
  // que pagas 5 € de los 20, aunque los otros tres tarden en apuntarse.
  const s = state(
    [item({ id: "paella", totalCents: 2000, splitInto: 4 })],
    [person("a"), person("b")],
    [{ itemId: "paella", participantId: "a", shares: 1 }],
    2000,
  );
  const out = computeSettlement(s);
  assert.equal(out.byParticipant[0].owesCents, 500);
  assert.equal(out.byItem.paella.freeShares, 3);
  assert.equal(out.byItem.paella.perShareCents, 500);
  assert.equal(out.unassignedCents, 1500);
  assert.equal(out.complete, false);

  // Y cuando el segundo se apunta, su parte es la misma: nadie recalcula nada.
  const withB = computeSettlement({
    ...s,
    claims: [...s.claims, { itemId: "paella", participantId: "b", shares: 1 }],
  });
  assert.equal(withB.byParticipant[0].owesCents, 500);
  assert.equal(withB.byParticipant[1].owesCents, 500);
  assert.equal(withB.unassignedCents, 1000);
});

test("varias partes de la misma línea suman para el mismo comensal", () => {
  const s = state(
    [item({ id: "cañas", totalCents: 750, qty: 3, unitCents: 250 })],
    [person("a"), person("b")],
    [
      { itemId: "cañas", participantId: "a", shares: 2 },
      { itemId: "cañas", participantId: "b", shares: 1 },
    ],
    750,
  );
  const out = computeSettlement(s);
  assert.equal(out.byParticipant[0].owesCents, 500);
  assert.equal(out.byParticipant[1].owesCents, 250);
  assert.equal(out.complete, true);
});

test("el servicio del ticket se reparte en proporción a lo consumido", () => {
  // Platos por 100 €, ticket de 110 €: 10 € de extras al 75/25.
  const s = state(
    [
      item({ id: "i1", totalCents: 7500 }),
      item({ id: "i2", totalCents: 2500 }),
    ],
    [person("a"), person("b")],
    [
      { itemId: "i1", participantId: "a", shares: 1 },
      { itemId: "i2", participantId: "b", shares: 1 },
    ],
    11000,
  );
  const out = computeSettlement(s);
  assert.equal(out.byParticipant[0].owesCents, 8250);
  assert.equal(out.byParticipant[1].owesCents, 2750);
  assert.equal(out.assignedCents, 11000);
  assert.equal(out.unassignedCents, 0);
});

test("la propina se suma al total y se reparte igual", () => {
  const s = state(
    [item({ id: "i1", totalCents: 1000 })],
    [person("a")],
    [{ itemId: "i1", participantId: "a", shares: 1 }],
    1000,
    200,
  );
  const out = computeSettlement(s);
  assert.equal(out.grandTotalCents, 1200);
  assert.equal(out.byParticipant[0].owesCents, 1200);
});

test("quien pagó de más queda con saldo a favor y recibe las transferencias", () => {
  const s = state(
    [item({ id: "i1", totalCents: 3000 }), item({ id: "i2", totalCents: 1000 })],
    [person("pagador", { isPayer: true, paidCents: 4000 }), person("otro")],
    [
      { itemId: "i1", participantId: "pagador", shares: 1 },
      { itemId: "i2", participantId: "otro", shares: 1 },
    ],
    4000,
  );
  const out = computeSettlement(s);
  assert.equal(out.byParticipant[0].balanceCents, 1000);
  assert.equal(out.byParticipant[1].balanceCents, -1000);
  assert.equal(out.transfers.length, 1);
  assert.deepEqual(
    { from: out.transfers[0].fromName, to: out.transfers[0].toName, cents: out.transfers[0].cents },
    { from: "otro", to: "pagador", cents: 1000 },
  );
  assert.equal(out.overpaidCents, 0);
});

test("detecta que se ha cobrado de más", () => {
  const s = state(
    [item({ id: "i1", totalCents: 2000 })],
    [person("a", { paidCents: 2500 })],
    [{ itemId: "i1", participantId: "a", shares: 1 }],
    2000,
  );
  assert.equal(computeSettlement(s).overpaidCents, 500);
});

test("las transferencias saldan exactamente todos los balances", () => {
  const s = state(
    [
      item({ id: "i1", totalCents: 1733 }),
      item({ id: "i2", totalCents: 999 }),
      item({ id: "i3", totalCents: 2101, splitInto: 3 }),
    ],
    [person("a", { paidCents: 4833 }), person("b"), person("c")],
    [
      { itemId: "i1", participantId: "a", shares: 1 },
      { itemId: "i2", participantId: "b", shares: 1 },
      { itemId: "i3", participantId: "a", shares: 1 },
      { itemId: "i3", participantId: "b", shares: 1 },
      { itemId: "i3", participantId: "c", shares: 1 },
    ],
    4833,
  );
  const out = computeSettlement(s);
  const net = new Map(out.byParticipant.map((p) => [p.participantId, p.balanceCents]));
  for (const transfer of out.transfers) {
    net.set(transfer.fromId, net.get(transfer.fromId)! + transfer.cents);
    net.set(transfer.toId, net.get(transfer.toId)! - transfer.cents);
  }
  for (const [, remaining] of net) assert.equal(remaining, 0);
  assert.equal(out.unassignedCents, 0);
});
