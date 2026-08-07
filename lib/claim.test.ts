import assert from "node:assert/strict";
import test from "node:test";
import { applyClaim } from "./claimRules.ts";
import { computeSettlement } from "./settle.ts";
import type { Item, TicketState } from "./types.ts";

/*
 * `applyClaim` es la copia local de la regla del servidor (`setClaim` en
 * store.ts). Se prueba aquí porque es la que decide lo que ve el usuario en el
 * momento de tocar; si las dos se separan, la pantalla miente durante el medio
 * segundo que tarda en responder Firestore.
 */

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

function base(items: Item[]): TicketState {
  return {
    ticket: {
      id: "T",
      place: null,
      tableLabel: null,
      currency: "EUR",
      totalCents: items.reduce((a, i) => a + i.totalCents, 0),
      tipCents: 0,
      createdAt: "",
    },
    items,
    participants: ["alex", "marta", "nuria"].map((id) => ({
      id,
      ticketId: "T",
      name: id,
      color: "#fff",
      isPayer: false,
      paidCents: 0,
    })),
    claims: [],
  };
}

const owed = (s: TicketState) =>
  Object.fromEntries(
    computeSettlement(s).byParticipant.map((p) => [p.name, p.owesCents]),
  );

test("tocar algo que ya tiene dueño lo comparte solo", () => {
  let s = base([item({ id: "vino", totalCents: 1400 })]);
  s = applyClaim(s, "vino", "alex", 1);
  assert.deepEqual(owed(s), { alex: 1400, marta: 0, nuria: 0 });

  s = applyClaim(s, "vino", "marta", 1);
  assert.deepEqual(owed(s), { alex: 700, marta: 700, nuria: 0 });

  s = applyClaim(s, "vino", "nuria", 1);
  assert.deepEqual(owed(s), { alex: 467, marta: 467, nuria: 466 });
  assert.equal(computeSettlement(s).unassignedCents, 0);
});

test("si el que se sumó se echa atrás, el otro vuelve a pagarlo entero", () => {
  // Este era el agujero: al soltar quedaba media botella sin dueño.
  let s = base([item({ id: "vino", totalCents: 1400 })]);
  s = applyClaim(s, "vino", "alex", 1);
  s = applyClaim(s, "vino", "marta", 1);
  s = applyClaim(s, "vino", "marta", 0);

  assert.deepEqual(owed(s), { alex: 1400, marta: 0, nuria: 0 });
  assert.equal(computeSettlement(s).unassignedCents, 0);
});

test("un «entre 4» pedido a mano se respeta aunque la gente entre y salga", () => {
  let s = base([item({ id: "paella", totalCents: 2000 })]);
  s = applyClaim(s, "paella", "alex", 1, 4);
  assert.deepEqual(owed(s), { alex: 500, marta: 0, nuria: 0 });

  s = applyClaim(s, "paella", "marta", 1);
  s = applyClaim(s, "paella", "marta", 0);
  // Alex dijo «entre 4»: sigue pagando su cuarta parte, no la paella entera.
  assert.deepEqual(owed(s), { alex: 500, marta: 0, nuria: 0 });
  assert.equal(computeSettlement(s).unassignedCents, 1500);
});

test("las unidades sueltas se reparten sin crecer de más", () => {
  let s = base([item({ id: "cañas", totalCents: 1000, qty: 4, unitCents: 250 })]);
  s = applyClaim(s, "cañas", "alex", 1);
  s = applyClaim(s, "cañas", "marta", 2);
  assert.deepEqual(owed(s), { alex: 250, marta: 500, nuria: 0 });
  assert.equal(s.items[0].splitInto, 4);

  // El cuarto toque llena la línea; el quinto la hace crecer.
  s = applyClaim(s, "cañas", "nuria", 2);
  assert.equal(s.items[0].splitInto, 5);
  assert.equal(computeSettlement(s).unassignedCents, 0);
});

test("soltar la última parte devuelve la línea a su estado inicial", () => {
  let s = base([item({ id: "vino", totalCents: 1400 })]);
  s = applyClaim(s, "vino", "alex", 1);
  s = applyClaim(s, "vino", "marta", 1);
  s = applyClaim(s, "vino", "alex", 0);
  s = applyClaim(s, "vino", "marta", 0);

  assert.equal(s.items[0].splitInto, 1);
  assert.equal(s.claims.length, 0);
  assert.equal(computeSettlement(s).unassignedCents, 1400);
});
