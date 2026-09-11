import { NextResponse } from "next/server";
import { fail, puerta } from "@/lib/api";
import { creaDemo } from "@/lib/demo";
import { callerKey, TOPES } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * «Quiero probar»: una mesa de ejemplo, recién hecha para quien la pide.
 *
 * Una por persona y no una compartida por todos. Con una sola, dos curiosos a
 * la vez se quitarían las croquetas el uno al otro y lo que verían es una app
 * que se mueve sola; además, el primero que le diera a «cerrar la mesa» la
 * dejaría inservible para el resto. Cuesta una escritura de Firestore y ni un
 * céntimo de lector, porque los platos ya vienen escritos.
 *
 * Con el mismo tope por IP que crear una comanda a mano, que es lo que es: no
 * llama a ningún modelo, sólo escribe un documento.
 */
export async function POST(request: Request) {
  const alto = await puerta(
    [{ key: `manual_${callerKey(request)}`, ...TOPES.comandaManual.porIp }],
    "Se han creado demasiadas mesas seguidas. Prueba de nuevo en un rato.",
  );
  if (alto) return alto;

  try {
    return NextResponse.json({ code: await creaDemo() }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
