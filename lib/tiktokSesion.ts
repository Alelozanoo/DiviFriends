/**
 * La sesión de TikTok, en cookies httpOnly.
 *
 * No se guarda en Firestore a propósito: así el token es de quien entra y no
 * hay credenciales de nadie almacenadas en el servidor. Si alguien más usa la
 * página, publica en su cuenta y no en la nuestra.
 */
import { cookies } from "next/headers";

const ACCESO = "tt_acceso";
const REFRESCO = "tt_refresco";
const ESTADO = "tt_estado";

const BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function guardarSesion(acceso: string, refresco: string, dura: number) {
  const c = await cookies();
  // Un minuto menos de lo que dice TikTok: el token no debe caducar entre que
  // se lee la cookie y se usa.
  c.set(ACCESO, acceso, { ...BASE, maxAge: Math.max(60, dura - 60) });
  c.set(REFRESCO, refresco, { ...BASE, maxAge: 60 * 60 * 24 * 300 });
}

export async function tokenActual() {
  return (await cookies()).get(ACCESO)?.value ?? "";
}

export async function tokenRefresco() {
  return (await cookies()).get(REFRESCO)?.value ?? "";
}

export async function salir() {
  const c = await cookies();
  [ACCESO, REFRESCO, ESTADO].forEach((n) => c.delete(n));
}

/** El `state` de OAuth: se guarda al salir y se compara al volver. */
export async function guardarEstado(valor: string) {
  (await cookies()).set(ESTADO, valor, { ...BASE, maxAge: 600 });
}

export async function estadoGuardado() {
  return (await cookies()).get(ESTADO)?.value ?? "";
}
