import { NextResponse } from "next/server";
import { PLANTILLAS } from "@/lib/plantillas";
import { createTicket } from "@/lib/store";
import { callerKey, consume, TOPES } from "@/lib/rateLimit";
import { bad, fail, tooMany } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

/**
 * Se lleva una copia de la cuenta de un vídeo.
 *
 * Cada visita abre **su propia mesa**, con código nuevo, y a partir de ahí es
 * una comanda como cualquier otra: se comparte, se reparte y se borra sola a
 * los treinta días. La plantilla no se toca nunca, así que el enlace del reel
 * sigue funcionando igual el día mil.
 *
 * No llama a ninguna IA —sólo escribe un documento—, así que gasta del mismo
 * cupo que una comanda escrita a mano y no toca el presupuesto de lecturas.
 * Que el tope por IP vaya holgado aquí juega a favor: un vídeo que se mueve son
 * miles de IPs distintas, no una.
 */
export async function POST(request: Request, { params }: Ctx) {
  const { slug } = await params;
  const plantilla = PLANTILLAS[slug];
  if (!plantilla) return bad("Esta cuenta no existe.", 404);

  try {
    const gate = await consume([
      { key: `manual_${callerKey(request)}`, ...TOPES.comandaManual.porIp },
    ]);
    if (!gate.ok) {
      return tooMany(
        "Se han abierto demasiadas mesas seguidas. Prueba de nuevo en un rato.",
        gate.retryAfterSeconds,
      );
    }
    const code = await createTicket({ ...plantilla.cuenta, origen: slug });
    return NextResponse.json({ code }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
