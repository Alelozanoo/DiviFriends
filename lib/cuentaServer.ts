import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, firestore } from "./firebaseAdmin";
import type { DiviGuardado } from "./misDivis";
import { StoreError } from "./store";

/**
 * La cuenta, en el servidor.
 *
 * Un documento por persona en `users/{uid}`, y el navegador nunca lo lee ni lo
 * escribe directamente: todo pasa por `/api/cuenta` con el token de Firebase
 * en la cabecera, igual que las comandas pasan por su API. Así lo que se
 * guarda está validado en un sitio que nadie puede saltarse.
 *
 * Qué hay dentro, y nada más:
 *
 *   - el perfil que ya existía en el móvil (nombre, foto pequeña, Bizum,
 *     Revolut), para entrar en las mesas ya puesto;
 *   - las últimas treinta divis, las mismas que `lib/misDivis.ts` guarda en el
 *     móvil, para que te sigan de un aparato a otro y para que el resumen del
 *     mes tenga de dónde salir;
 *   - el correo, que lo da Google y hace falta para avisarte más adelante.
 *
 * No se guarda la foto de Google tal cual: el navegador la baja, la recorta a
 * 150 px y la manda como las demás. Un enlace a `googleusercontent.com` caduca
 * y además `Avatar` no sabe pintarlo.
 */

export const USERS = "users";

export interface PerfilCuenta {
  name: string;
  avatar?: string;
  bizum?: string;
  revolut?: string;
}

export interface Cuenta {
  uid: string;
  email: string | null;
  perfil: PerfilCuenta | null;
  divis: DiviGuardado[];
  /** Los correos de la mesa: invitaciones, cierre, pagos. Encendidos salvo que se apaguen. */
  avisos: boolean;
  /** El usuario elegido, `@así`, o null si sigue con el código. */
  usuario: string | null;
  creada: string;
  actualizada: string;
}

/** Espejo de `TOPE` en `lib/misDivis.ts`: lo que se guarda, y ni una más. */
const TOPE_DIVIS = 30;

/**
 * Lo que aguanta un documento sin acercarse al mega de Firestore. Doce divis
 * con seis caras a 15 KB cada una ya son un mega largo, así que si la lista
 * pesa más de esto se le quitan las fotos a la gente y se quedan las
 * iniciales. Mejor una lista sin caras que una cuenta que no se guarda.
 */
const PESO_MAXIMO = 350_000;

/* ----------------------------------------------------------- quién llama */

export interface Quien {
  uid: string;
  email: string | null;
  nombre: string | null;
}

/**
 * Comprueba el token de la cabecera `Authorization: Bearer …`.
 *
 * `checkRevoked` a `true` cuesta una consulta más pero hace que borrar la
 * cuenta o cerrar sesión en todos los aparatos surta efecto al momento, en vez
 * de dentro de una hora cuando caduque el token.
 */
export async function usuarioDe(request: Request): Promise<Quien | null> {
  const cabecera = request.headers.get("authorization") ?? "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7).trim() : "";
  if (!token) return null;
  try {
    const claims = await adminAuth().verifyIdToken(token, true);
    return {
      uid: claims.uid,
      email: typeof claims.email === "string" ? claims.email : null,
      nombre: typeof claims.name === "string" ? claims.name : null,
    };
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------- limpiar */

function limpiaTexto(valor: unknown, max: number): string {
  return typeof valor === "string"
    ? valor
        .replace(/[\p{Cc}]+/gu, " ")
        .trim()
        .slice(0, max)
    : "";
}

/**
 * La foto, con las mismas reglas que una foto de participante: un data URL
 * de imagen y pequeño, o un emoji corto. Cualquier otra cosa se descarta sin
 * romper el guardado del resto.
 */
function limpiaAvatar(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const avatar = valor.trim();
  if (!avatar) return undefined;
  if (avatar.startsWith("data:")) {
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar))
      return undefined;
    if (avatar.length > 25_000) return undefined;
    return avatar;
  }
  return avatar.length <= 16 ? avatar : undefined;
}

export function limpiaPerfil(raw: unknown): PerfilCuenta | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const name = limpiaTexto(r.name, 20);
  if (!name) return null;
  const bizum = limpiaTexto(r.bizum, 12).replace(/\D/g, "");
  const revolut = limpiaTexto(r.revolut, 32)
    .replace(/^@/, "")
    .replace(/[^\w.]/g, "");
  return {
    name,
    avatar: limpiaAvatar(r.avatar),
    bizum: bizum || undefined,
    revolut: revolut || undefined,
  };
}

/** Céntimos que no pueden ser negativos: lo puesto y lo consumido. */
function enteroPositivo(valor: unknown): number | undefined {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined;
}

function limpiaDivi(raw: unknown): DiviGuardado | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const code = limpiaTexto(r.code, 12).toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) return null;
  const at = limpiaTexto(r.at, 40);
  if (Number.isNaN(new Date(at).getTime())) return null;

  const gente = Array.isArray(r.gente)
    ? r.gente.slice(0, 12).flatMap((g) => {
        if (typeof g !== "object" || g === null) return [];
        const p = g as Record<string, unknown>;
        const name = limpiaTexto(p.name, 20);
        if (!name) return [];
        return [
          {
            name,
            color: limpiaTexto(p.color, 24) || "#e8b04b",
            avatar: limpiaAvatar(p.avatar),
          },
        ];
      })
    : [];

  /*
    Lo que te deben, persona a persona. Se corta en doce como la gente: una
    mesa no tiene más, y así una lista inventada no puede engordar el
    documento de nadie.
  */
  const deudas = Array.isArray(r.deudas)
    ? r.deudas.slice(0, 12).flatMap((d) => {
        if (typeof d !== "object" || d === null) return [];
        const x = d as Record<string, unknown>;
        const name = limpiaTexto(x.name, 20);
        const cents = Number.isFinite(Number(x.cents)) ? Math.round(Number(x.cents)) : 0;
        if (!name || cents <= 0) return [];
        return [{ name, cents, pagado: x.pagado === true }];
      })
    : undefined;

  const creada = limpiaTexto(r.creada, 40);

  return {
    code,
    place: limpiaTexto(r.place, 60) || null,
    at,
    currency: limpiaTexto(r.currency, 3) || "EUR",
    cents: Number.isFinite(Number(r.cents)) ? Math.round(Number(r.cents)) : 0,
    aQuien: limpiaTexto(r.aQuien, 20) || null,
    saldado: r.saldado === true,
    gente,
    puestoCents: enteroPositivo(r.puestoCents),
    mioCents: enteroPositivo(r.mioCents),
    deudas,
    creada: creada && !Number.isNaN(new Date(creada).getTime()) ? creada : undefined,
  };
}

export function limpiaDivis(raw: unknown): DiviGuardado[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, TOPE_DIVIS * 2).flatMap((d) => {
    const divi = limpiaDivi(d);
    return divi ? [divi] : [];
  });
}

/* ---------------------------------------------------------------- fundir */

/**
 * Dos listas de divis, una: por código, y la que se vio más tarde manda.
 *
 * Es la misma regla en el móvil y aquí, para que dé igual desde qué lado
 * llegue el cambio. Se ordena por fecha y se corta al tope.
 */
export function fundeDivis(
  a: DiviGuardado[],
  b: DiviGuardado[],
): DiviGuardado[] {
  const porCodigo = new Map<string, DiviGuardado>();
  for (const divi of [...a, ...b]) {
    const previa = porCodigo.get(divi.code);
    if (
      !previa ||
      new Date(divi.at).getTime() >= new Date(previa.at).getTime()
    ) {
      porCodigo.set(divi.code, divi);
    }
  }
  const lista = [...porCodigo.values()].sort(
    (x, y) => new Date(y.at).getTime() - new Date(x.at).getTime(),
  );
  return poda(lista.slice(0, TOPE_DIVIS));
}

function poda(divis: DiviGuardado[]): DiviGuardado[] {
  if (JSON.stringify(divis).length <= PESO_MAXIMO) return divis;
  return divis.map((d) => ({
    ...d,
    gente: d.gente.map(({ name, color }) => ({ name, color })),
  }));
}

/* ------------------------------------------------------------- Firestore */

function doc(uid: string) {
  return firestore().collection(USERS).doc(uid);
}

function aCuenta(
  uid: string,
  datos: FirebaseFirestore.DocumentData | undefined,
): Cuenta {
  return {
    uid,
    email: typeof datos?.email === "string" ? datos.email : null,
    perfil: limpiaPerfil(datos?.perfil),
    divis: limpiaDivis(datos?.divis),
    avisos: datos?.avisos !== false,
    usuario: typeof datos?.usuario === "string" ? datos.usuario : null,
    creada:
      typeof datos?.creada === "string"
        ? datos.creada
        : new Date().toISOString(),
    actualizada:
      typeof datos?.actualizada === "string"
        ? datos.actualizada
        : new Date().toISOString(),
  };
}

/** La cuenta, creándola si es la primera vez que esta persona entra. */
export async function leeOCrea(quien: Quien): Promise<Cuenta> {
  const ref = doc(quien.uid);
  const snap = await ref.get();
  if (snap.exists) {
    // El correo puede cambiar en Google; se pone al día sin más.
    if (quien.email && snap.get("email") !== quien.email) {
      await ref.set({ email: quien.email }, { merge: true });
    }
    return aCuenta(quien.uid, {
      ...snap.data(),
      email: quien.email ?? snap.get("email"),
    });
  }
  const ahora = new Date().toISOString();
  const nueva = {
    email: quien.email,
    perfil: null,
    divis: [],
    avisos: true,
    creada: ahora,
    actualizada: ahora,
  };
  await ref.set(nueva);
  return aCuenta(quien.uid, nueva);
}

/**
 * Guarda lo que llegue: el perfil entero, las divis fundidas con las que ya
 * había, o las dos cosas. Devuelve la cuenta como queda.
 */
export async function actualiza(
  quien: Quien,
  cambios: { perfil?: unknown; divis?: unknown; avisos?: unknown },
): Promise<Cuenta> {
  const actual = await leeOCrea(quien);
  const parche: Record<string, unknown> = {
    actualizada: new Date().toISOString(),
  };

  if (typeof cambios.avisos === "boolean") parche.avisos = cambios.avisos;

  if (cambios.perfil !== undefined) {
    const perfil = limpiaPerfil(cambios.perfil);
    if (!perfil) throw new StoreError("El perfil necesita al menos un nombre.");
    parche.perfil = perfil;
  }
  if (cambios.divis !== undefined) {
    parche.divis = fundeDivis(actual.divis, limpiaDivis(cambios.divis));
  }

  await doc(quien.uid).set(parche, { merge: true });
  return { ...actual, ...(parche as Partial<Cuenta>) };
}

/**
 * Borrar es borrar: el documento y la identidad en Firebase Auth. Las mesas en
 * las que estuvo no se tocan, porque no son suyas: son de la mesa, y lo que
 * marcó sigue contando para los demás.
 */
export async function borraCuenta(uid: string): Promise<void> {
  await doc(uid).delete();
  await adminAuth()
    .deleteUser(uid)
    .catch(() => {
      // Si ya no existía en Auth, el objetivo está cumplido igual.
    });
}

export { FieldValue };
