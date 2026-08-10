import assert from "node:assert/strict";
import test from "node:test";
import { quantity } from "./format.ts";

/*
 * La cantidad de una línea sale de la lectura de la foto, así que puede venir
 * entera —«2 cañas»— o con decimales, porque en una carnicería lo que se compra
 * es peso. Escribirla tal cual la da JavaScript ponía un punto donde el español
 * espera una coma, y «1.025» de entrañas se lee mil veinticinco.
 */

test("las unidades enteras salen sin adornos", () => {
  assert.equal(quantity(1), "1");
  assert.equal(quantity(9), "9");
});

test("el peso lleva coma, no punto", () => {
  assert.equal(quantity(1.025), "1,025");
  assert.equal(quantity(0.465), "0,465");
});

test("sin ceros de relleno a la derecha", () => {
  assert.equal(quantity(1.5), "1,5");
  assert.equal(quantity(2.0), "2");
});

test("se corta en la milésima, que es lo que imprime una balanza", () => {
  assert.equal(quantity(1.0256), "1,026");
});

/*
 * Una cantidad que no se pudo leer no puede dejar la columna en blanco ni
 * escribir «NaN» en un ticket: la línea existe, así que cuenta como una.
 */
test("lo ilegible cuenta como una unidad", () => {
  assert.equal(quantity(Number.NaN), "1");
  assert.equal(quantity(0), "1");
  assert.equal(quantity(-3), "1");
});
