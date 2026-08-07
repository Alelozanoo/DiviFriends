"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // "storage" cubre el caso de tener la comanda abierta en dos pestañas.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * Quién eres en esta comanda, guardado en el navegador.
 *
 * Devuelve `null` mientras se renderiza en el servidor y durante la hidratación,
 * y una cadena (vacía si no hay nadie) en cuanto el dato es real. Así la pantalla
 * no pregunta el nombre a quien ya se había unido.
 */
export function useStoredParticipant(code: string) {
  const key = `divifriends:me:${code}`;

  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key) ?? "",
    () => null,
  );

  const store = useCallback(
    (participantId: string | null) => {
      if (participantId) window.localStorage.setItem(key, participantId);
      else window.localStorage.removeItem(key);
      for (const listener of listeners) listener();
    },
    [key],
  );

  return { known: raw !== null, participantId: raw || null, store };
}
