import Anthropic from "@anthropic-ai/sdk";

export interface ParsedItem {
  name: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

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
          unit_price: { type: "number", description: "Precio por unidad." },
          line_total: { type: "number", description: "Importe total de la línea." },
        },
        required: ["name", "qty", "unit_price", "line_total"],
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
- Si una línea dice "2 x Cerveza 7,00", son qty 2 y line_total 7.00 (unit_price 3.50).
- Precios como números decimales en la moneda del ticket, sin símbolo: 12.50, no "12,50 €".
- NO incluyas en "items" las líneas de subtotal, IVA, servicio, propina, descuento ni total.
  Esas diferencias se deducen del campo "total".
- "total" es el importe final a pagar impreso en el ticket.
- Si un precio está borroso o cortado, estima el más probable a partir del resto del ticket
  en lugar de omitir la línea.
- Si la imagen no es un ticket de consumición, devuelve items vacío y total 0.`;

/** Lee un ticket a partir de la imagen y devuelve las líneas estructuradas. */
export async function parseTicketImage(
  base64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif",
): Promise<ParsedTicket> {
  let response: Anthropic.Message;
  try {
    // Se construye aquí dentro a propósito: sin credenciales el constructor ya
    // lanza, y queremos contarlo igual que cualquier otro fallo de la lectura.
    // No comprobamos la variable a mano porque el SDK acepta también
    // ANTHROPIC_AUTH_TOKEN y los perfiles de `ant auth login`.
    const anthropic = new Anthropic();

    response = await anthropic.messages.create({
      model: "claude-opus-5",
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

  const parsed = JSON.parse(text.text) as ParsedTicket;
  return normalize(parsed);
}

/** Rellena huecos previsibles del OCR para que el reparto cuadre desde el minuto uno. */
function normalize(parsed: ParsedTicket): ParsedTicket {
  const items = (parsed.items ?? [])
    .map((raw) => {
      const qty = Number.isFinite(raw.qty) && raw.qty > 0 ? raw.qty : 1;
      let lineTotal = Number.isFinite(raw.line_total) ? raw.line_total : 0;
      let unitPrice = Number.isFinite(raw.unit_price) ? raw.unit_price : 0;
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
