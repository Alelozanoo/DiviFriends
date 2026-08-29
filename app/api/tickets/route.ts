import { NextResponse } from "next/server";
import { createTicket } from "@/lib/store";
import { OcrError, parseTicketImage, type ParsedTicket } from "@/lib/ocr";
import { parseMoney } from "@/lib/format";
import { callerKey, consume, TOPES } from "@/lib/rateLimit";
import { bad, fail, tooMany } from "@/lib/api";

export const runtime = "nodejs";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type Accepted = (typeof ACCEPTED)[number];

interface ManualItem {
  name: string;
  qty?: number;
  unitPrice?: string | number;
  lineTotal?: string | number;
}

interface CreateBody {
  /** Crear la mesa ya, sin nada dentro: la foto se lee después, desde dentro. */
  vacia?: boolean;
  image?: string;
  mediaType?: string;
  place?: string;
  tableLabel?: string;
  currency?: string;
  total?: string | number;
  items?: ManualItem[];
}

export async function POST(request: Request) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return bad("Cuerpo de la petición inválido.");
  }

  /*
    Una mesa vacía, para entrar ya.

    No llama a ninguna IA —sólo escribe un documento— así que gasta del mismo
    cupo que una comanda escrita a mano. Lo que viene después, la lectura de la
    foto, tiene su propio tope en `/lectura`, que es donde está el gasto.
  */
  if (body.vacia) {
    const caller = callerKey(request);
    try {
      const gate = await consume([{ key: `manual_${caller}`, ...TOPES.comandaManual.porIp }]);
      if (!gate.ok) {
        return tooMany(
          "Se han creado demasiadas comandas seguidas. Prueba de nuevo en un rato.",
          gate.retryAfterSeconds,
        );
      }
      const code = await createTicket({
        place: null,
        tableLabel: null,
        currency: "EUR",
        totalCents: 0,
        items: [],
      });
      return NextResponse.json({ code }, { status: 201 });
    } catch (error) {
      return fail(error);
    }
  }

  let parsed: ParsedTicket;

  // El tope se comprueba antes de tocar nada: leer una foto cuesta dinero de
  // verdad, y este endpoint no pide credenciales a nadie.
  const caller = callerKey(request);
  const quotas = body.image
    ? [
        { key: caller, ...TOPES.lecturaDeTicket.porIp },
        { key: "global_lecturas", ...TOPES.lecturaDeTicket.global },
      ]
    : [{ key: `manual_${caller}`, ...TOPES.comandaManual.porIp }];

  try {
    const gate = await consume(quotas);
    if (!gate.ok) {
      console.warn(`[limite] rechazada ${caller} · vuelve en ${gate.retryAfterSeconds}s`);
      return tooMany(
        "Se han creado demasiadas comandas seguidas. Prueba de nuevo en un rato.",
        gate.retryAfterSeconds,
      );
    }
  } catch (error) {
    return fail(error);
  }

  if (body.image) {
    const mediaType = (body.mediaType ?? "image/jpeg") as Accepted;
    if (!ACCEPTED.includes(mediaType)) {
      return bad(`Formato no soportado (${mediaType}). Usa JPG, PNG o WebP.`, 415);
    }
    // Aceptamos tanto data URI como base64 pelado.
    const base64 = body.image.includes(",") ? body.image.slice(body.image.indexOf(",") + 1) : body.image;
    if (base64.length > 7_000_000) {
      return bad("La imagen es demasiado grande. Haz la foto con menos resolución.", 413);
    }
    try {
      parsed = await parseTicketImage(base64, mediaType);
    } catch (error) {
      if (error instanceof OcrError) {
        return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
      }
      throw error;
    }
    if (parsed.items.length === 0) {
      return NextResponse.json(
        {
          error: "No he reconocido ninguna consumición en la foto. Prueba con más luz o añádelas a mano.",
          code: "unreadable",
        },
        { status: 422 },
      );
    }
  } else {
    const items = (body.items ?? [])
      .map((raw) => {
        const qty = Number(raw.qty) > 0 ? Number(raw.qty) : 1;
        const lineTotal = parseMoney(raw.lineTotal ?? null) / 100;
        const unitPrice = parseMoney(raw.unitPrice ?? null) / 100;
        return {
          name: (raw.name ?? "").trim(),
          qty,
          unit_price: unitPrice || (lineTotal ? lineTotal / qty : 0),
          line_total: lineTotal || unitPrice * qty,
        };
      })
      .filter((i) => i.name.length > 0);

    if (items.length === 0) return bad("Añade al menos una consumición.");

    const declaredTotal = parseMoney(body.total ?? null) / 100;
    parsed = {
      place: body.place?.trim() || null,
      table_label: body.tableLabel?.trim() || null,
      currency: body.currency ?? "EUR",
      items,
      total: declaredTotal || items.reduce((a, i) => a + i.line_total, 0),
    };
  }

  try {
    const code = await createTicket({
      place: parsed.place,
      tableLabel: parsed.table_label,
      currency: parsed.currency,
      totalCents: Math.round(parsed.total * 100),
      items: parsed.items.map((item) => ({
        name: item.name,
        qty: item.qty,
        unitCents: Math.round(item.unit_price * 100),
        totalCents: Math.round(item.line_total * 100),
      })),
    });
    return NextResponse.json({ code }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
