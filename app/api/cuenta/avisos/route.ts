import { NextResponse } from "next/server";
import { usuarioDe } from "@/lib/cuentaServer";
import { avisosDe, marcaLeidos } from "@/lib/amigosServer";
import { fail } from "@/lib/api";

export const runtime = "nodejs";

const sinSesion = () =>
  NextResponse.json({ error: "Hay que entrar primero." }, { status: 401 });

/** La campana: los avisos, del más nuevo al más viejo. */
export async function GET(request: Request) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();
  try {
    return NextResponse.json({ avisos: await avisosDe(quien.uid) });
  } catch (error) {
    return fail(error);
  }
}

/** Abrirla es leerlos. */
export async function PATCH(request: Request) {
  const quien = await usuarioDe(request);
  if (!quien) return sinSesion();
  try {
    await marcaLeidos(quien.uid);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
