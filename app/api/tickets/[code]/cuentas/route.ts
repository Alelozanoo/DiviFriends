import { NextResponse } from "next/server";
import { usuarioDe } from "@/lib/cuentaServer";
import { cuentasPublicasDeLaMesa } from "@/lib/amigosServer";
import { fail } from "@/lib/api";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ code: string }> };

/**
 * Quién de esta mesa tiene cuenta: asiento → nombre, cara y usuario.
 *
 * Lo pide la hoja de la mesa para que, al tocar a alguien en «Quién está», su
 * ficha diga su @usuario y ofrezca añadirle como amigo. Sólo con sesión: sin
 * cuenta no hay amigos que pedir, y no hace falta contarle a un mirón quién
 * de la mesa está registrado.
 */
export async function GET(request: Request, { params }: Ctx) {
  const quien = await usuarioDe(request);
  if (!quien)
    return NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });
  const { code } = await params;
  try {
    return NextResponse.json({ cuentas: await cuentasPublicasDeLaMesa(code.toUpperCase()) });
  } catch (error) {
    return fail(error);
  }
}
