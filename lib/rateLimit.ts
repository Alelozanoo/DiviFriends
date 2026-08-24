import { createHash } from "node:crypto";

/**
 * Topes de uso para los endpoints que cuestan dinero.
 *
 * `POST /api/tickets` con una foto llama a un modelo que se paga por lectura y
 * no hay cuentas ni sesiones, así que sin un tope cualquiera puede mandar
 * imágenes en bucle contra la tarjeta.
 *
 * Son dos topes a la vez y cada uno cubre lo que el otro no:
 *
 *   - Por IP frena el caso normal, un script desde un sitio.
 *   - El global acota el daño máximo del día pase lo que pase. Es el que
 *     importa de verdad, porque repartir el ataque entre muchas IPs es fácil y
 *     esquiva cualquier límite por IP.
 *
 * El tope por IP va holgado a propósito: en el wifi de un bar, o detrás del
 * CGNAT de una operadora móvil, mucha gente distinta comparte una sola IP
 * pública. Apretarlo bloquearía a comensales de verdad.
 */
const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * Lo máximo que se puede gastar en un día leyendo tickets, en **dólares**:
 * tanto Google como Anthropic facturan en dólares, y mezclarlo con euros aquí
 * sería pedir que algún día alguien se lleve un susto con la factura.
 */
const PRESUPUESTO_DIARIO = 10;

/**
 * Lo que cuesta hoy leer un ticket, en dólares.
 *
 * Va por proveedor y mirando la misma `OCR_MODELO` que `lib/ocr.ts` porque el
 * modelo se puede cambiar en un despliegue: si el coste no siguiera al modelo,
 * volver a Opus dejaría puesto el tope de Gemini y la factura del día se
 * multiplicaría por dieciséis sin que nadie tocara nada.
 *
 * Medidos con la configuración que hay en `lib/ocr.ts`, a 2000 px:
 *
 *   - Gemini 3.7 Flash con thinking bajo (2026-08-20): 1291 de entrada, 285 de
 *     salida y 391 de pensamiento salen a 0,0018 $. Es el precio de estreno,
 *     que vale hasta el 31 de diciembre de 2026; en enero se va a ~0,0070 $ y
 *     hay que corregirlo aquí y en las tarifas de `lib/ocr.ts`.
 *   - Opus 5 con effort medium (2026-08-07): 0,0296 $.
 *
 * Cambiar de modelo o de resolución cambia este número, y con él se mueve solo
 * el tope de abajo, que es justo lo que se quiere: el freno lo pone el dinero,
 * no un número inventado.
 */
const COSTE_POR_LECTURA =
  process.env.OCR_MODELO?.trim().toLowerCase() === "anthropic" ? 0.0296 : 0.0018;

export const TOPES = {
  /** Crear una comanda desde una foto. Cada una cuesta ~0,2 ¢ de API. */
  lecturaDeTicket: {
    porIp: { max: 20, windowMs: HORA },
    // Sale de dividir el presupuesto entre lo que cuesta una lectura, para que
    // el tope y la factura no puedan separarse: con Gemini son 5.555 al día,
    // y volverían a ser 337 si `OCR_MODELO=anthropic`.
    global: { max: Math.floor(PRESUPUESTO_DIARIO / COSTE_POR_LECTURA), windowMs: DIA },
  },
  /** Crear una comanda escrita a mano. No llama a ninguna IA; sólo escribe. */
  comandaManual: {
    porIp: { max: 60, windowMs: HORA },
  },
} as const;

export interface Quota {
  /** Documento donde vive el contador. */
  key: string;
  max: number;
  windowMs: number;
}

export interface Counter {
  count: number;
  /** Milisegundos desde la época en que empezó la ventana actual. */
  windowStart: number;
}

export type Decision =
  | { ok: true; writes: (Counter | null)[] }
  | { ok: false; retryAfterSeconds: number };

/**
 * Decide si una petición cabe en todos sus topes. Pura a propósito: es la parte
 * con la aritmética de ventanas, y así se puede probar sin Firestore.
 *
 * Si cualquier tope está lleno no se incrementa ninguno: una petición
 * rechazada no debe gastar cupo de los demás contadores.
 */
export function decide(now: number, quotas: Quota[], counters: (Counter | undefined)[]): Decision {
  const writes: (Counter | null)[] = [];
  let retryAfterSeconds = 0;

  quotas.forEach((quota, i) => {
    const previous = counters[i];
    const expired = !previous || now - previous.windowStart >= quota.windowMs;
    const counter: Counter = expired ? { count: 0, windowStart: now } : previous;

    if (counter.count >= quota.max) {
      const waitMs = counter.windowStart + quota.windowMs - now;
      retryAfterSeconds = Math.max(retryAfterSeconds, Math.ceil(waitMs / 1000));
      writes.push(null);
      return;
    }
    writes.push({ count: counter.count + 1, windowStart: counter.windowStart });
  });

  if (retryAfterSeconds > 0) return { ok: false, retryAfterSeconds };
  return { ok: true, writes };
}

/**
 * Aplica los topes contra Firestore, todos en una transacción.
 *
 * Los contadores viven en Firestore y no en memoria porque App Hosting levanta
 * hasta tres instancias: un contador por proceso multiplicaría el tope por el
 * número de instancias justo cuando hay carga, que es cuando importa.
 *
 * Si Firestore falla, esto lanza y la petición no sigue. Es lo correcto: sin
 * base de datos la comanda tampoco se podría crear.
 */
export async function consume(quotas: Quota[]): Promise<Decision> {
  // Perezoso a propósito: así este módulo se puede importar sin arrastrar el
  // Admin SDK, y `decide` queda probable sin base de datos.
  const { firestore } = await import("./firebaseAdmin");
  const db = firestore();
  const refs = quotas.map((quota) => db.collection("limits").doc(quota.key));

  return db.runTransaction(async (tx) => {
    // Firestore exige todas las lecturas antes de la primera escritura.
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)));
    const decision = decide(
      Date.now(),
      quotas,
      snaps.map((snap) => snap.data() as Counter | undefined),
    );

    if (decision.ok) {
      decision.writes.forEach((counter, i) => {
        if (counter) tx.set(refs[i], counter);
      });
    }
    return decision;
  });
}

/**
 * Identifica a quien llama para poder contarle las peticiones.
 *
 * Se guarda un hash y nunca la IP: una IP es un dato personal y esto es un
 * contador, no un registro de visitas. El hash no pretende ser irreversible
 * —el espacio de IPv4 es pequeño—, sólo evita tener IPs en claro en la base.
 */
export function callerKey(request: Request): string {
  // Detrás del balanceador de Google, la IP del cliente es la primera de la lista.
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || "sin-ip";
  return `ip_${createHash("sha256").update(`divifriends:${ip}`).digest("hex").slice(0, 24)}`;
}
