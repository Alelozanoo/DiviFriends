import assert from "node:assert/strict";
import test from "node:test";

import {
  claveRecordatorio,
  pagoLaCuenta,
  puedeRecordar,
  textoRecordatorio,
  TONOS,
} from "./recordatorio.ts";
import { computeSettlement } from "./settle.ts";
import type { TicketState } from "./types.ts";

/*
 * Lo que se prueba aquí es quién puede mandarle un correo a quién y con qué
 * cifra. Es la única parte del recordatorio que puede acabar en la bandeja de
 * una persona real diciendo algo falso, así que va suelta de la ruta y se
 * prueba sin sesión, sin red y sin mandar nada.
 */

/** Una mesa: A pone la tarjeta, y los tres se reparten un plato de 30 €. */
function mesa(over: { pagador?: string | null; settled?: string[] } = {}): TicketState {
  const gente = ["A", "B", "C"];
  const pagador = over.pagador === undefined ? "A" : over.pagador;
  return {
    ticket: {
      id: "T",
      place: "Bar Bartolo",
      tableLabel: null,
      currency: "EUR",
      totalCents: 3000,
      payerId: pagador,
      createdAt: "2026-09-04T21:00:00.000Z",
    },
    participants: gente.map((id) => ({
      id,
      ticketId: "T",
      name: id,
      color: "#e8b04b",
      isPayer: id === pagador,
      settled: (over.settled ?? []).includes(id),
    })),
    items: [
      {
        id: "i1",
        ticketId: "T",
        name: "Cena",
        qty: 1,
        unitCents: 3000,
        totalCents: 3000,
        splitInto: 3,
        manualSplit: false,
        position: 0,
      },
    ],
    claims: gente.map((id) => ({ itemId: "i1", participantId: id, shares: 1 })),
    receipts: [],
    pagos: [],
    events: [],
  };
}

const veredicto = (state: TicketState, yo: string | null, aQuien: string) =>
  puedeRecordar({ state, settlement: computeSettlement(state), yo, aQuien });

test("el que pagó puede reclamar a quien le debe, por lo que le debe", () => {
  const r = veredicto(mesa(), "A", "B");
  assert.equal(r.puede, true);
  assert.equal(r.puede && r.cents, 1000); // 30 € entre tres
});

test("quien no está en la mesa no reclama", () => {
  assert.deepEqual(veredicto(mesa(), null, "B"), { puede: false, porque: "no-sentado" });
  assert.deepEqual(veredicto(mesa(), "Z", "B"), { puede: false, porque: "no-sentado" });
});

test("quien no puso la tarjeta no reclama, aunque esté sentado", () => {
  assert.deepEqual(veredicto(mesa(), "B", "C"), { puede: false, porque: "no-pagaste" });
});

test("a uno mismo no", () => {
  assert.deepEqual(veredicto(mesa(), "A", "A"), { puede: false, porque: "a-ti-mismo" });
});

test("a quien ya ha saldado, tampoco", () => {
  assert.deepEqual(veredicto(mesa({ settled: ["B"] }), "A", "B"), {
    puede: false,
    porque: "no-debe",
  });
});

test("a quien no está en la mesa no se le puede escribir", () => {
  assert.deepEqual(veredicto(mesa(), "A", "fantasma"), { puede: false, porque: "no-debe" });
});

test("vale el pagador de un ticket suelto, no sólo el de la mesa", () => {
  const state = mesa({ pagador: null });
  state.receipts = [{ id: "r1", label: "Ronda", totalCents: 3000, payerId: "A" }];
  state.items = [{ ...state.items[0], receiptId: "r1" }];
  assert.equal(pagoLaCuenta(state, "A"), true);
  assert.equal(veredicto(state, "A", "B").puede, true);
});

test("la cifra es lo que te debe a ti, no lo que debe al bote", () => {
  // Dos tickets con dos pagadores: B le debe a A su parte de la comida, no
  // también las copas que puso C.
  const state = mesa({ pagador: null });
  state.ticket.totalCents = 6000;
  state.receipts = [
    { id: "r1", label: "Comida", totalCents: 3000, payerId: "A" },
    { id: "r2", label: "Copas", totalCents: 3000, payerId: "C" },
  ];
  state.items = [
    { ...state.items[0], id: "i1", receiptId: "r1" },
    { ...state.items[0], id: "i2", receiptId: "r2" },
  ];
  state.claims = ["A", "B", "C"].flatMap((id) => [
    { itemId: "i1", participantId: id, shares: 1 },
    { itemId: "i2", participantId: id, shares: 1 },
  ]);

  const cuentas = computeSettlement(state);
  const deudaTotal = cuentas.byParticipant.find((p) => p.participantId === "B")!.owesCents;
  const r = puedeRecordar({ state, settlement: cuentas, yo: "A", aQuien: "B" });
  assert.equal(r.puede, true);
  assert.ok(r.puede && r.cents > 0 && r.cents <= deudaTotal, "nunca se reclama más de lo que debe");
  assert.equal(
    r.puede && r.cents,
    cuentas.transactions.find((tx) => tx.fromId === "B" && tx.toId === "A")?.cents ?? deudaTotal,
  );
});

/* ------------------------------------------------------------- el correo */

test("cada tono dice algo distinto, y ninguno se deja la cifra", () => {
  const vistos = new Set<string>();
  for (const tono of TONOS) {
    const aviso = textoRecordatorio({ mesa: "Bar Bartolo", quien: "Ale", dinero: "12,50 €", tono });
    assert.ok(aviso.asunto.length > 0 && aviso.texto.length > 0 && aviso.boton.length > 0);
    assert.match(`${aviso.asunto} ${aviso.texto}`, /12,50/, `${tono} sin la cifra`);
    assert.match(`${aviso.asunto} ${aviso.texto}`, /Ale/, `${tono} sin quién lo pide`);
    vistos.add(aviso.asunto);
  }
  assert.equal(vistos.size, TONOS.length, "dos tonos con el mismo asunto");
});

test("sin nombre de sitio, el correo no dice «null»", () => {
  for (const tono of TONOS) {
    const aviso = textoRecordatorio({ mesa: null, quien: "Ale", dinero: "5,00 €", tono });
    assert.doesNotMatch(`${aviso.asunto} ${aviso.texto}`, /null|undefined/);
  }
});

test("la clave lleva el día y no el tono: una al día por persona y mesa", () => {
  assert.equal(
    claveRecordatorio("AB12", "u1", "2026-09-04"),
    claveRecordatorio("AB12", "u1", "2026-09-04"),
    "cambiar de tono no puede servir para escribir otra vez el mismo día",
  );
  assert.notEqual(
    claveRecordatorio("AB12", "u1", "2026-09-04"),
    claveRecordatorio("AB12", "u1", "2026-09-05"),
  );
  assert.notEqual(
    claveRecordatorio("AB12", "u1", "2026-09-04"),
    claveRecordatorio("AB12", "u2", "2026-09-04"),
  );
});
