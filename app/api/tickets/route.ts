import { NextResponse } from "next/server";
import { createTicket } from "@/lib/store";
import { OcrError, parseTicketImage, type ParsedTicket } from "@/lib/ocr";
import { parseMoney } from "@/lib/format";
import { bad, fail } from "@/lib/api";

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

  let parsed: ParsedTicket;

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
