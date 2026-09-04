import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { firestore } from "./firebaseAdmin";
import { consume, TOPES } from "./rateLimit";
import { claveRecordatorio, textoRecordatorio, type Tono } from "./recordatorio";

/**
 * Los correos de la app, y sobre todo sus frenos.
 *
 * Salen del buzón de `hola@divifriends.es` por el SMTP de Hostinger, que tiene
 * tope: 500 a la hora, y al día 1.000 en el plan de empresa o 100 en el
 * gratuito. Un bucle tonto —una mesa de veinte con un aviso por cabeza y por
 * cambio— lo funde en una tarde y de paso quema la reputación del dominio.
 * Así que aquí la regla es una: **ningún correo sale porque sí; todos salen
 * por un acto de una persona, una sola vez, y con tope.**
 *
 * Cuatro candados, y cada uno cubre lo que el otro no:
 *
 *   1. **Uno por hecho.** Cada correo lleva una clave —«invitación a esta mesa
 *      a esta persona»— y si ya se mandó, no se repite aunque se vuelva a
 *      pedir. Vive en `correos/{clave}`.
 *   2. **Tope por persona**: cinco al día. Nadie recibe más, pase lo que pase
 *      en sus mesas.
 *   3. **Tope global del día**, en `CORREO_TOPE_DIA`. Va al 60 % del plan del
 *      buzón para dejar margen a las ráfagas que Hostinger corta.
 *   4. **La baja**: quien apaga los avisos no recibe nada más, y cada correo
 *      lleva el enlace para apagarlos sin tener que entrar.
 *
 * Los topes usan el mismo `consume` de `lib/rateLimit.ts` que frena las
 * lecturas de tickets, así que viven en Firestore y no se saltan reiniciando.
 *
 * Y son correos de servicio, no publicidad: avisan de algo que ha pasado en
 * una mesa tuya. Nada de novedades ni de promociones por esta vía, nunca; en
 * cuanto entre una, la LSSI pide consentimiento aparte y la baja deja de ser
 * opcional.
 */

const DIA = 24 * 60 * 60 * 1000;
const TOPE_POR_PERSONA = 5;
const TOPE_GLOBAL = Number(process.env.CORREO_TOPE_DIA ?? 60);

const HOST = process.env.SMTP_HOST ?? "smtp.hostinger.com";
const PUERTO = Number(process.env.SMTP_PUERTO ?? 465);
const USUARIO = process.env.SMTP_USUARIO ?? "hola@divifriends.es";
const CLAVE = process.env.SMTP_CLAVE ?? "";
const SECRETO = process.env.CORREO_SECRETO ?? "";

/** Sin contraseña no hay correo, y la app sigue igual: se apunta y se calla. */
export const hayCorreo = Boolean(CLAVE);

let transporte: nodemailer.Transporter | null = null;
function smtp(): nodemailer.Transporter {
  if (!transporte) {
    transporte = nodemailer.createTransport({
      host: HOST,
      port: PUERTO,
      secure: PUERTO === 465,
      auth: { user: USUARIO, pass: CLAVE },
    });
  }
  return transporte;
}

/* ------------------------------------------------------- el aviso de alta */

/** A quién se le avisa de cada registro nuevo. Sin esto no se manda nada. */
const ALTAS_A = process.env.ALTAS_A ?? "";

/**
 * «Se ha registrado alguien», al buzón de Alejandro.
 *
 * Sale la primera vez que una cuenta acepta los términos, desde hola@ y al
 * correo de `ALTAS_A`. No pasa por la campana ni por el registro de
 * `correos` —no es un aviso a un usuario— pero sí cuenta en el tope global
 * del día, porque el buzón de Hostinger cuenta todo lo que sale.
 *
 * Nunca rompe el registro: si el correo falla, se apunta en el log y la
 * cuenta queda igual de creada.
 */
export async function avisaAlta(p: {
  nombre: string;
  correo: string;
  usuario: string | null;
  novedades: boolean;
  bizum?: string;
  revolut?: string;
}): Promise<void> {
  if (!hayCorreo || !ALTAS_A) return;
  const cabe = await consume([{ key: "correo_global_dia", max: TOPE_GLOBAL, windowMs: DIA }]);
  if (!cabe.ok) {
    console.warn("correo: aviso de alta sin mandar, tope del día");
    return;
  }
  const nombre = limpio(p.nombre, 40) || "Alguien";
  const cuando = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "medium", timeStyle: "short" });
  const lineas = [
    `${nombre} acaba de registrarse en DiviFriends.`,
    "",
    `Correo: ${p.correo}`,
    `Usuario: ${p.usuario ? "@" + p.usuario : "sin elegir"}`,
    `Novedades: ${p.novedades ? "sí" : "no"}`,
    `Bizum: ${p.bizum ? "sí" : "no"} · Revolut: ${p.revolut ? "sí" : "no"}`,
    `Cuándo: ${cuando}`,
  ];
  try {
    await smtp().sendMail({
      from: { name: "DiviFriends", address: USUARIO },
      to: ALTAS_A,
      replyTo: p.correo,
      subject: `Nuevo registro: ${nombre}`,
      text: lineas.join("\n"),
      html: `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#14100d">${lineas
        .map((l) => (l ? `<p style="margin:0 0 6px">${escapa(l)}</p>` : '<p style="margin:0 0 12px"></p>'))
        .join("")}</div>`,
      headers: { "Auto-Submitted": "auto-generated" },
    });
  } catch (fallo) {
    console.error("correo: el aviso de alta no ha salido", (fallo as Error).message);
  }
}

/* ------------------------------------------------------------ la baja */

/**
 * El enlace de baja lleva una firma de la persona, para que nadie pueda dar de
 * baja a otro cambiando el `uid` de la URL. Se firma con `CORREO_SECRETO` y,
 * si no está, con la propia contraseña del buzón: cualquier cosa antes que un
 * enlace de baja sin firmar.
 */
function firma(uid: string): string {
  return createHmac("sha256", SECRETO || CLAVE)
    .update(`baja:${uid}`)
    .digest("hex")
    .slice(0, 32);
}

export function firmaValida(uid: string, token: string): boolean {
  const buena = Buffer.from(firma(uid));
  const dada = Buffer.from(token);
  return buena.length === dada.length && timingSafeEqual(buena, dada);
}

export function enlaceDeBaja(origen: string, uid: string): string {
  return `${origen}/api/correo/baja?u=${encodeURIComponent(uid)}&t=${firma(uid)}`;
}

/** El dominio público: escrito en producción, deducido de la petición en local. */
export function origenDe(request: Request): string {
  if (process.env.SITIO_URL) return process.env.SITIO_URL.replace(/\/$/, "");
  // Sin `SITIO_URL` sólo se fía de la casa y del portátil. Un `Host` inventado
  // en la petición no puede colar su dominio en un correo que firma DiviFriends.
  const host = (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    ""
  ).toLowerCase();
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) return `http://${host}`;
  return ORIGENES.has(host) ? `https://${host}` : ORIGEN_POR_DEFECTO;
}

const ORIGEN_POR_DEFECTO = "https://divifriends.es";
const ORIGENES = new Set(["divifriends.es", "www.divifriends.es"]);

/* -------------------------------------------------------------- mandar */

export type TipoAviso = "invitacion" | "cierre" | "pago" | "solicitud" | "recordatorio";

export interface Aviso {
  /** A quién, por su cuenta. */
  uid: string;
  tipo: TipoAviso;
  email: string;
  /** Una por hecho: si ya se mandó, no se repite. */
  clave: string;
  asunto: string;
  /** El párrafo principal, ya escrito. */
  texto: string;
  /** Por qué le llega a esta persona: va al pie, y es obligatorio. */
  porque: string;
  /** Adónde lleva el botón. */
  url: string;
  boton: string;
  origen: string;
}

export type Resultado =
  "mandado" | "repetido" | "sin-correo" | "baja" | "tope" | "fallo";

/**
 * Apunta el aviso y, si pasa los cuatro candados, lo manda por correo.
 *
 * El aviso se escribe **siempre** en `correos/{clave}`, con su texto y su
 * enlace: es lo que enseña la campana dentro de la web. El correo es sólo una
 * de las dos vías, y la única que tiene frenos. Así quien apaga los correos
 * sigue viendo en la campana que le han metido en una mesa.
 *
 * Nunca lanza: un correo que no sale no puede tumbar la petición que lo pidió.
 */
export async function mandaAviso(aviso: Aviso): Promise<Resultado> {
  // Nada de lo que escribió un usuario lleva saltos de línea ni caracteres de
  // control: van al asunto y al texto plano, donde una línea nueva es una
  // línea más del correo.
  aviso.asunto = limpio(aviso.asunto, 140);
  aviso.texto = limpio(aviso.texto, 400);
  aviso.porque = limpio(aviso.porque, 200);

  // Un tope por destinatario antes de apuntar nada: si a alguien le llegan
  // cuarenta avisos en un día, lo que hay detrás es un bucle, no una cena.
  const cabe = await consume([
    { key: `aviso_${aviso.uid}`, ...TOPES.cuenta.avisos },
  ]);
  if (!cabe.ok) return "tope";

  const db = firestore();

  // 1. ¿Ya se apuntó este? Uno por hecho, también en la campana.
  const registro = db.collection("correos").doc(claveSegura(aviso.clave));
  if ((await registro.get()).exists) return "repetido";

  const apunta = (estado: Resultado) =>
    registro.set({
      ...huella(aviso),
      estado,
      leido: false,
      cuando: new Date().toISOString(),
    });

  // 4. ¿Tiene los correos apagados? Se apunta igual; sólo no se manda.
  const cuenta = await db.collection("users").doc(aviso.uid).get();
  if (cuenta.exists && cuenta.get("avisos") === false) {
    await apunta("baja");
    return "baja";
  }
  if (!hayCorreo) {
    await apunta("sin-correo");
    return "sin-correo";
  }

  // 2 y 3. Los topes, en una sola transacción: si uno está lleno no se gasta el otro.
  const persona = createHash("sha256")
    .update(`correo:${aviso.uid}`)
    .digest("hex")
    .slice(0, 24);
  const decision = await consume([
    { key: "correo_global_dia", max: TOPE_GLOBAL, windowMs: DIA },
    { key: `correo_${persona}_dia`, max: TOPE_POR_PERSONA, windowMs: DIA },
  ]);
  if (!decision.ok) {
    await apunta("tope");
    return "tope";
  }

  const baja = enlaceDeBaja(aviso.origen, aviso.uid);
  try {
    await smtp().sendMail({
      from: { name: "DiviFriends", address: USUARIO },
      to: aviso.email,
      replyTo: USUARIO,
      subject: aviso.asunto,
      text: textoPlano(aviso, baja),
      html: html(aviso, baja),
      headers: {
        "List-Unsubscribe": `<${baja}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        "Auto-Submitted": "auto-generated",
      },
    });
  } catch (fallo) {
    console.error(
      "correo: no ha salido",
      aviso.clave,
      (fallo as Error).message,
    );
    await apunta("fallo");
    return "fallo";
  }

  await apunta("mandado");
  return "mandado";
}

/**
 * Lo que se apunta de cada aviso: lo justo para pintarlo en la campana. Nunca
 * el correo de destino, que ya está en la cuenta.
 */
function huella(aviso: Aviso) {
  return {
    uid: aviso.uid,
    tipo: aviso.tipo,
    clave: aviso.clave,
    asunto: aviso.asunto,
    url: aviso.url,
  };
}

function claveSegura(clave: string): string {
  return clave.replace(/[^\w.-]/g, "_").slice(0, 200);
}

/* ------------------------------------------------------------ el cuerpo */

function textoPlano(a: Aviso, baja: string): string {
  return [
    a.texto,
    "",
    `${a.boton}: ${a.url}`,
    "",
    `Recibes esto porque ${a.porque}.`,
    `Para no recibir más avisos: ${baja}`,
    "",
    "DiviFriends · reparte la cuenta sin discutir",
  ].join("\n");
}

function limpio(s: string, max: number): string {
  return s
    .replace(/[\p{Cc}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function escapa(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] as string,
  );
}

/** La misma cara que la web: crema, tinta, y las cifras en la letra de máquina. */
function html(a: Aviso, baja: string): string {
  return `<!doctype html>
<html lang="es"><body style="margin:0;padding:32px 16px;background:#14100d;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;margin:0 auto;">
    <tr><td style="padding-bottom:20px;text-align:center;">
      <span style="font-size:22px;font-weight:bold;color:#f4ece0;letter-spacing:-.5px;">Divi</span><span style="font-size:22px;font-weight:bold;color:#e8b04b;letter-spacing:-.5px;">Friends</span>
    </td></tr>
    <tr><td style="background:#f4ece0;padding:28px 26px;">
      <p style="margin:0 0 18px;font-size:17px;line-height:1.5;color:#14100d;">${escapa(a.texto)}</p>
      <a href="${escapa(a.url)}" style="display:block;background:#14100d;color:#f4ece0;text-decoration:none;text-align:center;font-weight:bold;font-size:15px;padding:15px 18px;border-radius:12px;">${escapa(a.boton)}</a>
      <p style="margin:22px 0 0;padding-top:16px;border-top:1px dashed #c9bda9;font-size:12px;line-height:1.5;color:#6b5f52;">
        Recibes esto porque ${escapa(a.porque)}.
        <a href="${escapa(baja)}" style="color:#6b5f52;">No recibir más avisos</a>.
      </p>
    </td></tr>
    <tr><td style="padding-top:18px;text-align:center;font-size:12px;color:#98897a;">DiviFriends · reparte la cuenta sin discutir</td></tr>
  </table>
</body></html>`;
}

/* ---------------------------------------------------- los tres avisos */

function euros(cents: number): string {
  return (
    (cents / 100).toLocaleString("es-ES", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

/** «Ale te ha metido en Casa Lola». */
export function correoInvitacion(p: {
  uid: string;
  email: string;
  origen: string;
  code: string;
  mesa: string | null;
  quien: string;
}): Aviso {
  const sitio = p.mesa ?? "una mesa";
  return {
    uid: p.uid,
    tipo: "invitacion",
    email: p.email,
    origen: p.origen,
    clave: `invitacion.${p.code}.${p.uid}`,
    asunto: `${p.quien} te ha metido en ${sitio}`,
    texto: `${p.quien} te ha añadido a la cuenta de ${sitio}. Entra, marca lo que has tomado y paga lo tuyo.`,
    porque: `tienes cuenta en DiviFriends y ${p.quien} te ha añadido a esa mesa`,
    url: `${p.origen}/t/${p.code}`,
    boton: "Marcar lo mío",
  };
}

/** «Se ha cerrado Casa Lola: te tocan 18,96 €». */
export function correoCierre(p: {
  uid: string;
  email: string;
  origen: string;
  code: string;
  mesa: string | null;
  cents: number;
  aQuien: string | null;
}): Aviso {
  const sitio = p.mesa ?? "la mesa";
  const debe = p.cents > 0;
  return {
    uid: p.uid,
    tipo: "cierre",
    email: p.email,
    origen: p.origen,
    clave: `cierre.${p.code}.${p.uid}`,
    asunto: debe
      ? `${sitio}: te tocan ${euros(p.cents)}`
      : `${sitio} está cerrada`,
    texto: debe
      ? `Se ha cerrado la cuenta de ${sitio}. Te tocan ${euros(p.cents)}${p.aQuien ? `, a ${p.aQuien}` : ""}.`
      : `Se ha cerrado la cuenta de ${sitio} y no debes nada.`,
    porque: `estás en esa mesa con tu cuenta de DiviFriends`,
    url: `${p.origen}/t/${p.code}`,
    boton: debe ? "Pagar lo mío" : "Ver la cuenta",
  };
}

/** «Rocío quiere añadirte»: la solicitud de amistad, con el enlace que acepta. */
export function correoSolicitud(p: {
  uid: string;
  email: string;
  origen: string;
  quien: string;
  /** El código de amigo de quien pide: abrir su enlace es aceptar. */
  codigo: string;
  uidPide: string;
}): Aviso {
  return {
    uid: p.uid,
    tipo: "solicitud",
    email: p.email,
    origen: p.origen,
    clave: `solicitud.${p.uidPide}.${p.uid}`,
    asunto: `${p.quien} quiere añadirte en DiviFriends`,
    texto: `${p.quien} te ha mandado una solicitud de amistad. Si aceptas, os podéis meter en la misma mesa de un toque.`,
    porque: `tienes cuenta en DiviFriends y ${p.quien} te ha mandado una solicitud`,
    url: `${p.origen}/amigo/${p.codigo}`,
    boton: "Ver la solicitud",
  };
}

/** «Rocío te ha pagado 18,44 €». */
/**
 * «Me debes», mandado por quien puso la tarjeta.
 *
 * El texto y la clave viven en `lib/recordatorio.ts`, que es puro y se puede
 * probar sin Firebase delante: son lo único de este correo que puede acabar
 * diciéndole a alguien una cifra que no es.
 */
export function correoRecordatorio(p: {
  uid: string;
  email: string;
  origen: string;
  code: string;
  mesa: string | null;
  /** Quien lo manda: el que pagó. */
  quien: string;
  cents: number;
  tono: Tono;
  /** El día, `AAAA-MM-DD`: una vez por persona, mesa y día. */
  dia: string;
}): Aviso {
  const t = textoRecordatorio({
    mesa: p.mesa,
    quien: p.quien,
    dinero: euros(p.cents),
    tono: p.tono,
  });
  return {
    uid: p.uid,
    tipo: "recordatorio",
    email: p.email,
    origen: p.origen,
    clave: claveRecordatorio(p.code, p.uid, p.dia),
    asunto: t.asunto,
    texto: t.texto,
    porque: `${p.quien}, que puso la tarjeta, te lo ha pedido desde su cuenta de DiviFriends`,
    url: `${p.origen}/t/${p.code}`,
    boton: t.boton,
  };
}

export function correoPago(p: {
  uid: string;
  email: string;
  origen: string;
  code: string;
  mesa: string | null;
  quien: string;
  /** El id del que paga: la clave va por pareja, y así repetirlo no repite el aviso. */
  de: string;
  cents: number;
}): Aviso {
  return {
    uid: p.uid,
    tipo: "pago",
    email: p.email,
    origen: p.origen,
    clave: `pago.${p.code}.${p.de}.${p.uid}`,
    asunto: `${p.quien} te ha pagado ${euros(p.cents)}`,
    texto: `${p.quien} dice que te ha mandado ${euros(p.cents)} de ${p.mesa ?? "la mesa"}. Entra y confirma que te ha llegado.`,
    porque: `pusiste la tarjeta en esa mesa con tu cuenta de DiviFriends`,
    url: `${p.origen}/t/${p.code}`,
    boton: "Confirmar que me ha llegado",
  };
}
