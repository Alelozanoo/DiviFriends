import { NextResponse } from "next/server";
import { urlAutorizar } from "@/lib/tiktok";
import { guardarEstado, puedePasar } from "@/lib/tiktokSesion";

export const runtime = "nodejs";

/** Manda al creador a TikTok a dar permiso. */
export async function GET(request: Request) {
  const origen = new URL(request.url).origin;
  if (!(await puedePasar())) {
    return NextResponse.redirect(new URL("/tiktok", origen));
  }
  // El `state` es contra CSRF: se guarda en cookie y se compara al volver, así
  // que un enlace de vuelta fabricado por otro no cuela.
  const estado = crypto.randomUUID();
  await guardarEstado(estado);
  return NextResponse.redirect(urlAutorizar(origen, estado));
}
