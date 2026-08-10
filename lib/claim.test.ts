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
      createdAt: "",
    },
    items,
    participants: ["alex", "marta", "nuria"].map((id) => ({
      id,
      ticketId: "T",
      name: id,
      color: "#fff",
      isPayer: false,
      settled: false,
    })),
    claims: [],
    events: [],
  };
}

const owed = (s: TicketState) =>
  Object.fromEntries(
    computeSettlement(s).byParticipant.map((p) => [p.name, p.owesCents]),
  );

test("tocar algo que ya tiene dueño no se lo quita ni se cuela", () => {
  // Antes la línea crecía sola para hacer hueco. Cobraba de más sin avisar,
  // así que ahora entrar en algo cogido se pide a propósito con el ÷.
  let s = base([item({ id: "vino", totalCents: 1400 })]);
  s = applyClaim(s, "vino", "alex", 1);
  assert.deepEqual(owed(s), { alex: 1400, marta: 0, nuria: 0 });

  s = applyClaim(s, "vino", "marta", 1);
  assert.deepEqual(owed(s), { alex: 1400, marta: 0, nuria: 0 });
  assert.equal(s.items[0].splitInto, 1);

  // Con el ÷ sí: «entre 2» abre el hueco y Marta entra.
  s = applyClaim(s, "vino", "marta", 1, 2);
  assert.deepEqual(owed(s), { alex: 700, marta: 700, nuria: 0 });
  assert.equal(computeSettlement(s).unassignedCents, 0);
});

test("pedir más partes de las que quedan da las que quedan, no más", () => {
  // Éste es el fallo que se coló en la mesa: 9 cervezas partidas entre 2, una
  // parte cogida y el + de la otra persona duplicando lo que pagaba.
  let s = base([item({ id: "cervezas", totalCents: 1800, qty: 9, unitCents: 200 })]);
  s = applyClaim(s, "cervezas", "alex", 1, 2);
  assert.deepEqual(owed(s), { alex: 900, marta: 0, nuria: 0 });

  // Marta pide cuatro partes de una línea que sólo tiene una libre.
  s = applyClaim(s, "cervezas", "marta", 4);
  assert.deepEqual(owed(s), { alex: 900, marta: 900, nuria: 0 });
  assert.equal(s.items[0].splitInto, 2);
  assert.equal(computeSettlement(s).unassignedCents, 0);
});

test("si el que se sumó se echa atrás, su parte queda libre", () => {
  let s = base([item({ id: "vino", totalCents: 1400 })]);
  s = applyClaim(s, "vino", "alex", 1, 2);
  s = applyClaim(s, "vino", "marta", 1);
  assert.deepEqual(owed(s), { alex: 700, marta: 700, nuria: 0 });

  // Alex pidió «entre 2» a mano, así que sigue pagando su mitad y la otra
  // vuelve a estar disponible en vez de caerle encima sin avisar.
  s = applyClaim(s, "vino", "marta", 0);
  assert.deepEqual(owed(s), { alex: 700, marta: 0, nuria: 0 });
  assert.equal(computeSettlement(s).unassignedCents, 700);
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

  // Quedaba una caña: Nuria pide dos y se lleva la que hay.
  s = applyClaim(s, "cañas", "nuria", 2);
  assert.equal(s.items[0].splitInto, 4);
  assert.deepEqual(owed(s), { alex: 250, marta: 500, nuria: 250 });
  assert.equal(computeSettlement(s).unassignedCents, 0);
});

test("soltar la última parte devuelve la línea a su estado inicial", () => {
  let s = base([item({ id: "vino", totalCents: 1400 })]);
  s = applyClaim(s, "vino", "alex", 1, 2);
  s = applyClaim(s, "vino", "marta", 1);
  s = applyClaim(s, "vino", "alex", 0);
  s = applyClaim(s, "vino", "marta", 0);
  // El «entre 2» era de Alex: al soltarlo los dos, la línea vuelve a ser una.
  s = applyClaim(s, "vino", "alex", 1, 1);
  s = applyClaim(s, "vino", "alex", 0);

  assert.equal(s.items[0].splitInto, 1);
  assert.equal(s.claims.length, 0);
  assert.equal(computeSettlement(s).unassignedCents, 1400);
});
