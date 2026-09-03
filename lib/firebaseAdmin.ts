import { cert, getApp, getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Admin SDK: sólo el servidor escribe en Firestore, así que la validación
 * (no reclamar más unidades de las que hay, un único pagador…) sigue viviendo
 * en un sitio donde nadie puede saltársela.
 *
 * Credenciales, por orden: FIREBASE_SERVICE_ACCOUNT con el JSON de una cuenta
 * de servicio (lo normal al desplegar), o las credenciales por defecto del
 * entorno — que es lo que ya tienes si has hecho `firebase login` en local.
 */
function create(): Firestore {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "Falta FIREBASE_PROJECT_ID (o NEXT_PUBLIC_FIREBASE_PROJECT_ID) en el entorno.",
    );
  }

  const app = getApps().length
    ? getApp()
    : initializeApp({
        projectId,
        credential: process.env.FIREBASE_SERVICE_ACCOUNT
          ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
          : applicationDefault(),
      });

  const firestore = getFirestore(app);
  try {
    firestore.settings({ ignoreUndefinedProperties: true });
  } catch {
    // settings() sólo admite una llamada por instancia; en recarga en caliente
    // el módulo se reevalúa pero la app de Firebase sobrevive.
  }
  return firestore;
}

const globalForDb = globalThis as unknown as { __divifriendsFirestore?: Firestore };

export function firestore(): Firestore {
  if (!globalForDb.__divifriendsFirestore) globalForDb.__divifriendsFirestore = create();
  return globalForDb.__divifriendsFirestore;
}

export const TICKETS = "tickets";

/**
 * Quién dice ser quien llama.
 *
 * El navegador entra con Google y se queda con un token firmado por Firebase;
 * cada petición a `/api/cuenta` lo manda en `Authorization` y aquí se comprueba
 * la firma. Sin esto, cualquiera podría pedir la cuenta de otro poniendo su
 * `uid` en el cuerpo. Reutiliza la misma app del Admin SDK que Firestore, así
 * que arrancarla es gratis.
 */
export function adminAuth(): Auth {
  firestore();
  return getAuth(getApp());
}
