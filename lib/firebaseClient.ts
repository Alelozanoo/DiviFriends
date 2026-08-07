"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * El navegador sólo *lee* Firestore, para enterarse al instante de lo que
 * marcan los demás. Todas las escrituras van por la API, que es donde vive la
 * validación; las reglas de seguridad prohíben escribir desde el cliente.
 *
 * Devuelve null si la configuración pública no está puesta: en ese caso la app
 * sigue funcionando con sondeo periódico, sólo que menos inmediata.
 */
export function clientFirestore(): Firestore | null {
  if (!config.apiKey || !config.projectId || !config.appId) return null;
  const app = getApps().length
    ? getApp()
    : initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        appId: config.appId,
      });
  return getFirestore(app);
}

export const realtimeEnabled = Boolean(config.apiKey && config.projectId && config.appId);
