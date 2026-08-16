"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * El pago que se quedó a medias al salir del navegador.
 *
 * Pagar por Revolut te lleva a su web y se vuelve con el botón de atrás, así
 * que la hoja de pagar puede haberse perdido por el camino y con ella la
 * pregunta de «¿lo has enviado?» — que es la mitad de la que hace que el aviso
 * signifique algo. Se deja apuntado antes de salir y se recoge al volver.
 *
 * En `sessionStorage` y no en `localStorage` a propósito: si cierras la
 * pestaña, el pago a medias deja de existir en vez de reaparecer preguntándote
 * por una cena de la semana pasada.
 *
 * Se lee con `useSyncExternalStore` y no en un efecto porque es exactamente
 * para lo que está: un dato que vive fuera de React, que en el servidor no
 * existe, y que así no obliga a pintar dos veces ni descuadra la hidratación.
 */

export interface PagoPendiente {
  id: string;
  cents: number;
}

const listeners = new Set<() => void>();
const clave = (code: string) => `divi.pagando:${code}`;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function avisa(): void {
  for (const listener of listeners) listener();
}

export function guardarPagoPendiente(code: string, pago: PagoPendiente): void {
  try {
    window.sessionStorage.setItem(clave(code), JSON.stringify(pago));
    avisa();
  } catch {
    // Sin almacén se pierde la pregunta de al volver, nada más.
  }
}

export function olvidarPagoPendiente(code: string): void {
  try {
    window.sessionStorage.removeItem(clave(code));
    avisa();
  } catch {
    // idem
  }
}

export function usePagoPendiente(code: string): PagoPendiente | null {
  // La cadena cruda, que es lo que se puede devolver estable: dos lecturas
  // iguales dan el mismo texto y React no se queja de que cambie el snapshot.
  const raw = useSyncExternalStore(
    subscribe,
    useCallback(() => {
      try {
        return window.sessionStorage.getItem(clave(code));
      } catch {
        return null;
      }
    }, [code]),
    () => null,
  );

  return useMemo(() => {
    if (!raw) return null;
    try {
      const pago = JSON.parse(raw) as PagoPendiente;
      return pago?.id ? pago : null;
    } catch {
      return null;
    }
  }, [raw]);
}
