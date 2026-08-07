import { createHash } from "node:crypto";

/**
 * Topes de uso para los endpoints que cuestan dinero.
 *
 * `POST /api/tickets` con una foto llama a la API de Anthropic: cada llamada son
 * unos 3 céntimos y no hay cuentas ni sesiones, así que sin un tope cualquiera
 * puede mandar imágenes en bucle contra la tarjeta.
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

export const TOPES = {
  /** Crear una comanda desde una foto. Cada una cuesta ~3 ¢ de API. */
  lecturaDeTicket: {
    porIp: { max: 20, windowMs: HORA },
    // 300 lecturas al día son unos 9 € diarios en el peor de los casos.
    // Cuando haya uso real, éste es el número que hay que subir a conciencia.
    global: { max: 300, windowMs: DIA },
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
