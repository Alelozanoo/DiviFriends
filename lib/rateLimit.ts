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
 *   - Gemini 3.5 Flash Lite sin pensamiento (2026-08-29): ~1230 de entrada,
 *     137 de salida y 107 de pensamiento. Se deja en 0,0018 $, que es lo que
 *     costaba el modelo anterior —más caro— porque la tarifa de este todavía no
 *     está comprobada contra la web de Google. Pasarse por arriba sólo aprieta
 *     el tope de abajo; quedarse corto sería un susto en la factura.
 *   - Opus 5 con effort medium (2026-08-07): 0,0296 $.
 *
 * Cambiar de modelo o de resolución cambia este número, y con él se mueve solo
 * el tope de abajo, que es justo lo que se quiere: el freno lo pone el dinero,
 * no un número inventado.
 */
const GEMINI = process.env.OCR_MODELO?.trim().toLowerCase() !== "anthropic";

export const COSTE_POR_LECTURA = GEMINI ? 0.0018 : 0.0296;

/**
 * Cómo se llama el modelo que lee, para poder decirlo en las métricas sin
 * arrastrar hasta la página los SDK de los dos proveedores. Espejo de `TARIFAS`
 * en `lib/ocr.ts`: si allí se cambia de modelo, aquí también.
 */
export const MODELO_LECTOR = GEMINI ? "Gemini 3.5 Flash Lite" : "Opus 5";

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

/**
 * El tope de todo lo demás: por IP y por minuto.
 *
 * Marcar un plato o abrir una comanda no llama a ninguna IA, así que hasta
 * ahora no tenía freno ninguno. Pero cada petición es una lectura o una
 * escritura de Firestore, y eso se paga: sin tope, pedir la misma comanda en
 * bucle es una factura que firmas tú sin haber pasado nada malo. De paso es lo
 * que hace inviable ir probando códigos de seis letras a ver cuál existe.
 *
 * Va holgado por lo mismo que el tope por IP de las lecturas: en el wifi de un
 * bar la mesa entera comparte una IP pública, y un móvil que se ha quedado sin
 * escucha en vivo pregunta cada tres segundos. Ocho comensales así son 160
 * peticiones por minuto, y eso tiene que caber sin rozar el tope.
 */
export const TOPE_API = { max: 300, windowMs: MINUTO };

/**
 * Los contadores de este tope viven en memoria, al revés que los de arriba.
 *
 * Es deliberado: apuntar en Firestore un contador por petición costaría una
 * lectura y una escritura para ahorrarse una lectura, o sea que el remedio
 * saldría más caro que la enfermedad. App Hosting levanta hasta tres
 * instancias, así que el tope real puede ser el triple del que pone aquí —para
 * frenar un abuso da igual, y a cambio no cuesta nada—. El tope que sí tiene
 * que ser exacto, el del dinero de la IA, sigue en Firestore.
 */
const memoria = new Map<string, Counter>();

/** Descuenta una petición del tope general. No toca la base de datos. */
export function consumeEnMemoria(clave: string, now = Date.now()): Decision {
  podar(now);
  const decision = decide(now, [{ key: clave, ...TOPE_API }], [memoria.get(clave)]);
  if (decision.ok && decision.writes[0]) memoria.set(clave, decision.writes[0]);
  return decision;
}

/**
 * Tira los contadores caducados cuando el mapa se hace grande.
 *
 * Sin esto, una instancia que lleva días en pie acaba guardando una entrada por
 * cada IP que ha pasado por aquí. Se hace sólo al pasar de cierto tamaño para
 * no recorrer el mapa entero en cada petición.
 */
function podar(now: number): void {
  if (memoria.size < 5_000) return;
  for (const [clave, contador] of memoria) {
    if (now - contador.windowStart >= TOPE_API.windowMs) memoria.delete(clave);
  }
}

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
 * Cuántas lecturas lleva la ventana global en curso.
 *
 * Es el único número exacto que hay del gasto: cuenta cada foto que se mandó a
 * leer, incluidas las que el modelo no supo entender —que se pagan igual y no
 * dejan comanda que contar—. Lo que se deduce de las comandas guardadas es una
 * aproximación; esto es el marcador.
 *
 * Vive aquí y no en la página de métricas porque el significado del contador
 * —cuándo empieza la ventana y cuándo caduca— es de este módulo: leerlo por
 * fuera obligaría a repetir la aritmética y a que algún día dejaran de
 * coincidir. Sólo lee: mirar el marcador no gasta cupo.
 */
export async function lecturasDelDia(now = Date.now()): Promise<{
  hechas: number;
  tope: number;
  /** Cuándo arrancó la ventana. `null` si no hay ninguna viva. */
  desde: string | null;
}> {
  const { firestore } = await import("./firebaseAdmin");
  const snap = await firestore().collection("limits").doc("global_lecturas").get();
  const counter = snap.data() as Counter | undefined;
  const { max, windowMs } = TOPES.lecturaDeTicket.global;
  // Una ventana caducada es una ventana a cero: la reabre la próxima lectura.
  if (!counter || now - counter.windowStart >= windowMs) {
    return { hechas: 0, tope: max, desde: null };
  }
  return { hechas: counter.count, tope: max, desde: new Date(counter.windowStart).toISOString() };
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
