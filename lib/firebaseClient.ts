"use client";

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type Auth,
  type User,
} from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const configurado = Boolean(config.apiKey && config.projectId && config.appId);

function clientApp(): FirebaseApp | null {
  if (!configurado) return null;
  return getApps().length
    ? getApp()
    : initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        appId: config.appId,
      });
}

/**
 * El navegador sólo *lee* Firestore, para enterarse al instante de lo que
 * marcan los demás. Todas las escrituras van por la API, que es donde vive la
 * validación; las reglas de seguridad prohíben escribir desde el cliente.
 *
 * Devuelve null si la configuración pública no está puesta: en ese caso la app
 * sigue funcionando con sondeo periódico, sólo que menos inmediata.
 */
let db: Firestore | null = null;

export function clientFirestore(): Firestore | null {
  const app = clientApp();
  if (!app) return null;
  /*
    Long polling forzado, y no el transporte por defecto.

    Medido el 6 de septiembre de 2026 contra la web publicada, en un iPhone
    simulado: con el transporte por defecto —fetch streams— Safari enseñaba
    un plato marcado desde otro móvil hasta 30 s tarde, y no siempre, según en
    qué punto del ciclo del canal cayera la escritura. En Chrome, 15 ms. WebKit
    retiene el canal de escucha y los mensajes sólo llegan cuando se recicla;
    el sondeo de `useTicketSync` no salta porque el SDK nunca se cree
    desconectado. Con long polling: 0,4 s en Safari, y en Chrome lo mismo que
    antes, que es lo que tarda la propia petición a la API.

    Se guarda la instancia: `initializeFirestore` sólo se puede llamar una vez
    por app con estas opciones.
  */
  db ??= initializeFirestore(app, { experimentalForceLongPolling: true });
  return db;
}

export const realtimeEnabled = configurado;

/* ------------------------------------------------------------- la cuenta */

/**
 * La entrada con Google, y sólo con Google.
 *
 * Es opcional: la web entera funciona sin ella. Lo que da es memoria —tu
 * nombre, tu foto y tus divis te siguen de un móvil a otro— y, más adelante,
 * que se te pueda avisar. Va por Firebase Auth sobre el mismo proyecto de la
 * app, así que no hay una segunda base de usuarios que mantener.
 *
 * Apple no está a propósito: exige el Apple Developer Program, que son 99 € al
 * año, y se decidió no pagarlos.
 */
export function clientAuth(): Auth | null {
  const app = clientApp();
  if (!app) return null;
  const auth = getAuth(app);
  auth.languageCode = "es";
  return auth;
}

/**
 * Los fallos que se van a ver de verdad, con su código de Firebase.
 *
 * `null` es «lo cerró quien lo abrió»: no es un fallo y no se enseña nada. El
 * primero de la lista es el del primer día: el proveedor está sin encender en
 * la consola de Firebase, y si no se dice con palabras la gente ve
 * `auth/operation-not-allowed` y cree que es culpa suya.
 */
export type FalloEntrada = "apagado" | "bloqueado" | "sinRed" | "otro";

const FALLOS: Record<string, FalloEntrada | null> = {
  "auth/operation-not-allowed": "apagado",
  "auth/configuration-not-found": "apagado",
  "auth/unauthorized-domain": "apagado",
  "auth/popup-blocked": "bloqueado",
  // El navegador de dentro de WhatsApp, Instagram o TikTok: no sabe abrir
  // ventanas y Google no deja entrar desde ahí. La salida es la misma que
  // con la ventana bloqueada: abrirlo en Safari o Chrome.
  "auth/operation-not-supported-in-this-environment": "bloqueado",
  "auth/web-storage-unsupported": "bloqueado",
  "auth/popup-closed-by-user": null,
  "auth/cancelled-popup-request": null,
  "auth/network-request-failed": "sinRed",
};

export class EntradaError extends Error {
  /**
   * `codigo` es el de Firebase, tal cual. Se enseña en pequeño debajo del
   * aviso: tres códigos distintos comparten el texto de «apagado», y sin
   * verlo no hay forma de saber desde fuera cuál le salió a alguien.
   */
  constructor(
    public motivo: FalloEntrada,
    public codigo: string,
  ) {
    super(motivo);
  }
}

/** `null` si la persona cerró la ventana sin terminar. */
export async function entrarConGoogle(): Promise<User | null> {
  const auth = clientAuth();
  if (!auth) throw new EntradaError("apagado", "sin-config");
  try {
    const { user } = await signInWithPopup(auth, new GoogleAuthProvider());
    return user;
  } catch (fallo) {
    const codigo = (fallo as { code?: string }).code ?? "";
    const motivo = codigo in FALLOS ? FALLOS[codigo] : "otro";
    if (motivo === null) return null;
    throw new EntradaError(motivo, codigo || "sin-codigo");
  }
}

export async function salirDeGoogle(): Promise<void> {
  const auth = clientAuth();
  if (auth) await signOut(auth).catch(() => {});
}

/** Avisa con el usuario actual, y `null` cuando no hay nadie. */
export function onUsuario(cb: (user: User | null) => void): () => void {
  const auth = clientAuth();
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}
