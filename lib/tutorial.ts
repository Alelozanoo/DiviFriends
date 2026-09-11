"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Por dónde va el guiado de una mesa de ejemplo, guardado en el móvil.
 *
 * Dos de los cuatro pasos —abrir el reparto, abrir las cuentas— son gestos y
 * no dejan rastro en la comanda, así que había que recordarlos. Estaban en
 * memoria de la pantalla y eso se perdía al recargar o al volver un rato
 * después: quien ya había terminado el guiado se lo encontraba a medias, con
 * un paso que decía «divide algo» cuando ya lo había dividido.
 *
 * Van por código de mesa y no sueltos: quien repite el guiado con una mesa
 * nueva empieza de cero, que es de lo que se trata, y la vieja conserva lo
 * suyo si vuelve a ella.
 *
 * Si el navegador no deja guardar —modo privado lleno— el guiado sigue
 * funcionando y sólo pierde la memoria entre visitas, que es exactamente como
 * estaba antes.
 */

export interface PasosHechos {
  dividido: boolean;
  cuentas: boolean;
}

const NADA: PasosHechos = { dividido: false, cuentas: false };
const oyentes = new Set<() => void>();

const clave = (code: string) => `divi.guiado:${code}`;

function leer(code: string): PasosHechos {
  try {
    const raw = localStorage.getItem(clave(code));
    if (!raw) return NADA;
    const datos = JSON.parse(raw) as Partial<PasosHechos>;
    return { dividido: datos.dividido === true, cuentas: datos.cuentas === true };
  } catch {
    return NADA;
  }
}

function subscribe(o: () => void) {
  oyentes.add(o);
  window.addEventListener("storage", o);
  return () => {
    oyentes.delete(o);
    window.removeEventListener("storage", o);
  };
}

/*
  `useSyncExternalStore` exige que dos lecturas seguidas devuelvan el mismo
  objeto o se queda repintando sin parar, y `JSON.parse` crea uno nuevo cada
  vez. Se cachea por el texto crudo, igual que en `lib/misDivis.ts`.
*/
let ultimoTexto: string | null = null;
let ultimo: PasosHechos = NADA;

export function useGuiado(code: string) {
  const instantanea = useCallback(() => {
    let texto: string | null = null;
    try {
      texto = localStorage.getItem(clave(code));
    } catch {
      texto = null;
    }
    if (texto !== ultimoTexto) {
      ultimoTexto = texto;
      ultimo = leer(code);
    }
    return ultimo;
  }, [code]);

  const hechos = useSyncExternalStore(subscribe, instantanea, () => NADA);

  const apunta = useCallback(
    (paso: keyof PasosHechos) => {
      const ahora = { ...leer(code), [paso]: true };
      try {
        localStorage.setItem(clave(code), JSON.stringify(ahora));
      } catch {
        // Sin sitio: el guiado sigue, sólo que sin memoria entre visitas.
      }
      for (const o of oyentes) o();
    },
    [code],
  );

  return { hechos, apunta };
}
