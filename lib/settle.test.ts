import assert from "node:assert/strict";
import test from "node:test";
// Extensiones explícitas: así corre con el stripping de tipos nativo de Node,
// sin runner ni dependencias de test.
import { computeSettlement, splitCents, totalAfterRemoving } from "./settle.ts";
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
  return { id, ticketId: "T", name: id, color: "#fff", isPayer: false, settled: false, ...over };
}

function state(
  items: Item[],
  participants: Participant[],
  claims: Claim[],
  totalCents: number,
): TicketState {
  return {
    ticket: { id: "T", place: null, tableLabel: null, currency: "EUR", totalCents, payerId: null, createdAt: "" },
    receipts: [],
    items,
    participants,
    claims,
    events: [],
    pagos: [],
  };
}

/** El orden de `byParticipant` es de pantalla, no de entrada. */
function owed(out: { byParticipant: { participantId: string; owesCents: number }[] }, id: string) {
  return out.byParticipant.find((p) => p.participantId === id)!.owesCents;
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
  assert.equal(owed(out, "a"), 1200);
  assert.equal(owed(out, "b"), 0);
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
  assert.equal(owed(out, "a"), 500);
  assert.equal(out.byItem.paella.freeShares, 3);
  assert.equal(out.byItem.paella.perShareCents, 500);
  assert.equal(out.unassignedCents, 1500);
  assert.equal(out.complete, false);

  // Y cuando el segundo se apunta, su parte es la misma: nadie recalcula nada.
  const withB = computeSettlement({
    ...s,
    claims: [...s.claims, { itemId: "paella", participantId: "b", shares: 1 }],
  });
  assert.equal(owed(withB, "a"), 500);
  assert.equal(owed(withB, "b"), 500);
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
  assert.equal(owed(out, "a"), 500);
  assert.equal(owed(out, "b"), 250);
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
  assert.equal(owed(out, "a"), 8250);
  assert.equal(owed(out, "b"), 2750);
  assert.equal(out.assignedCents, 11000);
  assert.equal(out.unassignedCents, 0);
});

test("quien pagó no se debe nada a sí mismo", () => {
  // Adelantó los 40 €, así que lo pendiente son sólo los 10 € del otro. Si su
  // propia parte contara, la pantalla pediría cobrar dinero que ya está pagado.
  const items = [item({ id: "i1", totalCents: 3000 }), item({ id: "i2", totalCents: 1000 })];
  const claims: Claim[] = [
    { itemId: "i1", participantId: "pagador", shares: 1 },
    { itemId: "i2", participantId: "otro", shares: 1 },
  ];
  const out = computeSettlement(
    state(items, [person("pagador", { isPayer: true }), person("otro")], claims, 4000),
  );
  assert.equal(out.pendingCents, 1000);

  // El saldo del pagador es lo que le deben, en negativo: comió 30 y puso 40.
  // Se mira aquí y no en su parte porque desde que una mesa puede tener varios
  // tickets con un pagador distinto cada uno, «lo que pusiste menos lo que
  // comiste» es lo único que sigue significando lo mismo para todo el mundo.
  assert.equal(owed(out, "pagador"), -1000);
  assert.equal(owed(out, "otro"), 1000);
  assert.deepEqual(out.transactions, [{ fromId: "otro", toId: "pagador", cents: 1000 }]);

  // Y no está saldado mientras siga esperando su dinero: lo estará cuando el
  // otro marque que ha pagado, no por el hecho de haber puesto la tarjeta.
  // Antes se daba por saldado desde el principio, y la fila de quien todavía
  // tenía diez euros que cobrar se veía igual que la de quien ya no esperaba
  // nada.
  assert.equal(out.byParticipant.find((p) => p.participantId === "pagador")!.settled, false);

  const cobrado = computeSettlement(
    state(items, [person("pagador", { isPayer: true }), person("otro", { settled: true })], claims, 4000),
  );
  assert.equal(cobrado.pendingCents, 0);
  assert.equal(cobrado.byParticipant.find((p) => p.participantId === "pagador")!.settled, true);
});

test("marcar «he pagado» descuenta esa parte de lo pendiente", () => {
  const items = [item({ id: "i1", totalCents: 3000 }), item({ id: "i2", totalCents: 1000 })];
  const claims: Claim[] = [
    { itemId: "i1", participantId: "pagador", shares: 1 },
    { itemId: "i2", participantId: "otro", shares: 1 },
  ];
  const saldado = computeSettlement(
    state(items, [person("pagador", { isPayer: true }), person("otro", { settled: true })], claims, 4000),
  );
  assert.equal(saldado.pendingCents, 0);
});

test("sin pagador marcado, lo pendiente es la cuenta entera", () => {
  const s = state(
    [item({ id: "i1", totalCents: 2000 })],
    [person("a")],
    [{ itemId: "i1", participantId: "a", shares: 1 }],
    2000,
  );
  assert.equal(computeSettlement(s).pendingCents, 2000);
});

test("la lista pone arriba a quien más debe y hunde a los que ya pagaron", () => {
  // Es el orden que contesta «¿quién me falta?» sin tener que leer la lista.
  const s = state(
    [
      item({ id: "i1", totalCents: 1000 }),
      item({ id: "i2", totalCents: 3000 }),
      item({ id: "i3", totalCents: 2000 }),
    ],
    [person("poco"), person("mucho"), person("yapagó", { settled: true })],
    [
      { itemId: "i1", participantId: "poco", shares: 1 },
      { itemId: "i2", participantId: "mucho", shares: 1 },
      { itemId: "i3", participantId: "yapagó", shares: 1 },
    ],
    6000,
  );
  const out = computeSettlement(s);
  assert.deepEqual(
    out.byParticipant.map((p) => p.participantId),
    ["mucho", "poco", "yapagó"],
  );
});

test("quitar una línea se lleva su dinero, no lo reparte entre todos", () => {
  // Sin bajar el total, esos 12 € reaparecerían como «extras» prorrateados: la
  // línea desaparecería de la pantalla y todos seguirían pagándola.
  const items = [
    item({ id: "vino", totalCents: 1200 }),
    item({ id: "paella", totalCents: 2000 }),
  ];
  assert.equal(totalAfterRemoving(3200, items, "vino"), 2000);

  const after = computeSettlement(
    state(
      items.filter((i) => i.id !== "vino"),
      [person("a")],
      [{ itemId: "paella", participantId: "a", shares: 1 }],
      totalAfterRemoving(3200, items, "vino"),
    ),
  );
  assert.equal(owed(after, "a"), 2000);
  assert.equal(after.extrasCents, 0);
  assert.equal(after.complete, true);
});

test("quitar una línea respeta el servicio del ticket", () => {
  // Ticket de 88 € con 80 € de platos: los 8 € de servicio siguen ahí después.
  const items = [item({ id: "i1", totalCents: 5000 }), item({ id: "i2", totalCents: 3000 })];
  assert.equal(totalAfterRemoving(8800, items, "i2"), 5800);
});

test("quitar algo añadido a mano no arrastra el total impreso", () => {
  // Ticket de 72,14 al que alguien añadió una caña de 2,50 que ya venía dentro:
  // al quitarla el total tiene que quedarse donde estaba, no bajar a 69,64.
  const items = [
    item({ id: "ticket", totalCents: 7214 }),
    item({ id: "añadida", totalCents: 250 }),
  ];
  assert.equal(totalAfterRemoving(7214, items, "añadida"), 7214);
});

test("quitar la última línea deja el ticket a cero y no en negativo", () => {
  const items = [item({ id: "solo", totalCents: 900 })];
  assert.equal(totalAfterRemoving(900, items, "solo"), 0);
  assert.equal(totalAfterRemoving(500, items, "solo"), 0);
  // Una línea que ya no existe no toca nada.
  assert.equal(totalAfterRemoving(900, items, "fantasma"), 900);
});

test("lo que cobra el pagador cuadra con el ticket hasta el último céntimo", () => {
  // Importes feos a propósito: si el reparto de céntimos se torciera, lo que le
  // devuelven más su propia parte no sumaría los 48,33 € que puso.
  const s = state(
    [
      item({ id: "i1", totalCents: 1733 }),
      item({ id: "i2", totalCents: 999 }),
      item({ id: "i3", totalCents: 2101, splitInto: 3 }),
    ],
    [person("a", { isPayer: true }), person("b"), person("c")],
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
  assert.equal(out.unassignedCents, 0);

  // Lo que le devuelven más lo que se comió él tiene que ser el ticket entero.
  // Su parte se lee de `itemsCents`: `owesCents` ya no es lo que le toca pagar
  // sino su saldo —lo comido menos lo puesto—, que en el pagador sale negativo.
  const a = out.byParticipant.find((p) => p.participantId === "a")!;
  assert.equal(a.itemsCents, 2434);
  assert.equal(out.pendingCents, 2399);
  assert.equal(out.pendingCents + a.itemsCents, 4833);

  // Y por el otro lado: el saldo del pagador es exactamente lo que le deben.
  assert.equal(owed(out, "a"), -2399);
  assert.equal(owed(out, "b") + owed(out, "c"), 2399);
});

test("un ticket con descuento no dice que hay dinero repartido antes de repartirlo", () => {
  /*
    El caso que se veía en pantalla: líneas por 63,10 € y un total impreso de
    59,94 porque el bar aplicó un 5 % de descuento. Con la mesa vacía, la
    cabecera decía «repartido −3,16 €» y «sin repartir 63,10 €», que es más
    dinero del que hay en la mesa. Lo que no tiene dueño es el total entero.
  */
  const s = state([item({ id: "todo", totalCents: 6310 })], [person("a")], [], 5994);
  const out = computeSettlement(s);
  assert.equal(out.extrasCents, -316);
  assert.equal(out.assignedCents, 0);
  assert.equal(out.unassignedCents, 5994);
  assert.equal(out.complete, false);

  // Y en cuanto alguien la coge, el descuento se va con ella: paga los 59,94.
  const conDueño = computeSettlement({
    ...s,
    claims: [{ itemId: "todo", participantId: "a", shares: 1 }],
  });
  assert.equal(owed(conDueño, "a"), 5994);
  assert.equal(conDueño.assignedCents, 5994);
  assert.equal(conDueño.unassignedCents, 0);
});
