import { NextResponse } from "next/server";
import { rellenaComanda } from "@/lib/store";
import { OcrError, parseTicketImage } from "@/lib/ocr";
import { callerKey, consume, TOPES } from "@/lib/rateLimit";
import { bad, fail, ok, tooMany } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Lee la foto y llena una comanda que ya existe.
 *
 * Es la segunda mitad de crear un divi desde una foto. La primera —reservar el
 * código— va por `POST /api/tickets` con `vacia`, y tarda lo que tarda escribir
 * un documento; ésta es la que cuesta dinero y segundos, y ocurre con la
 * persona ya dentro de su mesa, repartiendo el enlace.
 *
 * El tope es el mismo que el de las otras dos puertas que llaman al modelo: el
 * gasto sigue contado en un solo sitio, pase por donde pase la foto.
 */
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type Accepted = (typeof ACCEPTED)[number];

type Ctx = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { code } = await params;

  let body: { image?: string; mediaType?: string };
  try {
    body = (await request.json()) as { image?: string; mediaType?: string };
  } catch {
    return bad("Cuerpo de la petición inválido.");
  }
  if (!body.image) return bad("Falta la foto.");

  const caller = callerKey(request);
  try {
    const gate = await consume([
      { key: caller, ...TOPES.lecturaDeTicket.porIp },
      { key: "global_lecturas", ...TOPES.lecturaDeTicket.global },
    ]);
    if (!gate.ok) {
      console.warn(`[limite] rechazada ${caller} · vuelve en ${gate.retryAfterSeconds}s`);
      return tooMany(
        "Se han leído demasiados tickets seguidos. Prueba de nuevo en un rato.",
        gate.retryAfterSeconds,
      );
    }
  } catch (error) {
    return fail(error);
  }

  const mediaType = (body.mediaType ?? "image/jpeg") as Accepted;
  if (!ACCEPTED.includes(mediaType)) {
    return bad(`Formato no soportado (${mediaType}). Usa JPG, PNG o WebP.`, 415);
  }
  const base64 = body.image.includes(",")
    ? body.image.slice(body.image.indexOf(",") + 1)
    : body.image;
  if (base64.length > 7_000_000) {
    return bad("La imagen es demasiado grande. Haz la foto con menos resolución.", 413);
  }

  try {
    const parsed = await parseTicketImage(base64, mediaType);
    if (parsed.items.length === 0) {
      return NextResponse.json(
        {
          error:
            "No he reconocido ninguna consumición en la foto. Prueba con más luz o añádelas a mano.",
          code: "unreadable",
        },
        { status: 422 },
      );
    }
    return ok(
      await rellenaComanda(code.toUpperCase(), {
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
      }),
    );
  } catch (error) {
    if (error instanceof OcrError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    return fail(error);
  }
}
