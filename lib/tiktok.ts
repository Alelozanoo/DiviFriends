/**
 * Publicar en TikTok desde la web, con la Content Posting API.
 *
 * Existe por dos razones y conviene tenerlas claras:
 *
 * 1. **La auditoría.** TikTok no deja publicar en público hasta que revisa la
 *    integración, y para revisarla pide un vídeo donde se vea el flujo entero
 *    en el dominio declarado. `localhost` no vale, así que la pantalla de
 *    publicar vive aquí y no en el panel de casa.
 * 2. **El consentimiento.** Sus normas exigen enseñar al creador en qué cuenta
 *    va a publicar, qué niveles de privacidad tiene disponibles y si admite
 *    comentarios, dúos y stitches — y dejarle elegir. Eso lo dice
 *    `creator_info/query`, y por eso se consulta siempre antes de publicar.
 *
 * El vídeo se manda por `FILE_UPLOAD` a propósito. La otra vía, `PULL_FROM_URL`,
 * obliga a verificar la propiedad del dominio donde vive el archivo, y los
 * medios están en Backblaze, que no es nuestro.
 *
 * El token vive en una cookie httpOnly, no en Firestore: así cada quien publica
 * en su cuenta y no hay un token de nadie guardado en el servidor.
 */

const AUTORIZAR = "https://www.tiktok.com/v2/auth/authorize/";
const API = "https://open.tiktokapis.com/v2";

/** Lo mínimo: saber en qué cuenta publicas, y publicar. Nada más. */
export const PERMISOS = "user.info.basic,video.publish";

export class TikTokError extends Error {}

export interface Creador {
  nombre: string;
  usuario: string;
  avatar: string;
  privacidades: string[];
  duetoBloqueado: boolean;
  stitchBloqueado: boolean;
  comentarioBloqueado: boolean;
  segundosMax: number;
}

export interface Publicacion {
  titulo: string;
  privacidad: string;
  comentarios: boolean;
  duetos: boolean;
  stitches: boolean;
  esComercial: boolean;
  marcaPropia: boolean;
}

function llaves() {
  const key = process.env.TIKTOK_CLIENT_KEY;
  const secret = process.env.TIKTOK_CLIENT_SECRET;
  if (!key || !secret) {
    throw new TikTokError(
      "Faltan TIKTOK_CLIENT_KEY y TIKTOK_CLIENT_SECRET en el entorno",
    );
  }
  return { key, secret };
}

/**
 * El origen público, el que ve el navegador.
 *
 * No vale `new URL(request.url).origin`: App Hosting corre detrás de un proxy
 * y la petición llega con la dirección interna del contenedor
 * (`https://0.0.0.0:8080`). Con eso, la `redirect_uri` no coincide con la
 * registrada en TikTok y el login se cae. Mismo patrón que `ticketUrl.ts`.
 */
export async function origenPublico() {
  const { headers } = await import("next/headers");
  const lista = await headers();
  const host = lista.get("x-forwarded-host") ?? lista.get("host") ?? "localhost:3000";
  const proto = lista.get("x-forwarded-proto")
    ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function urlVuelta(origen: string) {
  return `${origen}/tiktok/callback`;
}

/** A dónde se manda al creador para que autorice. */
export function urlAutorizar(origen: string, estado: string) {
  const p = new URLSearchParams({
    client_key: llaves().key,
    scope: PERMISOS,
    response_type: "code",
    redirect_uri: urlVuelta(origen),
    state: estado,
  });
  return `${AUTORIZAR}?${p}`;
}

async function pedir<T>(ruta: string, opciones: RequestInit): Promise<T> {
  const r = await fetch(`${API}${ruta}`, opciones);
  const cuerpo = await r.json().catch(() => null);

  // TikTok contesta 200 con el fallo dentro de `error.code`, así que mirar
  // solo el código HTTP deja pasar errores como si todo hubiera ido bien.
  const error = cuerpo?.error;
  if (error && error.code && error.code !== "ok") {
    throw new TikTokError(`${error.code}: ${error.message || "sin detalle"}`);
  }
  if (!r.ok) throw new TikTokError(`HTTP ${r.status}`);
  return cuerpo as T;
}

// --- entrar ------------------------------------------------------------

interface RespuestaToken {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  open_id: string;
}

export async function canjearCodigo(origen: string, codigo: string) {
  const { key, secret } = llaves();
  return pedir<RespuestaToken>("/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: key,
      client_secret: secret,
      code: codigo,
      grant_type: "authorization_code",
      redirect_uri: urlVuelta(origen),
    }),
  });
}

/** El token de acceso dura 24 h; el de refresco, un año. */
export async function refrescar(refresco: string) {
  const { key, secret } = llaves();
  return pedir<RespuestaToken>("/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: key,
      client_secret: secret,
      grant_type: "refresh_token",
      refresh_token: refresco,
    }),
  });
}

// --- lo que hay que enseñar antes de publicar --------------------------

/**
 * Quién es el creador y qué le permite su cuenta.
 *
 * No es un adorno: las normas de TikTok obligan a enseñar estos datos y a que
 * el creador elija privacidad con ellos delante. Y hay que llamarlo cada vez,
 * porque los ajustes de la cuenta pueden haber cambiado desde la última.
 */
export async function infoCreador(token: string): Promise<Creador> {
  const r = await pedir<{ data: Record<string, unknown> }>(
    "/post/publish/creator_info/query/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
    },
  );
  const d = r.data ?? {};
  return {
    nombre: String(d.creator_nickname ?? ""),
    usuario: String(d.creator_username ?? ""),
    avatar: String(d.creator_avatar_url ?? ""),
    privacidades: (d.privacy_level_options as string[]) ?? [],
    duetoBloqueado: Boolean(d.duet_disabled),
    stitchBloqueado: Boolean(d.stitch_disabled),
    comentarioBloqueado: Boolean(d.comment_disabled),
    segundosMax: Number(d.max_video_post_duration_sec ?? 0),
  };
}

// --- publicar ----------------------------------------------------------

/**
 * Sube el vídeo y lo publica. Devuelve el `publish_id` para seguirlo.
 *
 * En un solo trozo a propósito: TikTok admite hasta 64 MB por trozo y un reel
 * nuestro pesa entre dos y veinte. Trocear solo añadiría estados que fallar.
 */
export async function publicar(
  token: string,
  video: ArrayBuffer,
  p: Publicacion,
): Promise<string> {
  const tamano = video.byteLength;

  const inicio = await pedir<{ data: { publish_id: string; upload_url: string } }>(
    "/post/publish/video/init/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: p.titulo,
          privacy_level: p.privacidad,
          disable_comment: !p.comentarios,
          disable_duet: !p.duetos,
          disable_stitch: !p.stitches,
          brand_content_toggle: p.esComercial,
          brand_organic_toggle: p.marcaPropia,
        },
        source_info: {
          source: "FILE_UPLOAD",
          video_size: tamano,
          chunk_size: tamano,
          total_chunk_count: 1,
        },
      }),
    },
  );

  const { publish_id, upload_url } = inicio.data;

  const subida = await fetch(upload_url, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Range": `bytes 0-${tamano - 1}/${tamano}`,
    },
    body: video,
  });
  if (!subida.ok) {
    throw new TikTokError(`la subida del vídeo devolvió HTTP ${subida.status}`);
  }

  return publish_id;
}

export async function estadoPublicacion(token: string, publishId: string) {
  const r = await pedir<{ data: { status: string; fail_reason?: string } }>(
    "/post/publish/status/fetch/",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    },
  );
  return { estado: r.data.status, motivo: r.data.fail_reason ?? "" };
}
