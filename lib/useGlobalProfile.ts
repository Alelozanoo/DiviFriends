"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface GlobalProfile {
  name: string;
  avatar?: string;
  bizum?: string;
  revolut?: string;
}

const KEY = "divifriends_profile";
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
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
    let current: GlobalProfile | null = null;
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      try {
        current = JSON.parse(raw);
      } catch {}
    }
    const p = { ...current, ...updates } as GlobalProfile;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(p));
      for (const listener of listeners) listener();
    } catch {
      // Ignore
    }
  }, []);

  return { profile, saveProfile };
}

