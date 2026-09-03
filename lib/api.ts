import { NextResponse } from "next/server";
import { consume, type Quota } from "./rateLimit";
import { computeSettlement } from "./settle";
import { StoreError } from "./store";
import type { TicketState } from "./types";

/**
 * El cuerpo de la petición como JSON, sin dejar que pese más de `max` bytes.
 *
 * `request.json()` se traga lo que le manden hasta el tope de la plataforma
 * (32 MB), y `content-length` no vale de aviso porque con `transfer-encoding:
 * chunked` no viene. Aquí se lee a trozos y se corta en cuanto se pasa.
 *
 * Un JSON roto devuelve `{}` para que sea la validación de cada ruta la que
 * conteste 400 con su mensaje. Pasarse de tamaño también devuelve `{}` salvo
 * con `estricto`, que lanza un 413 en `StoreError` para las rutas que parsean
 * dentro de su `try` y pueden convertirlo con `fail`.
 */
export async function cuerpo<T = Record<string, unknown>>(
  request: Request,
  max = 64_000,
  opciones: { estricto?: boolean } = {},
): Promise<T> {
  const lector = request.body?.getReader();
  if (!lector) return {} as T;
  const trozos: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await lector.cancel().catch(() => undefined);
      // Lo que se quiere es no cargarlo: cortada la lectura, ya está. Las
      // rutas que parsean antes de su `try` reciben `{}` y contestan con su
      // propio 400; las que lo envuelven piden `estricto` y dan el 413.
      if (opciones.estricto)
        throw new StoreError("Eso es demasiado grande.", 413);
      console.warn(
        `[cuerpo] cortado a ${max} bytes · ${request.method} ${new URL(request.url).pathname}`,
      );
      return {} as T;
    }
    trozos.push(value);
  }
  const texto = new TextDecoder().decode(Buffer.concat(trozos));
  try {
    const dato: unknown = JSON.parse(texto);
    return (typeof dato === "object" && dato !== null ? dato : {}) as T;
  } catch {
    return {} as T;
  }
}

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
/**
 * Pasa por el tope o devuelve el 429 ya hecho. Para que en cada ruta sea una
 * línea y no se olvide: `const alto = await puerta(...); if (alto) return alto;`.
 */
export async function puerta(
  quotas: Quota[],
  message: string,
): Promise<NextResponse | null> {
  const gate = await consume(quotas);
  if (gate.ok) return null;
  console.warn(
    `[limite] ${quotas.map((q) => q.key.split("_").slice(0, 2).join("_")).join(",")} · vuelve en ${gate.retryAfterSeconds}s`,
  );
  return tooMany(message, gate.retryAfterSeconds);
}

export function tooMany(message: string, retryAfterSeconds: number) {
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { "retry-after": String(Math.max(1, retryAfterSeconds)) },
    },
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
  return /FIREBASE_PROJECT_ID|Could not load the default credentials|UNAUTHENTICATED/i.test(
    message,
  );
}

export function asInt(value: unknown, fallback = 0): number {
  const n =
    typeof value === "string" ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
