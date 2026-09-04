import assert from "node:assert/strict";
import test from "node:test";
// Extensiones explícitas: así corre con el stripping de tipos nativo de Node.
import { fundeDivis, limpiaQuitadas, quitada, TOPE_QUITADAS } from "./fundeDivis.ts";
import type { DiviGuardado } from "./misDivis.ts";

const divi = (code: string, at: string): DiviGuardado => ({
  code,
  place: code,
  at,
  currency: "EUR",
  cents: 0,
  aQuien: null,
  saldado: false,
  gente: [],
});

test("la que se vio más tarde manda", () => {
  const { divis } = fundeDivis([divi("AAAAAA", "2026-09-01T10:00:00Z")], [divi("AAAAAA", "2026-09-02T10:00:00Z")]);
  assert.equal(divis.length, 1);
  assert.equal(divis[0].at, "2026-09-02T10:00:00Z");
});

test("quitar una divi la saca aunque la otra lista la traiga", () => {
  const vieja = divi("AAAAAA", "2026-09-01T10:00:00Z");
  const marcas = { AAAAAA: "2026-09-03T20:00:00Z" };
  const { divis, quitadas } = fundeDivis([vieja], [], marcas);
  assert.deepEqual(divis, []);
  assert.deepEqual(quitadas, marcas);
  assert.equal(quitada(vieja, marcas), true);
});

test("volver a entrar después de quitarla la trae de vuelta y borra la marca", () => {
  const marcas = { AAAAAA: "2026-09-03T20:00:00Z" };
  const nueva = divi("AAAAAA", "2026-09-04T09:00:00Z");
  const { divis, quitadas } = fundeDivis([], [nueva], marcas);
  assert.equal(divis.length, 1);
  assert.deepEqual(quitadas, {});
});

test("las marcas se quedan en las más recientes", () => {
  const marcas: Record<string, string> = {};
  for (let i = 0; i < TOPE_QUITADAS + 10; i++) {
    marcas[`C${String(i).padStart(5, "0")}`] = new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString();
  }
  const { quitadas } = fundeDivis([], [], marcas);
  assert.equal(Object.keys(quitadas).length, TOPE_QUITADAS);
  assert.ok(!("C00000" in quitadas), "la más vieja se va");
  assert.ok(`C${String(TOPE_QUITADAS + 9).padStart(5, "0")}` in quitadas, "la más nueva se queda");
});

test("limpiaQuitadas tira lo que no es un código o una fecha", () => {
  assert.deepEqual(
    limpiaQuitadas({ AAAAAA: "2026-09-03T20:00:00Z", "no vale": "2026-09-03T20:00:00Z", BBBBBB: "ayer", CCCCCC: 5 }),
    { AAAAAA: "2026-09-03T20:00:00Z" },
  );
  assert.deepEqual(limpiaQuitadas(["AAAAAA"]), {});
  assert.deepEqual(limpiaQuitadas(null), {});
});
