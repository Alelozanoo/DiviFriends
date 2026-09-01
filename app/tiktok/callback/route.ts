import { NextResponse } from "next/server";
import { canjearCodigo, TikTokError } from "@/lib/tiktok";
import { estadoGuardado, guardarSesion } from "@/lib/tiktokSesion";

export const runtime = "nodejs";

/** La vuelta de TikTok: se canjea el código por el token y se entra. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const volver = (aviso: string) =>
    NextResponse.redirect(new URL(`/tiktok?aviso=${encodeURIComponent(aviso)}`, url.origin));

  if (url.searchParams.get("error")) {
    return volver(url.searchParams.get("error_description") || "No diste permiso.");
  }

  const codigo = url.searchParams.get("code");
  const estado = url.searchParams.get("state");
  if (!codigo) return volver("TikTok no devolvió ningún código.");
  if (!estado || estado !== (await estadoGuardado())) {
    return volver("La vuelta no cuadra con la ida. Empieza otra vez.");
  }

  try {
    const t = await canjearCodigo(url.origin, codigo);
    await guardarSesion(t.access_token, t.refresh_token, t.expires_in);
  } catch (err) {
    return volver(err instanceof TikTokError ? err.message : "No pude completar la conexión.");
  }
  return NextResponse.redirect(new URL("/tiktok", url.origin));
}
