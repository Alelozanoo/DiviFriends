import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, ApiError } from "@google/genai";

export interface ParsedItem {
  name: string;
  qty: number;
  /** Sale de dividir: al modelo ya no se le pide (ver `Leido`). */
  unit_price: number;
  line_total: number;
}

/**
 * Lo que contesta el modelo, que no es lo mismo que lo que usa la app.
 *
 * Se le dejó de pedir el precio por unidad el 29 de agosto de 2026: es
 * `line_total` entre `qty`, o sea que lo sabemos sin preguntar, y era un campo
 * por línea que había que escribir uno a uno. En un ticket de nueve líneas son
 * 516 tokens de salida frente a 400, y la salida se genera de uno en uno: ahí
 * es donde se va el tiempo de espera, no en leer la foto.
 */
type Leido = Omit<ParsedTicket, "items"> & {
  items: (Omit<ParsedItem, "unit_price"> & { unit_price?: number })[];
};

export interface ParsedTicket {
  place: string | null;
  table_label: string | null;
  currency: string;
  items: ParsedItem[];
  total: number;
}

export class OcrError extends Error {
  constructor(
    message: string,
    readonly code: "no_api_key" | "refused" | "unreadable" | "api_error",
  ) {
    super(message);
  }
}

export type MediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

const SCHEMA = {
  type: "object",
  properties: {
    place: {
      type: ["string", "null"],
      description: "Nombre del bar o restaurante tal cual aparece. null si no se ve.",
    },
    table_label: {
      type: ["string", "null"],
      description: "Mesa o número de comanda, p. ej. 'Mesa 12'. null si no aparece.",
    },
    currency: {
      type: "string",
      description: "Código ISO 4217, p. ej. EUR, USD, MXN. Usa EUR si no está claro.",
    },
    items: {
      type: "array",
      description: "Una entrada por línea de consumición del ticket, en el mismo orden.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre del plato o bebida." },
          qty: { type: "number", description: "Unidades de esa línea. 1 si no se indica." },
          line_total: { type: "number", description: "Importe total de la línea." },
        },
        required: ["name", "qty", "line_total"],
        additionalProperties: false,
      },
    },
    total: {
      type: "number",
      description: "Total a pagar impreso en el ticket, con impuestos y servicio incluidos.",
    },
  },
  required: ["place", "table_label", "currency", "items", "total"],
  additionalProperties: false,
} as const;

const PROMPT = `Extrae el contenido de este ticket de bar o restaurante.

Reglas:
- Una entrada de "items" por cada línea de consumición, en el mismo orden que el ticket.
- Si una línea dice "2 x Cerveza 7,00", son qty 2 y line_total 7.00.
- Precios como números decimales en la moneda del ticket, sin símbolo: 12.50, no "12,50 €".
- NO incluyas en "items" las líneas de subtotal, IVA, servicio, propina, descuento ni total.
  Esas diferencias se deducen del campo "total".
- "total" es el importe final a pagar impreso en el ticket.
- Si un precio está borroso o cortado, estima el más probable a partir del resto del ticket
  en lugar de omitir la línea.
- Si la imagen no es un ticket de consumición, devuelve items vacío y total 0.`;

/* ------------------------------------------------------------------ modelos */

/**
 * Qué modelo lee los tickets.
 *
 * Se elige con `OCR_MODELO` para poder cambiarlo sin tocar el código: la
 * lectura es la **única variable que crece con los usuarios**, así que conviene
 * poder probar otro modelo y volverse atrás en un despliegue.
 *
 * - `gemini`   → Gemini 3.7 Flash (por defecto desde el 20 de agosto de 2026)
 * - `anthropic` → Claude Opus 5, que es lo que había antes
 */
type Proveedor = "gemini" | "anthropic";

function proveedor(): Proveedor {
  return process.env.OCR_MODELO?.trim().toLowerCase() === "anthropic" ? "anthropic" : "gemini";
}

/**
 * Tarifas en dólares por millón de tokens.
 *
 * **El modelo se cambió el 27 de agosto de 2026, y el motivo importa.** Aquí
 * ponía `gemini-3.7-flash`, que ni siquiera aparece en el catálogo de la cuenta
 * (`models.list()`) pero que la API acepta igual: contestaba, y contestaba
 * bien, a un token por segundo. Medido contra producción tres veces seguidas:
 * 104, 111 y 133 segundos por ticket, con la barra de progreso clavada en el
 * 95 % — o sea, roto para cualquiera que esté de pie en un bar. Y sin ruido en
 * los logs, porque un número alto entre miles de líneas no lo mira nadie.
 *
 * Ahora lee `gemini-3.5-flash-lite`, y la palabra que importa es **lite**.
 *
 * Medido el 29 de agosto de 2026 con el mismo ticket difícil —nueve líneas,
 * cantidades, descuento, IVA y un total distinto del subtotal—, y otra vez con
 * una copia cutre a 900 px y calidad 18, peor que nada que salga de un móvil:
 *
 *   - 3.5-flash-lite  3,3 s · 4 de 4 perfectas con la foto mala
 *   - 3.1-flash-lite  3,1 s · 4 de 4   (lo que había antes; empatan)
 *   - 3.5-flash       4,6 s · 2 de 4   (se inventó una «COCO-COLA», dos veces)
 *   - 3.6-flash       4,6 s · 4 de 4
 *   - 3.7-flash       9,0 s
 *
 * O sea que el Flash grande no es más rápido ni más fino, y es la intuición
 * que todo el mundo tiene. El motivo es que esto no es un problema, es una
 * transcripción: no hay nada que razonar, hay que copiar nueve líneas. Los
 * modelos grandes están hechos para pensar, y aquí pensar sólo añade tokens que
 * se escriben de uno en uno.
 *
 * Si algún día hay que volver a elegir: prueba la familia *lite* primero, mide
 * con una foto mala y no te fíes del número de versión.
 *
 * **Estos dos números son un techo, no la tarifa publicada de este modelo.**
 * Son los del modelo anterior, que era más caro: se dejan a propósito hasta
 * comprobar el precio real en la web de Google, porque equivocarse por arriba
 * sólo hace que el log exagere y que el tope diario de `lib/rateLimit.ts` corte
 * antes de tiempo. Al revés sería una factura sorpresa.
 */
const TARIFAS = {
  gemini: { modelo: "gemini-3.5-flash-lite", entrada: 0.38, salida: 1.88 },
  anthropic: { modelo: "claude-opus-5", entrada: 5, salida: 25 },
} as const;

/**
 * A partir de aquí, una lectura va mal aunque acabe saliendo bien.
 *
 * Con el modelo puesto son 3-4 segundos y con Opus 6, así que treinta es siete
 * veces el tiempo normal: si se pasa, no es la foto ni la cobertura, es que el
 * modelo está degradado. Se corta y se le dice a la persona que la escriba a
 * mano, que es infinitamente mejor que dejarla dos minutos mirando una barra.
 *
 * El dinero de esa lectura ya está gastado —la petición sigue viva al otro
 * lado— y se asume: perder dos céntimos es mejor que perder al comensal.
 */
const LENTA_MS = 30_000;

/** Lo que cuesta y lo que tarda una lectura, para poder comparar modelos. */
interface Lectura {
  json: string;
  entrada: number;
  salida: number;
  /** Tokens de razonamiento. Sólo Gemini los separa; se cobran como salida. */
  pensamiento: number;
  /** Lo que dice el proveedor que suman todos. Sirve para ver si `pensamiento` ya iba dentro. */
  totalDeclarado: number;
}

/* ------------------------------------------------------------------- lectura */

/** Lee un ticket a partir de la imagen y devuelve las líneas estructuradas. */
export async function parseTicketImage(
  base64: string,
  mediaType: MediaType,
): Promise<ParsedTicket> {
  const cual = proveedor();
  const arranque = Date.now();

  const lectura = await conPrisa(
    cual === "gemini" ? leeConGemini(base64, mediaType) : leeConClaude(base64, mediaType),
  );

  registra(cual, lectura, Date.now() - arranque);

  let parsed: Leido;
  try {
    parsed = JSON.parse(lectura.json) as Leido;
  } catch {
    throw new OcrError("No se ha podido leer el ticket.", "unreadable");
  }
  return normalize(parsed);
}

/**
 * Le pone reloj a la lectura. Si tarda más de la cuenta, se abandona.
 *
 * No se cancela la petición al proveedor: el SDK no siempre lo permite y el
 * gasto ya está hecho de todas formas. Lo que se corta es la espera de quien
 * está delante del móvil.
 */
function conPrisa(lectura: Promise<Lectura>): Promise<Lectura> {
  return Promise.race([
    lectura,
    new Promise<never>((_, rechaza) =>
      setTimeout(
        () =>
          rechaza(
            new OcrError(
              "La lectura está tardando demasiado. Prueba otra vez o escribe la comanda a mano.",
              "api_error",
            ),
          ),
        LENTA_MS,
      ),
    ),
  ]);
}

/* ------------------------------------------------------------------- Gemini */

async function leeConGemini(base64: string, mediaType: MediaType): Promise<Lectura> {
  try {
    // Igual que con Anthropic: se construye aquí dentro para que la falta de
    // credenciales se cuente como un fallo más de la lectura. El SDK coge la
    // clave de GEMINI_API_KEY o de GOOGLE_API_KEY él solo.
    const google = new GoogleGenAI({});

    const interaction = await google.interactions.create({
      model: TARIFAS.gemini.modelo,
      input: [
        { type: "image", data: base64, mime_type: mediaType },
        { type: "text", text: PROMPT },
      ],
      response_format: { type: "text", mime_type: "application/json", schema: SCHEMA },
      /*
        Un ticket es una transcripción, no un problema: pensar de más aquí sólo
        añade segundos y tokens de razonamiento, que se cobran como salida.

        `minimal` en vez de `low` desde el 29 de agosto de 2026: son cero tokens
        de pensamiento en vez de un centenar, y las nueve líneas del ticket de
        prueba —con su descuento, su IVA y un total distinto del subtotal—
        siguen saliendo bien en las tres vueltas. `none` y `off` no existen: la
        API los rechaza.
      */
      generation_config: { thinking_level: "minimal" },
    });

    const json = interaction.output_text;
    if (!json) throw new OcrError("No se ha podido leer el ticket.", "unreadable");

    const uso = interaction.usage;
    return {
      json,
      entrada: uso?.total_input_tokens ?? 0,
      salida: uso?.total_output_tokens ?? 0,
      pensamiento: uso?.total_thought_tokens ?? 0,
      totalDeclarado: uso?.total_tokens ?? 0,
    };
  } catch (error) {
    if (error instanceof OcrError) throw error;
    const message = error instanceof Error ? error.message : "Error desconocido";
    const estado = error instanceof ApiError ? error.status : 0;

    if (estado === 401 || estado === 403 || /API key|GEMINI_API_KEY|GOOGLE_API_KEY/i.test(message)) {
      throw new OcrError(
        "El servidor no tiene configurada la clave de Gemini (GEMINI_API_KEY), así que no puedo leer la foto. Puedes escribir la comanda a mano.",
        "no_api_key",
      );
    }
    if (estado === 429) {
      throw new OcrError("Demasiadas peticiones ahora mismo. Prueba en unos segundos.", "api_error");
    }
    throw new OcrError(`La lectura del ticket falló: ${message}`, "api_error");
  }
}

/* ------------------------------------------------------------------- Claude */

async function leeConClaude(base64: string, mediaType: MediaType): Promise<Lectura> {
  let response: Anthropic.Message;
  try {
    // Se construye aquí dentro a propósito: sin credenciales el constructor ya
    // lanza, y queremos contarlo igual que cualquier otro fallo de la lectura.
    // No comprobamos la variable a mano porque el SDK acepta también
    // ANTHROPIC_AUTH_TOKEN y los perfiles de `ant auth login`.
    const anthropic = new Anthropic();

    response = await anthropic.messages.create({
      model: TARIFAS.anthropic.modelo,
      max_tokens: 16000,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: SCHEMA },
      },
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const missingKey =
      error instanceof Anthropic.AuthenticationError ||
      error instanceof Anthropic.PermissionDeniedError ||
      /ANTHROPIC_API_KEY|apiKey/i.test(message); // el constructor sin credenciales
    if (missingKey) {
      throw new OcrError(
        "El servidor no tiene configurada la clave de Anthropic (ANTHROPIC_API_KEY), así que no puedo leer la foto. Puedes escribir la comanda a mano.",
        "no_api_key",
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new OcrError("Demasiadas peticiones ahora mismo. Prueba en unos segundos.", "api_error");
    }
    throw new OcrError(`La lectura del ticket falló: ${message}`, "api_error");
  }

  if (response.stop_reason === "refusal") {
    throw new OcrError("No se ha podido procesar esta imagen.", "refused");
  }

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    throw new OcrError("No se ha podido leer el ticket.", "unreadable");
  }

  const uso = response.usage;
  return {
    json: text.text,
    entrada: uso.input_tokens + (uso.cache_creation_input_tokens ?? 0),
    salida: uso.output_tokens,
    pensamiento: 0,
    totalDeclarado: 0,
  };
}

/* ------------------------------------------------------------------- limpieza */

/** Rellena huecos previsibles del OCR para que el reparto cuadre desde el minuto uno. */
function normalize(parsed: Leido): ParsedTicket {
  const items = (parsed.items ?? [])
    .map((raw) => {
      const qty = Number.isFinite(raw.qty) && raw.qty > 0 ? raw.qty : 1;
      let lineTotal = Number.isFinite(raw.line_total) ? raw.line_total : 0;
      // El modelo ya no manda el precio por unidad, pero una comanda vieja
      // reprocesada o el propio Claude podrían traerlo: si viene, se respeta;
      // si no, sale de dividir, que es de donde salía igualmente.
      let unitPrice =
        typeof raw.unit_price === "number" && Number.isFinite(raw.unit_price) ? raw.unit_price : 0;
      if (lineTotal === 0 && unitPrice > 0) lineTotal = unitPrice * qty;
      if (unitPrice === 0 && lineTotal > 0) unitPrice = lineTotal / qty;
      return { name: (raw.name ?? "").trim() || "Sin nombre", qty, unit_price: unitPrice, line_total: lineTotal };
    })
    .filter((i) => i.line_total !== 0 || i.name !== "Sin nombre");

  const sumLines = items.reduce((a, i) => a + i.line_total, 0);
  // Un total ausente o incoherente rompería todo el reparto: cae a la suma de líneas.
  const total =
    Number.isFinite(parsed.total) && parsed.total > 0 ? parsed.total : Math.round(sumLines * 100) / 100;

  return {
    place: parsed.place?.trim() || null,
    table_label: parsed.table_label?.trim() || null,
    currency: /^[A-Z]{3}$/.test(parsed.currency ?? "") ? parsed.currency : "EUR",
    items,
    total,
  };
}

/* ---------------------------------------------------------------------- coste */

/**
 * Cada ticket leído cuesta dinero y tiempo, así que conviene verlo en los logs
 * desde el primer día: es la única variable que crece con los usuarios.
 *
 * Sale también el modelo y los milisegundos porque el motivo de tener dos
 * proveedores es justamente compararlos: sin el nombre al lado, dos números
 * en el log no dicen de quién son.
 *
 * Los tokens de razonamiento se cobran como salida y van **aparte** de
 * `total_output_tokens`: comprobado con una lectura real —1291 de entrada, 285
 * de salida y 391 de pensamiento, que suman exactamente los 1967 del total que
 * declara Google—, así que sumarlos aquí es lo correcto y no los cuenta dos
 * veces. Se siguen imprimiendo los tres por si eso cambia.
 */
function registra(cual: Proveedor, l: Lectura, ms: number): void {
  const tarifa = TARIFAS[cual];
  const dolares =
    (l.entrada * tarifa.entrada + (l.salida + l.pensamiento) * tarifa.salida) / 1_000_000;

  const desglose = l.pensamiento ? ` · pensamiento ${l.pensamiento}` : "";
  const declarado = l.totalDeclarado ? ` · total ${l.totalDeclarado}` : "";
  console.info(
    `[ocr] ${tarifa.modelo} · ${(ms / 1000).toFixed(1)} s · entrada ${l.entrada} · salida ${l.salida}` +
      `${desglose}${declarado} · ≈ ${(dolares * 100).toFixed(2)} ¢`,
  );

  /*
    Y un grito si ha ido lenta.

    Entre el 20 y el 27 de agosto de 2026 cada ticket tardó más de un minuto y
    medio y nadie se enteró: el dato estaba en la línea de arriba, pero como una
    cifra más. Un `warn` con la palabra LENTA se busca en los logs en dos
    segundos y sale en cualquier alerta que se monte encima.
  */
  if (ms > LENTA_MS / 2) {
    console.warn(
      `[ocr] LENTA · ${(ms / 1000).toFixed(1)} s con ${tarifa.modelo}. Lo normal son 3-6 s: ` +
        `comprueba si ese modelo sigue sirviéndose bien antes de que la gente lo note.`,
    );
  }
}
