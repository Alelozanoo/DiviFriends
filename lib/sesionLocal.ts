"use client";

import { useSyncExternalStore } from "react";

/**
 * La huella de la sesión, en el móvil.
 *
 * La portada es estática y llega siempre pintada la de venta. Firebase tarda
 * entre uno y tres segundos en decir «hay usuario»: carga su código, lee la
 * sesión del móvil y, antes de contestar, llama a Google para comprobarla.
 * Ese rato, quien tiene cuenta veía la web de venta y luego un salto a lo
 * suyo, y lo confundía.
 *
 * Esto es una marca de un byte que se deja al entrar y se quita al salir. La
 * lee un script de `app/layout.tsx` antes del primer pintado —marca
 * `<html data-sesion>` y el CSS esconde la portada de venta— y la lee
 * `Landing` al hidratar para enseñar «Tus mesas» sin esperar a Firebase, que
 * confirma por detrás. Si Firebase dice que no hay nadie, la marca se borra y
 * la portada de venta vuelve: es una pista, no una credencial.
 *
 * Los valores: `"1"` para cualquier cuenta, `"casa"` para la de la casa, que
 * en vez de sus mesas ve el panel, y ahí se prefiere esperar en blanco a
 * enseñar la pantalla equivocada.
 */
export const CLAVE_SESION = "divi.sesion";

export type SesionLocal = "1" | "casa" | null;

const oyentes = new Set<() => void>();

export function leerSesion(): SesionLocal {
  try {
    const v = localStorage.getItem(CLAVE_SESION);
    return v === "1" || v === "casa" ? v : null;
  } catch {
    return null;
  }
}

/** Se llama cuando Firebase habla: con el valor al entrar, con `null` al salir. */
export function apuntaSesion(valor: SesionLocal): void {
  try {
    if (valor) localStorage.setItem(CLAVE_SESION, valor);
    else localStorage.removeItem(CLAVE_SESION);
  } catch {
    /* sin sitio: la portada tarda como antes, nada más */
  }
  const raiz = document.documentElement;
  if (valor) raiz.setAttribute("data-sesion", valor);
  else raiz.removeAttribute("data-sesion");
  for (const o of oyentes) o();
}

function subscribe(o: () => void) {
  oyentes.add(o);
  window.addEventListener("storage", o);
  return () => {
    oyentes.delete(o);
    window.removeEventListener("storage", o);
  };
}

/** `null` en el servidor y en quien nunca entró; si no, lo que dejó la última sesión. */
export function useSesionLocal(): SesionLocal {
  return useSyncExternalStore(subscribe, leerSesion, () => null);
}
