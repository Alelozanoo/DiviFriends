import { NextResponse } from "next/server";
import { perfilPublico, uidDeCodigoOUsuario } from "@/lib/amigosServer";
import { fail, puerta } from "@/lib/api";
import { callerKey, TOPES } from "@/lib/rateLimit";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ codigo: string }> };

/**
 * Quién hay detrás de un enlace de amigo: nombre y cara, nada más.
 *
 * Es pública porque la abre quien todavía no ha entrado, para saber a quién
 * está a punto de aceptar. Por eso no devuelve el correo ni el `uid`: lo que
 * hace falta para pedir la amistad es el propio código, que ya se tiene.
 */
export async function GET(request: Request, { params }: Ctx) {
  const { codigo } = await params;
  if (codigo.length > 40)
    return NextResponse.json(
      { error: "Ese enlace no es de nadie." },
      { status: 404 },
    );
  const alto = await puerta(
    [{ key: `amigo_busca_${callerKey(request)}`, ...TOPES.cuenta.busca }],
    "Demasiados enlaces seguidos. Prueba en un rato.",
  );
  if (alto) return alto;
  try {
    let limpio = codigo;
    try {
      limpio = decodeURIComponent(codigo);
    } catch {
      return NextResponse.json(
        { error: "Ese enlace no es de nadie." },
        { status: 404 },
      );
    }
    const uid = await uidDeCodigoOUsuario(limpio);
    const perfil = uid ? await perfilPublico(uid) : null;
    if (!perfil)
      return NextResponse.json(
        { error: "Ese enlace no es de nadie." },
        { status: 404 },
      );
    return NextResponse.json({
      nombre: perfil.nombre,
      avatar: perfil.avatar ?? null,
      usuario: perfil.usuario,
    });
  } catch (error) {
    return fail(error);
  }
}
