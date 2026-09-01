import { NextResponse } from "next/server";
import { bad } from "@/lib/api";
import {
  estadoPublicacion, infoCreador, publicar, refrescar, TikTokError,
} from "@/lib/tiktok";
import { guardarSesion, tokenActual, tokenRefresco } from "@/lib/tiktokSesion";

export const runtime = "nodejs";
// El vídeo viaja entero en la petición, así que el tope por defecto no llega.
export const maxDuration = 300;

/** Un token vivo, refrescándolo si el de acceso ya caducó. */
async function token() {
  const acceso = await tokenActual();
  if (acceso) return acceso;
  const refresco = await tokenRefresco();
  if (!refresco) return "";
  const t = await refrescar(refresco);
  await guardarSesion(t.access_token, t.refresh_token, t.expires_in);
  return t.access_token;
}

/** Quién es el creador y qué le permite su cuenta. */
export async function GET() {
  const t = await token();
  if (!t) return NextResponse.json({ conectado: false });
  try {
    return NextResponse.json({ conectado: true, creador: await infoCreador(t) });
  } catch (err) {
    if (err instanceof TikTokError) return NextResponse.json({ conectado: false, aviso: err.message });
    throw err;
  }
}

export async function POST(request: Request) {
  const t = await token();
  if (!t) return bad("No hay ninguna cuenta de TikTok conectada", 401);

  const form = await request.formData();
  const video = form.get("video");
  if (!(video instanceof File)) return bad("Falta el vídeo");
  if (video.size > 64 * 1024 * 1024) return bad("El vídeo pasa de 64 MB");

  const privacidad = String(form.get("privacidad") || "");
  if (!privacidad) return bad("Elige quién puede verlo");

  // La privacidad se comprueba contra lo que la cuenta permite AHORA, no
  // contra lo que el navegador diga: los ajustes pueden haber cambiado desde
  // que se pintó el formulario.
  try {
    const creador = await infoCreador(t);
    if (!creador.privacidades.includes(privacidad)) {
      return bad("Esa privacidad ya no está disponible en tu cuenta");
    }

    const publishId = await publicar(t, await video.arrayBuffer(), {
      titulo: String(form.get("titulo") || ""),
      privacidad,
      comentarios: form.get("comentarios") === "1" && !creador.comentarioBloqueado,
      duetos: form.get("duetos") === "1" && !creador.duetoBloqueado,
      stitches: form.get("stitches") === "1" && !creador.stitchBloqueado,
      esComercial: form.get("comercial") === "1",
      marcaPropia: form.get("marcaPropia") === "1",
    });
    return NextResponse.json({ publishId });
  } catch (err) {
    if (err instanceof TikTokError) return bad(err.message, 502);
    throw err;
  }
}

/** El estado de una publicación en marcha. */
export async function PATCH(request: Request) {
  const t = await token();
  if (!t) return bad("No hay ninguna cuenta conectada", 401);
  const { publishId } = await request.json();
  if (!publishId) return bad("Falta el identificador de la publicación");
  try {
    return NextResponse.json(await estadoPublicacion(t, publishId));
  } catch (err) {
    if (err instanceof TikTokError) return bad(err.message, 502);
    throw err;
  }
}
