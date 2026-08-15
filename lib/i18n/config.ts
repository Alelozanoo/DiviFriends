/**
 * Lo que tienen que compartir el servidor y el navegador.
 *
 * Vive aparte de `index.tsx` a propósito, porque aquél lleva `"use client"` y
 * eso no es sólo una etiqueta: cuando un componente de servidor importa algo
 * de un módulo de cliente, Next no le pasa el valor sino una referencia. La
 * constante llegaba al servidor convertida en una función, `cookies().get()`
 * buscaba una cookie llamada «function» y devolvía `undefined` siempre — así
 * que la comanda salía en español dijera lo que dijese la cookie.
 *
 * Este fichero no lleva la marca, así que el valor es el valor en los dos
 * lados.
 */
export type Lang = "es" | "en";

export const COOKIE = "divi.lang";

/** Lo que diga la cookie, y español ante la duda. */
export function idiomaDe(valor: string | undefined): Lang {
  return valor === "en" ? "en" : "es";
}
