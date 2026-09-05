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
 *
 * Al lado del asiento se apunta **de qué cuenta era** (`cuenta`), o nada si
 * se ocupó como invitado. Sin eso, el móvil recordaba el asiento por mesa y
 * nada más: salías de una cuenta, entrabas con otra, abrías la misma mesa y
 * seguías sentado donde la primera, marcando platos a su nombre. Quien lee
 * esto decide si el asiento guardado vale para quien está ahora.
 */
export function useStoredParticipant(code: string) {
  const key = `divifriends:me:${code}`;
  const keyCuenta = `${key}:cuenta`;

  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(key) ?? "",
    () => null,
  );
  const cuenta = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(keyCuenta) ?? "",
    () => null,
  );

  const store = useCallback(
    (participantId: string | null, uid?: string | null) => {
      if (participantId) {
        window.localStorage.setItem(key, participantId);
        if (uid) window.localStorage.setItem(keyCuenta, uid);
        else window.localStorage.removeItem(keyCuenta);
      } else {
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(keyCuenta);
      }
      for (const listener of listeners) listener();
    },
    [key, keyCuenta],
  );

  return { known: raw !== null, participantId: raw || null, cuenta: cuenta || null, store };
}
