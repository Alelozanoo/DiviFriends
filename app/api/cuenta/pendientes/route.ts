import { NextResponse } from "next/server";
import { usuarioDe } from "@/lib/cuentaServer";
import { pendientesDe } from "@/lib/amigosServer";
import { fail } from "@/lib/api";

export const runtime = "nodejs";

/**
 * Lo que tienes sin ver: cuántas solicitudes te toca aceptar y en qué mesas te
 * han metido sin que las hayas abierto. La portada lo pide una vez al entrar y
 * la hoja de la cuenta cada vez que se abre; es lo que pinta el «+1».
 */
export async function GET(request: Request) {
  const quien = await usuarioDe(request);
  if (!quien)
    return NextResponse.json(
      { error: "Hay que entrar primero." },
      { status: 401 },
    );
  try {
    return NextResponse.json(await pendientesDe(quien.uid));
  } catch (error) {
    return fail(error);
  }
}
