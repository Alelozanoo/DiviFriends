import { randomInt } from "node:crypto";
import { firestore } from "./firebaseAdmin";
import { StoreError } from "./store";
import type { PerfilCuenta } from "./cuentaServer";
import { limpiaPerfil, USERS } from "./cuentaServer";

/**
 * Amigos y asientos reservados.
 *
 * Dos ideas, y las dos por privacidad:
 *
 *   - **Los amigos se hacen por enlace, no por correo.** Buscar a alguien por
 *     su correo diría a cualquiera si esa persona tiene cuenta. En cambio cada
 *     cuenta tiene un código corto y un enlace `/amigo/{código}` que se manda
 *     por WhatsApp; quien lo abre pide la amistad, y el otro acepta. Nadie
 *     entra en tu lista sin que digas sí, y nadie sabe que existes sin que se
 *     lo digas tú.
 *
 *   - **Un asiento reservado es un participante con `uid` al lado.** Cuando un
 *     amigo te mete en una mesa, la mesa crea el participante con tu nombre y
 *     tu cara —igual que si te hubieras apuntado tú— y aquí se apunta que ese
 *     asiento es tuyo. Al abrir el enlace con tu cuenta, la web te sienta ahí
 *     sin preguntarte quién eres. Se guarda aparte y no dentro del ticket para
 *     no tocar `lib/store.ts`, que es de la mesa y no de las cuentas.
 */

const AMIGOS = "amigos";
const CODIGOS = "codigos";
const USUARIOS = "usuarios";
const INVITACIONES = "invitaciones";
const AVISOS = "correos";

export type EstadoAmistad = "pendiente" | "aceptado";

export interface Amigo {
  uid: string;
  nombre: string;
  avatar?: string;
  usuario: string | null;
  estado: EstadoAmistad;
  /** Quién pidió: para saber a quién le toca aceptar. */
  pedidoPor: string;
  desde: string;
}

/** Lo que se enseña de alguien a quien no es su amigo aún: nombre, cara y usuario. */
export interface PerfilPublico {
  uid: string;
  nombre: string;
  avatar?: string;
  usuario: string | null;
}

/* ---------------------------------------------------------- el usuario */

/**
 * El usuario elegido: `@alelozano`. Minúsculas, cifras y guion bajo, de 3 a
 * 20. Es único de verdad por el mismo truco que el código: un documento en
 * `usuarios/{usuario}` que lo reserva dentro de una transacción.
 *
 * Elegirlo es opcional. Hasta entonces vale el código, y quien lo elige acepta
 * que cualquiera que lo sepa pueda pedirle amistad (que sigue teniendo que
 * aceptar): eso es lo único que revela, que existe.
 */
export function limpiaUsuario(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const u = raw.trim().replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_]{3,20}$/.test(u) ? u : null;
}

const RESERVADOS = new Set([
  "divifriends",
  "divi",
  "admin",
  "hola",
  "soporte",
  "ayuda",
  "amigo",
  "amigos",
  "cuenta",
  "api",
]);

/** Lo que hay que esperar para volver a cambiar el usuario. */
const CAMBIO_USUARIO_MS = 14 * 24 * 60 * 60 * 1000;

/** «18 de septiembre», para decir cuándo se podrá cambiar otra vez. */
function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

export async function ponUsuario(uid: string, raw: unknown): Promise<string> {
  const usuario = limpiaUsuario(raw);
  if (!usuario)
    throw new StoreError(
      "El usuario: de 3 a 20 letras minúsculas, cifras o guion bajo.",
    );
  if (RESERVADOS.has(usuario))
    throw new StoreError("Ese usuario no se puede elegir.");

  const db = firestore();
  const ref = db.collection(USERS).doc(uid);
  const reserva = db.collection(USUARIOS).doc(usuario);
  try {
    await db.runTransaction(async (tx) => {
      // El anterior se lee dentro de la transacción: dos cambios a la vez no
      // pueden dejar dos usuarios reservados a la misma cuenta.
      const [mio, ocupado] = await Promise.all([tx.get(ref), tx.get(reserva)]);
      const anterior = mio.get("usuario") as string | undefined;
      if (anterior === usuario) return;
      /*
        Una vez cada catorce días, y sólo cuenta cambiarlo: elegirlo la primera
        vez es gratis. Si no, quien te añadió ayer por @pepe no te encuentra hoy
        por @pepe_2. Se pidió el 4 de septiembre de 2026.
      */
      const cambiado = mio.get("usuarioCambiado") as string | undefined;
      if (anterior && cambiado) {
        const libre = new Date(cambiado).getTime() + CAMBIO_USUARIO_MS;
        if (Date.now() < libre) throw new Error(`pronto:${new Date(libre).toISOString()}`);
      }
      if (ocupado.exists && ocupado.get("uid") !== uid)
        throw new Error("ocupado");
      tx.set(reserva, { uid, desde: new Date().toISOString() });
      tx.set(
        ref,
        { usuario, ...(anterior ? { usuarioCambiado: new Date().toISOString() } : {}) },
        { merge: true },
      );
      // El anterior se libera para quien lo quiera.
      if (anterior) tx.delete(db.collection(USUARIOS).doc(anterior));
    });
  } catch (fallo) {
    const motivo = (fallo as Error).message;
    if (motivo === "ocupado")
      throw new StoreError("Ese usuario ya lo tiene otra persona.", 409);
    if (motivo.startsWith("pronto:"))
      throw new StoreError(
        `El usuario sólo se puede cambiar una vez cada 14 días. Podrás cambiarlo a partir del ${fechaLarga(motivo.slice(7))}.`,
        429,
      );
    throw fallo;
  }
  return usuario;
}

export async function uidDeUsuario(raw: string): Promise<string | null> {
  const usuario = limpiaUsuario(raw);
  if (!usuario) return null;
  const snap = await firestore().collection(USUARIOS).doc(usuario).get();
  return snap.exists ? (snap.get("uid") as string) : null;
}

/** Un código de seis, o un usuario, con o sin arroba: lo que haya escrito. */
export async function uidDeCodigoOUsuario(
  texto: string,
): Promise<string | null> {
  const limpio = texto.trim();
  if (/^@/.test(limpio) || !/^[A-Za-z0-9]{6}$/.test(limpio))
    return uidDeUsuario(limpio);
  return (await uidDeCodigo(limpio)) ?? (await uidDeUsuario(limpio));
}

/* ---------------------------------------------------------- el código */

// Sin vocales ni ceros ni unos: que no salga ninguna palabra y que no se
// confundan O/0 ni I/1 al dictarlo. Seis de treinta y dos son mil millones.
const ALFABETO = "BCDFGHJKMNPQRSTVWXYZ23456789";

function codigoNuevo(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

/** El código de amigo de una cuenta, creándolo la primera vez que se pide. */
export async function codigoDe(uid: string): Promise<string> {
  const db = firestore();
  const ref = db.collection(USERS).doc(uid);
  const snap = await ref.get();
  const actual = snap.get("codigo");
  if (typeof actual === "string" && actual) return actual;

  // Único de verdad: el documento `codigos/{codigo}` reserva el código, y la
  // transacción falla si otro lo ganó un instante antes.
  for (let intento = 0; intento < 5; intento++) {
    const codigo = codigoNuevo();
    const reserva = db.collection(CODIGOS).doc(codigo);
    try {
      await db.runTransaction(async (tx) => {
        if ((await tx.get(reserva)).exists) throw new Error("ocupado");
        tx.set(reserva, { uid, creado: new Date().toISOString() });
        tx.set(ref, { codigo }, { merge: true });
      });
      return codigo;
    } catch (fallo) {
      if ((fallo as Error).message !== "ocupado") throw fallo;
    }
  }
  throw new StoreError("No se ha podido crear tu código. Inténtalo otra vez.");
}

export async function uidDeCodigo(codigo: string): Promise<string | null> {
  const limpio = codigo.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(limpio)) return null;
  const snap = await firestore().collection(CODIGOS).doc(limpio).get();
  return snap.exists ? (snap.get("uid") as string) : null;
}

export async function perfilPublico(
  uid: string,
): Promise<PerfilPublico | null> {
  const snap = await firestore().collection(USERS).doc(uid).get();
  if (!snap.exists) return null;
  const perfil = limpiaPerfil(snap.get("perfil"));
  const usuario = snap.get("usuario");
  return {
    uid,
    nombre: perfil?.name ?? "Alguien",
    avatar: perfil?.avatar,
    usuario: typeof usuario === "string" ? usuario : null,
  };
}

export async function perfilDe(uid: string): Promise<PerfilCuenta | null> {
  const snap = await firestore().collection(USERS).doc(uid).get();
  return snap.exists ? limpiaPerfil(snap.get("perfil")) : null;
}

export async function correoDe(uid: string): Promise<string | null> {
  const snap = await firestore().collection(USERS).doc(uid).get();
  const email = snap.get("email");
  return typeof email === "string" && email ? email : null;
}

/* ------------------------------------------------------------ amistad */

function lado(uid: string, otro: string) {
  return firestore().collection(USERS).doc(uid).collection(AMIGOS).doc(otro);
}

export async function listaAmigos(uid: string): Promise<Amigo[]> {
  const snap = await firestore()
    .collection(USERS)
    .doc(uid)
    .collection(AMIGOS)
    .get();
  const amigos = await Promise.all(
    snap.docs.map(async (d) => {
      const perfil = await perfilPublico(d.id);
      return {
        uid: d.id,
        nombre: perfil?.nombre ?? "Alguien",
        avatar: perfil?.avatar,
        usuario: perfil?.usuario ?? null,
        estado: (d.get("estado") as EstadoAmistad) ?? "pendiente",
        pedidoPor: (d.get("pedidoPor") as string) ?? uid,
        desde: (d.get("desde") as string) ?? "",
      };
    }),
  );
  // Primero lo que te toca aceptar, luego los amigos, luego lo que esperas.
  return amigos.sort(
    (a, b) => peso(a, uid) - peso(b, uid) || a.nombre.localeCompare(b.nombre),
  );
}

function peso(a: Amigo, uid: string): number {
  if (a.estado === "pendiente" && a.pedidoPor !== uid) return 0;
  if (a.estado === "aceptado") return 1;
  return 2;
}

export async function sonAmigos(uid: string, otro: string): Promise<boolean> {
  const snap = await lado(uid, otro).get();
  return snap.exists && snap.get("estado") === "aceptado";
}

/**
 * Pide la amistad por código. Se escribe en los dos lados a la vez para que la
 * lista de cada uno diga lo mismo: tú «esperando», el otro «te lo pide».
 */
export async function pideAmistad(
  uid: string,
  codigo: string,
): Promise<{ perfil: PerfilPublico; estado: EstadoAmistad; nueva: boolean }> {
  const otro = await uidDeCodigoOUsuario(codigo);
  if (!otro) throw new StoreError("Ese código o usuario no es de nadie.", 404);
  if (otro === uid) throw new StoreError("Ese eres tú.");

  const perfil = await perfilPublico(otro);
  if (!perfil) throw new StoreError("Ese código no es de nadie.", 404);

  const ya = await lado(uid, otro).get();
  if (ya.exists && ya.get("estado") === "aceptado")
    return { perfil, estado: "aceptado", nueva: false };

  // Si el otro ya te lo había pedido, esto es aceptar.
  if (ya.exists && ya.get("pedidoPor") === otro) {
    await aceptaAmistad(uid, otro);
    return { perfil, estado: "aceptado", nueva: false };
  }

  // Ya estaba pedida por ti: no se repite ni se vuelve a avisar.
  if (ya.exists) return { perfil, estado: "pendiente", nueva: false };

  const ahora = new Date().toISOString();
  const lote = firestore().batch();
  lote.set(lado(uid, otro), {
    estado: "pendiente",
    pedidoPor: uid,
    desde: ahora,
  });
  lote.set(lado(otro, uid), {
    estado: "pendiente",
    pedidoPor: uid,
    desde: ahora,
  });
  await lote.commit();
  return { perfil, estado: "pendiente", nueva: true };
}

export async function aceptaAmistad(uid: string, otro: string): Promise<void> {
  const snap = await lado(uid, otro).get();
  if (!snap.exists)
    throw new StoreError("No hay ninguna petición de esa persona.", 404);
  if (snap.get("pedidoPor") === uid)
    throw new StoreError("Le toca aceptar a la otra persona.");
  const ahora = new Date().toISOString();
  const lote = firestore().batch();
  lote.set(
    lado(uid, otro),
    { estado: "aceptado", desde: ahora },
    { merge: true },
  );
  lote.set(
    lado(otro, uid),
    { estado: "aceptado", desde: ahora },
    { merge: true },
  );
  await lote.commit();
}

/** Quitar, o rechazar: es lo mismo, y se borra en los dos lados. */
export async function quitaAmigo(uid: string, otro: string): Promise<void> {
  const lote = firestore().batch();
  lote.delete(lado(uid, otro));
  lote.delete(lado(otro, uid));
  await lote.commit();
}

/* --------------------------------------------------------- los asientos */

function asiento(code: string, uid: string) {
  return firestore().collection(INVITACIONES).doc(`${code}_${uid}`);
}

export async function reservaAsiento(p: {
  code: string;
  uid: string;
  participantId: string;
  por: string;
  /** Para poder listarlo sin abrir la mesa: dónde y quién te metió. */
  mesa: string | null;
  porNombre: string;
}): Promise<void> {
  await asiento(p.code, p.uid).set(
    {
      code: p.code,
      uid: p.uid,
      participantId: p.participantId,
      por: p.por,
      mesa: p.mesa,
      porNombre: p.porNombre,
      visto: false,
      creada: new Date().toISOString(),
    },
    { merge: true },
  );
}

/**
 * Todo lo que una cuenta deja fuera de su propio documento, borrado.
 *
 * Borrar `users/{uid}` no borra su subcolección de amigos, ni el lado de cada
 * amigo que apunta a ella, ni el código y el usuario que la reservaban, ni los
 * asientos ni los avisos. Sin esto, «borrar mi cuenta» dejaba media cuenta
 * viva: el usuario ocupado para siempre y la cara en la lista de los amigos.
 *
 * Va antes de borrar la cuenta, y en lotes de 400 por el tope de Firestore.
 */
export async function borraRastro(uid: string): Promise<void> {
  const db = firestore();
  const yo = db.collection(USERS).doc(uid);
  const [snap, misAmigos, asientos, avisos] = await Promise.all([
    yo.get(),
    yo.collection(AMIGOS).get(),
    db.collection(INVITACIONES).where("uid", "==", uid).get(),
    db.collection(AVISOS).where("uid", "==", uid).get(),
  ]);

  const refs = [
    ...misAmigos.docs.flatMap((d) => [d.ref, lado(d.id, uid)]),
    ...asientos.docs.map((d) => d.ref),
    ...avisos.docs.map((d) => d.ref),
  ];
  const codigo = snap.get("codigo");
  const usuario = snap.get("usuario");
  if (typeof codigo === "string" && codigo)
    refs.push(db.collection(CODIGOS).doc(codigo));
  if (typeof usuario === "string" && usuario)
    refs.push(db.collection(USUARIOS).doc(usuario));

  for (let i = 0; i < refs.length; i += 400) {
    const lote = db.batch();
    for (const ref of refs.slice(i, i + 400)) lote.delete(ref);
    await lote.commit();
  }
}

/** Ya la ha abierto: deja de contar como pendiente. */
export async function marcaVisto(code: string, uid: string): Promise<void> {
  await asiento(code, uid).set({ visto: true }, { merge: true });
}

export interface MesaPendiente {
  code: string;
  mesa: string | null;
  por: string;
  creada: string;
}

/* ------------------------------------------------------------ la campana */

export interface AvisoCampana {
  id: string;
  tipo: "invitacion" | "cierre" | "pago" | "solicitud";
  asunto: string;
  url: string;
  leido: boolean;
  cuando: string;
}

/**
 * Los avisos de la campana: los mismos que salen por correo, apuntados en
 * `correos/`, estén mandados o no. Sin `orderBy` en la consulta a propósito:
 * con el `where` haría falta un índice compuesto, y ordenar sesenta en
 * memoria es gratis.
 */
export async function avisosDe(uid: string): Promise<AvisoCampana[]> {
  const base = firestore().collection(AVISOS).where("uid", "==", uid);
  let snap: FirebaseFirestore.QuerySnapshot;
  try {
    snap = await base.orderBy("cuando", "desc").limit(30).get();
  } catch {
    // Sin el índice (uid, cuando) todavía desplegado: los que haya, ordenados
    // aquí. Es un puente hasta `firebase deploy --only firestore:indexes`.
    console.warn(
      "[campana] falta el índice correos(uid, cuando): ordenando en memoria",
    );
    snap = await base.limit(60).get();
  }
  return snap.docs
    .map((d) => ({
      id: d.id,
      tipo: (d.get("tipo") as AvisoCampana["tipo"]) ?? "invitacion",
      asunto: (d.get("asunto") as string) ?? "",
      url: (d.get("url") as string) ?? "/",
      leido: d.get("leido") === true,
      cuando: (d.get("cuando") as string) ?? "",
    }))
    .sort((a, b) => b.cuando.localeCompare(a.cuando))
    .slice(0, 30);
}

/** Abrir la campana es leerlos: se apagan todos de golpe. */
export async function marcaLeidos(uid: string): Promise<void> {
  const snap = await firestore()
    .collection(AVISOS)
    .where("uid", "==", uid)
    .where("leido", "==", false)
    .limit(400)
    .get();
  if (snap.empty) return;
  const lote = firestore().batch();
  for (const d of snap.docs) lote.set(d.ref, { leido: true }, { merge: true });
  await lote.commit();
}

/**
 * Lo que tienes sin ver: solicitudes que te toca aceptar y avisos sin leer.
 * Es lo que pinta el número en la campana.
 */
export async function pendientesDe(
  uid: string,
): Promise<{ solicitudes: number; avisos: number }> {
  const [amigos, avisos] = await Promise.all([
    firestore()
      .collection(USERS)
      .doc(uid)
      .collection(AMIGOS)
      .where("estado", "==", "pendiente")
      .get(),
    firestore()
      .collection(AVISOS)
      .where("uid", "==", uid)
      .where("leido", "==", false)
      .limit(100)
      .get(),
  ]);
  return {
    solicitudes: amigos.docs.filter((d) => d.get("pedidoPor") !== uid).length,
    avisos: avisos.size,
  };
}

/** Al apuntarse uno mismo con cuenta: para que la mesa sepa avisarle luego. */
export async function vinculaAsiento(
  code: string,
  uid: string,
  participantId: string,
): Promise<void> {
  // Un asiento que ya es de otra cuenta no se puede reclamar: si no, cualquiera
  // con el código se pondría en el sitio de un amigo y se llevaría sus avisos.
  const deOtro = await firestore()
    .collection(INVITACIONES)
    .where("code", "==", code)
    .where("participantId", "==", participantId)
    .limit(1)
    .get();
  if (!deOtro.empty && deOtro.docs[0].get("uid") !== uid) {
    throw new StoreError("Ese sitio ya es de otra persona.", 409);
  }
  await asiento(code, uid).set(
    { code, uid, participantId, por: uid, creada: new Date().toISOString() },
    { merge: true },
  );
}

export async function asientoDe(
  code: string,
  uid: string,
): Promise<string | null> {
  const snap = await asiento(code, uid).get();
  return snap.exists ? (snap.get("participantId") as string) : null;
}

/** Quién de la mesa tiene cuenta: participante → uid. */
export async function cuentasDeLaMesa(
  code: string,
): Promise<Map<string, string>> {
  const snap = await firestore()
    .collection(INVITACIONES)
    .where("code", "==", code)
    .get();
  const mapa = new Map<string, string>();
  for (const d of snap.docs)
    mapa.set(d.get("participantId") as string, d.get("uid") as string);
  return mapa;
}
