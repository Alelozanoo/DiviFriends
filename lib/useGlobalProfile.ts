"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface GlobalProfile {
  name: string;
  avatar?: string;
  bizum?: string;
  revolut?: string;
}

const KEY = "divifriends_profile";
/** Salta cada vez que el perfil cambia en este navegador: la cuenta lo escucha. */
export const EVENTO_PERFIL = "divi:perfil";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  window.addEventListener(EVENTO_PERFIL, listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
    window.removeEventListener(EVENTO_PERFIL, listener);
  };
}

/** El perfil guardado en este móvil, o `null`. */
export function leerPerfil(): GlobalProfile | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as GlobalProfile) : null;
  } catch {
    return null;
  }
}

/**
 * Escribe el perfil y avisa. `silencioso` es para cuando lo escribe la propia
 * cuenta al bajar de la nube: si avisara, la cuenta se lo volvería a subir.
 */
export function escribirPerfil(perfil: GlobalProfile, silencioso = false): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(perfil));
  } catch {
    return;
  }
  for (const listener of listeners) listener();
  if (!silencioso) window.dispatchEvent(new CustomEvent(EVENTO_PERFIL));
}

/** Tira el perfil de este móvil. Al cambiar de cuenta, lo de antes no vale. */
export function olvidarPerfil(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    return;
  }
  for (const listener of listeners) listener();
  window.dispatchEvent(new CustomEvent(EVENTO_PERFIL));
}

export function useGlobalProfile() {
  const raw = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(KEY),
    () => null,
  );

  let profile: GlobalProfile | null = null;
  if (raw) {
    try {
      profile = JSON.parse(raw);
    } catch {}
  }

  const saveProfile = useCallback((updates: Partial<GlobalProfile>) => {
    escribirPerfil({ ...leerPerfil(), ...updates } as GlobalProfile);
  }, []);

  return { profile, saveProfile };
}

