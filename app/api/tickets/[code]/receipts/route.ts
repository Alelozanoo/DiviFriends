import { NextResponse } from "next/server";
import { addReceipt } from "@/lib/store";
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
  image?: string;
  mediaType?: string;
  label?: string; // Optional label for the receipt
  place?: string;
  tableLabel?: string;
  currency?: string;
  total?: string | number;
  items?: ManualItem[];
}

type Ctx = { params: Promise<{ code: string }> };

export async function POST(
  request: Request,
  { params }: Ctx,
) {
  const { code } = await params;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return bad("Cuerpo de la petición inválido.");
  }

  let parsed: ParsedTicket;

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
    const state = await addReceipt(code, {
      label: body.label || parsed.place || "Ticket",
      totalCents: Math.round(parsed.total * 100),
      items: parsed.items.map((item) => ({
        name: item.name,
        qty: item.qty,
        unitCents: Math.round(item.unit_price * 100),
        totalCents: Math.round(item.line_total * 100),
      })),
    });
    return NextResponse.json(state, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
