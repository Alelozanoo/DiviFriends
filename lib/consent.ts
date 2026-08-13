/**
 * El sí o el no a la cookie de Meta.
 *
 * Se guarda en `localStorage` y no en una cookie a propósito: recordar que
 * has dicho que no es lo único que hace falta, y para eso no hay que
 * escribir ninguna cookie más.
 *
 * Mientras no haya respuesta no se carga nada de Facebook —ni el script—, así
 * que hasta que alguien pulse «Aceptar» esta web no habla con nadie.
 */

export const CLAVE = "divi.cookies";
export const EVENTO = "divi:cookies";

export type Respuesta = "si" | "no" | null;

export function leer(): Respuesta {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(CLAVE);
    return v === "si" || v === "no" ? v : null;
  } catch {
    // Navegación privada con el almacenamiento capado: sin respuesta, y por
    // tanto sin medición. Es el lado seguro.
    return null;
  }
}

export function guardar(respuesta: Exclude<Respuesta, null>): void {
  try {
    window.localStorage.setItem(CLAVE, respuesta);
  } catch {
    // Aunque no se pueda guardar, la decisión vale para esta visita.
  }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: respuesta }));
}

/** Vuelve a preguntar: retirar el consentimiento tiene que ser tan fácil como darlo. */
export function olvidar(): void {
  try {
    window.localStorage.removeItem(CLAVE);
  } catch {
    // nada que hacer
  }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: null }));
}
