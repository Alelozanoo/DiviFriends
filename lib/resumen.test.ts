import assert from "node:assert/strict";
import test from "node:test";
import { debes, delMes, fechaDe, teDeben } from "./resumen.ts";
import type { DiviGuardado } from "./misDivis.ts";

function divi(over: Partial<DiviGuardado> & Pick<DiviGuardado, "code">): DiviGuardado {
  return {
    place: "Bar Bartolo",
    at: "2026-09-10T21:00:00.000Z",
    currency: "EUR",
    cents: 0,
    aQuien: null,
    saldado: false,
    gente: [],
    ...over,
  };
}

const SEPTIEMBRE = new Date("2026-09-15T12:00:00.000Z");

test("suma lo puesto y separa lo que ha vuelto de lo que falta", () => {
  const r = delMes(
    [
      divi({
        code: "AAAA",
        puestoCents: 4000,
        mioCents: 1500,
        deudas: [
          { name: "Sofía", cents: 1500, pagado: true },
          { name: "María", cents: 1000, pagado: false },
        ],
      }),
      divi({
        code: "BBBB",
        puestoCents: 2000,
        mioCents: 800,
        deudas: [{ name: "Nacho", cents: 1200, pagado: false }],
      }),
    ],
    SEPTIEMBRE,
  );
  assert.equal(r.puestoCents, 6000);
  assert.equal(r.mioCents, 2300);
  assert.equal(r.vueltoCents, 1500);
  assert.equal(r.debenCents, 2200);
  assert.equal(r.divis, 2);
});

test("lo de otro mes no entra", () => {
  const r = delMes(
    [
      divi({ code: "AAAA", puestoCents: 4000, deudas: [] }),
      divi({ code: "BBBB", creada: "2026-08-02T20:00:00.000Z", puestoCents: 9900, deudas: [] }),
    ],
    SEPTIEMBRE,
  );
  assert.equal(r.puestoCents, 4000);
  assert.equal(r.divis, 1);
});

test("manda la fecha de la mesa, no la de la última visita", () => {
  // Abierta hoy, cenada en agosto: cuenta en agosto.
  const vieja = divi({ code: "AAAA", creada: "2026-08-02T20:00:00.000Z", puestoCents: 5000 });
  assert.equal(fechaDe(vieja), "2026-08-02T20:00:00.000Z");
  assert.equal(delMes([vieja], SEPTIEMBRE).divis, 0);
});

test("las divis de antes no se inventan: se cuentan aparte", () => {
  const r = delMes([divi({ code: "AAAA" }), divi({ code: "BBBB", puestoCents: 1000 })], SEPTIEMBRE);
  assert.equal(r.divis, 1);
  assert.equal(r.sinDatos, 1);
  assert.equal(r.puestoCents, 1000);
});

test("no se suman monedas distintas", () => {
  const r = delMes(
    [
      divi({ code: "AAAA", at: "2026-09-12T21:00:00.000Z", puestoCents: 3000 }),
      divi({ code: "BBBB", at: "2026-09-11T21:00:00.000Z", currency: "GBP", puestoCents: 9900 }),
    ],
    SEPTIEMBRE,
  );
  assert.equal(r.currency, "EUR");
  assert.equal(r.puestoCents, 3000);
});

test("quién te debe: de más a menos, y las pagadas fuera", () => {
  const lineas = teDeben([
    divi({
      code: "AAAA",
      deudas: [
        { name: "Sofía", cents: 200, pagado: false },
        { name: "Ya pagó", cents: 9999, pagado: true },
      ],
    }),
    divi({ code: "BBBB", place: "El Caballo", deudas: [{ name: "María", cents: 500, pagado: false }] }),
  ]);
  assert.deepEqual(
    lineas.map((l) => `${l.name} ${l.cents} ${l.place}`),
    ["María 500 El Caballo", "Sofía 200 Bar Bartolo"],
  );
});

test("lo que debes tú: sólo lo que no está saldado", () => {
  const lineas = debes([
    divi({ code: "AAAA", cents: 750, aQuien: "Álex" }),
    divi({ code: "BBBB", cents: 300, aQuien: "Ana", saldado: true }),
    divi({ code: "CCCC", cents: -900 }),
  ]);
  assert.deepEqual(lineas.map((l) => `${l.name} ${l.cents}`), ["Álex 750"]);
});
