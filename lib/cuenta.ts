"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { User } from "firebase/auth";
import { EntradaError, entrarConGoogle, onUsuario, salirDeGoogle, type FalloEntrada } from "./firebaseClient";
import { processImageToAvatarBase64 } from "./avatarUpload";
import { EVENTO, fundir, todos, type DiviGuardado } from "./misDivis";
import { EVENTO_PERFIL, escribirPerfil, leerPerfil, type GlobalProfile } from "./useGlobalProfile";

/**
 * La cuenta, en el navegador.
 *
 * La idea entera cabe en una frase: **la cuenta no es una fuente de datos
 * nueva, es una copia en la nube de lo que el móvil ya guardaba.** El perfil
 * sigue viviendo en `divifriends_profile` y las divis en `divi.mis-divis`,
 * exactamente igual que sin cuenta; lo único que hace esto es, al entrar,
 * fundir lo de la nube con lo del móvil, y a partir de ahí subir cada cambio.
 *
 * Por eso `SplitApp` no sabe que existe: la mesa lee el perfil del mismo sitio
 * de siempre, y quien no se registra no nota ninguna diferencia.
 */

type Estado = {
  /** `undefined` mientras Firebase decide; `null` si no hay nadie. */
  usuario: User | null | undefined;
  /** Cuántas divis hay en la cuenta, para decirlo en la hoja. */
  divis: number;
  /** Los correos de la mesa, encendidos o no. */
  avisos: boolean;
  /** Lo que tienes sin ver: solicitudes por aceptar y avisos sin leer. */
  pendientes: Pendientes;
  /** El usuario elegido, `@así`, o null si sigue con el código. */
  usuarioNombre: string | null;
  /**
   * Si ya sabemos lo que hay en la cuenta. Sin esto no se distingue «no
   * tienes usuario» de «todavía no ha llegado», y la bienvenida saldría un
   * instante a quien lo eligió hace meses. Sin red se queda en `false`: es
   * mejor no preguntar nada que preguntar lo que ya está contestado.
   */
  cargada: boolean;
  ocupado: boolean;
  fallo: FalloEntrada | null;
  /** El código de Firebase detrás de `fallo`, para poder preguntar «¿qué te ha salido?». */
  falloCodigo: string | null;
};

export interface Pendientes {
  solicitudes: number;
  avisos: number;
}
export interface AvisoCampana {
  id: string;
  tipo: "invitacion" | "cierre" | "pago" | "solicitud";
  asunto: string;
  url: string;
  leido: boolean;
  cuando: string;
}
const NADA: Pendientes = { solicitudes: 0, avisos: 0 };

let estado: Estado = {
  usuario: undefined,
  divis: 0,
  avisos: true,
  pendientes: NADA,
  usuarioNombre: null,
  cargada: false,
  ocupado: false,
  fallo: null,
  falloCodigo: null,
};
const oyentes = new Set<() => void>();

function pon(cambios: Partial<Estado>) {
  estado = { ...estado, ...cambios };
  for (const o of oyentes) o();
}

/* --------------------------------------------------------------- la API */

async function api(user: User, metodo: "GET" | "PATCH" | "DELETE", cuerpo?: unknown) {
  const token = await user.getIdToken();
  const r = await fetch("/api/cuenta", {
    method: metodo,
    headers: {
      authorization: `Bearer ${token}`,
      ...(cuerpo !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = (await r.json().catch(() => ({}))) as {
    error?: string;
    perfil?: GlobalProfile | null;
    divis?: DiviGuardado[];
    avisos?: boolean;
    usuario?: string | null;
  };
  if (!r.ok) throw new Error(datos.error ?? "No se ha podido hablar con la cuenta.");
  return datos;
}

/**
 * Cualquier otra ruta de la cuenta, con el token puesto. Lanza con el mensaje
 * del servidor, que ya viene escrito para enseñarse.
 */
export async function llama<T = Record<string, unknown>>(
  ruta: string,
  metodo: "GET" | "POST" | "PATCH" | "DELETE" = "GET",
  cuerpo?: unknown,
): Promise<T> {
  const user = estado.usuario;
  if (!user) throw new Error("Hay que entrar primero.");
  const token = await user.getIdToken();
  const r = await fetch(ruta, {
    method: metodo,
    headers: {
      authorization: `Bearer ${token}`,
      ...(cuerpo !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = (await r.json().catch(() => ({}))) as T & { error?: string };
  if (!r.ok) throw new Error(datos.error ?? "No se ha podido hablar con el servidor.");
  return datos;
}

/* ------------------------------------------------------------- amigos */

export interface Amigo {
  uid: string;
  nombre: string;
  avatar?: string;
  usuario: string | null;
  estado: "pendiente" | "aceptado";
  pedidoPor: string;
  desde: string;
}

export const amigos = () =>
  llama<{ amigos: Amigo[]; codigo: string; usuario: string | null; yo: string }>("/api/cuenta/amigos");

/* ----------------------------------------------------------- la campana */

export const avisos = () => llama<{ avisos: AvisoCampana[] }>("/api/cuenta/avisos");
export const marcaLeidos = () => llama("/api/cuenta/avisos", "PATCH", {});

/** Elegir o cambiar el usuario. El servidor dice si está libre. */
export async function ponUsuario(usuario: string): Promise<void> {
  const user = estado.usuario;
  if (!user) return;
  const datos = await api(user, "PATCH", { usuario });
  pon({ usuarioNombre: datos.usuario ?? usuario });
}
export const pideAmigo = (codigo: string) =>
  llama<{ amigos: Amigo[]; perfil: { nombre: string } }>("/api/cuenta/amigos", "POST", { codigo });
export const aceptaAmigo = (uid: string) => llama<{ amigos: Amigo[] }>("/api/cuenta/amigos", "PATCH", { uid });
export const quitaAmigo = (uid: string) => llama<{ amigos: Amigo[] }>("/api/cuenta/amigos", "DELETE", { uid });

/* ------------------------------------------------------ la mesa y tú */

/** ¿Me reservaron asiento en esta mesa? */
export const asientoEn = (code: string) =>
  llama<{ participantId: string | null }>(`/api/cuenta/mesa/${code}`);

/** «Este asiento es mío», al apuntarse con cuenta. */
export const vinculaAsiento = (code: string, participantId: string) =>
  llama(`/api/cuenta/mesa/${code}`, "POST", { participantId });

/** Meter a un amigo en la mesa. Devuelve el estado de la mesa ya con él. */
export const invitaAMesa = (code: string, uid: string) =>
  llama<Record<string, unknown>>(`/api/tickets/${code}/invitar`, "POST", { uid });

/** Los correos de la mesa, encendidos o apagados. */
export async function ponAvisos(avisos: boolean): Promise<void> {
  const user = estado.usuario;
  if (!user) return;
  pon({ avisos });
  await api(user, "PATCH", { avisos }).catch(() => pon({ avisos: !avisos }));
}

/** Quién está dentro ahora mismo, para quien no usa el hook. */
export const usuarioActual = () => estado.usuario ?? null;

/** Vuelve a contar lo pendiente. Se llama al entrar y tras aceptar o quitar. */
export async function recargaPendientes(): Promise<void> {
  if (!estado.usuario) return;
  try {
    pon({ pendientes: await llama<Pendientes>("/api/cuenta/pendientes") });
  } catch {
    // Sin red: se queda el último recuento.
  }
}

/* ----------------------------------------------------------- la foto */

/**
 * La foto de Google, convertida a la de la casa.
 *
 * Google da un enlace, y un enlace no sirve: caduca, `Avatar` no lo pinta y
 * la mesa no lo aceptaría. Se baja y pasa por el mismo recorte a 150 px que
 * cualquier foto que subes tú. Si el navegador no deja bajarla —CORS, sin
 * red—, no pasa nada: te quedas con la inicial y la pones luego.
 */
async function fotoDeGoogle(user: User): Promise<string | undefined> {
  if (!user.photoURL) return undefined;
  try {
    const url = user.photoURL.replace(/=s\d+-c$/, "=s300-c");
    const r = await fetch(url, { mode: "cors" });
    if (!r.ok) return undefined;
    const blob = await r.blob();
    const file = new File([blob], "foto.jpg", { type: blob.type || "image/jpeg" });
    return await processImageToAvatarBase64(file);
  } catch {
    return undefined;
  }
}

/* ---------------------------------------------------------- sincronizar */

let subiendo: ReturnType<typeof setTimeout> | null = null;
let desengancha: (() => void) | null = null;

/** Sube el perfil y las divis del móvil a la cuenta, agrupando cambios. */
function programaSubida(user: User) {
  if (subiendo) clearTimeout(subiendo);
  subiendo = setTimeout(async () => {
    subiendo = null;
    try {
      const perfil = leerPerfil();
      const datos = await api(user, "PATCH", {
        ...(perfil?.name ? { perfil } : {}),
        divis: todos(),
      });
      if (datos.divis) {
        fundir(datos.divis);
        pon({ divis: datos.divis.length });
      }
    } catch {
      // Sin red: el móvil sigue teniendo todo; se vuelve a intentar al
      // siguiente cambio.
    }
  }, 800);
}

/**
 * Al entrar: bajar, fundir, subir, y quedarse escuchando.
 *
 * El orden importa. Primero lo de la nube al móvil, para que quien entra en
 * un móvil nuevo vea sus divis al momento. Luego lo del móvil a la nube, para
 * que lo que hubiera aquí antes de entrar no se pierda. Y sólo después se
 * escucha: si se escuchara desde el principio, el primer «fundir» dispararía
 * una subida de lo que acaba de bajar.
 */
async function sincroniza(user: User) {
  pon({ ocupado: true });
  try {
    const nube = await api(user, "GET");

    if (typeof nube.avisos === "boolean") pon({ avisos: nube.avisos });
    pon({ usuarioNombre: nube.usuario ?? null, cargada: true });
    if (nube.divis?.length) fundir(nube.divis);
    void recargaPendientes();

    const local = leerPerfil();
    if (nube.perfil?.name) {
      // La nube manda sobre el móvil: es la que te sigue de un aparato a otro.
      escribirPerfil(nube.perfil, true);
    } else if (local?.name) {
      // Primera vez con cuenta y ya había perfil aquí: sube.
      await api(user, "PATCH", { perfil: local });
    } else if (user.displayName) {
      // Ni en un sitio ni en otro: se estrena con lo que trae Google.
      const perfil: GlobalProfile = {
        name: user.displayName.split(" ")[0].slice(0, 20),
        avatar: await fotoDeGoogle(user),
      };
      escribirPerfil(perfil, true);
      await api(user, "PATCH", { perfil });
    }

    const subida = await api(user, "PATCH", { divis: todos() });
    if (subida.divis) fundir(subida.divis);
    pon({ divis: subida.divis?.length ?? 0 });
  } catch {
    // Sin red al entrar: la sesión existe igual y se sincroniza al primer
    // cambio, que es cuando `programaSubida` vuelve a intentarlo.
  } finally {
    pon({ ocupado: false });
  }

  const alCambiar = () => programaSubida(user);
  window.addEventListener(EVENTO, alCambiar);
  window.addEventListener(EVENTO_PERFIL, alCambiar);
  desengancha = () => {
    window.removeEventListener(EVENTO, alCambiar);
    window.removeEventListener(EVENTO_PERFIL, alCambiar);
  };
}

/* ------------------------------------------------------------- arranque */

let arrancado = false;
function arranca() {
  if (arrancado || typeof window === "undefined") return;
  arrancado = true;
  onUsuario((user) => {
    desengancha?.();
    desengancha = null;
    pon({ usuario: user, fallo: null, pendientes: NADA, usuarioNombre: null, cargada: false });
    if (user) void sincroniza(user);
  });
}

function subscribe(o: () => void) {
  oyentes.add(o);
  arranca();
  return () => {
    oyentes.delete(o);
  };
}

const enServidor: Estado = {
  usuario: undefined,
  divis: 0,
  avisos: true,
  pendientes: NADA,
  usuarioNombre: null,
  cargada: false,
  ocupado: false,
  fallo: null,
  falloCodigo: null,
};

/* -------------------------------------------------------------- el hook */

export function useCuenta() {
  const e = useSyncExternalStore(
    subscribe,
    () => estado,
    () => enServidor,
  );

  const entrar = useCallback(async () => {
    pon({ ocupado: true, fallo: null, falloCodigo: null });
    try {
      await entrarConGoogle();
      // El usuario llega por `onUsuario`; aquí no hay nada más que hacer.
    } catch (fallo) {
      pon(
        fallo instanceof EntradaError
          ? { fallo: fallo.motivo, falloCodigo: fallo.codigo }
          : { fallo: "otro", falloCodigo: (fallo as { code?: string }).code ?? String(fallo).slice(0, 80) },
      );
    } finally {
      pon({ ocupado: false });
    }
  }, []);

  /**
   * Cerrar la sesión no borra nada del móvil: el perfil y las divis siguen
   * aquí, como estaban antes de entrar. Lo que deja de pasar es que se suban.
   */
  const salir = useCallback(async () => {
    await salirDeGoogle();
  }, []);

  /** Borrar de verdad: el servidor quita el documento y la identidad. */
  const borrar = useCallback(async () => {
    if (!estado.usuario) return;
    await api(estado.usuario, "DELETE");
    await salirDeGoogle();
  }, []);

  return { ...e, entrar, salir, borrar };
}
