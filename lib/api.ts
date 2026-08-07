import { NextResponse } from "next/server";
import { computeSettlement } from "./settle";
import { StoreError } from "./store";
import type { TicketState } from "./types";

export function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Respuesta estándar de cualquier mutación: el estado completo ya recalculado. */
export function ok(state: TicketState, headers?: Record<string, string>) {
  return NextResponse.json(
    { ...state, settlement: computeSettlement(state) },
    headers ? { headers } : undefined,
  );
}

/** Tope de uso alcanzado. `Retry-After` es estándar: dice cuándo volver. */
export function tooMany(message: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "retry-after": String(Math.max(1, retryAfterSeconds)) } },
  );
}

/**
 * Traduce los fallos previstos de la capa de datos a HTTP. Cualquier otra cosa
 * se propaga: un error inesperado debe verse en los logs, no convertirse en un
 * 400 silencioso.
 */
export function fail(error: unknown) {
  if (error instanceof StoreError) return bad(error.message, error.status);
  if (isMissingCredentials(error)) {
    return bad(
      "El servidor no puede conectar con Firestore. Revisa FIREBASE_PROJECT_ID y las credenciales.",
      503,
    );
  }
  throw error;
}

function isMissingCredentials(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return /FIREBASE_PROJECT_ID|Could not load the default credentials|UNAUTHENTICATED/i.test(message);
}

export function asInt(value: unknown, fallback = 0): number {
  const n = typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
