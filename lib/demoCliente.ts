"use client";

/**
 * Pedir una mesa de ejemplo, desde el navegador.
 *
 * Vive aparte porque la piden dos sitios: el botón de la portada y el de
 * «repetir» del propio guiado. Devuelve el código o `null` si no se pudo —sin
 * red, o con el tope por IP lleno— y quien llama decide qué hacer con eso.
 *
 * Cada vez es una mesa nueva y no la misma reiniciada. Reiniciarla pediría
 * borrar lo que has marcado y volver a sentar a la gente, o sea media API para
 * algo que se resuelve con una escritura: los platos ya vienen escritos, así
 * que crear otra no cuesta ni un céntimo de lector. Y así «repetir» es de
 * verdad empezar de cero, desde el primer paso, sin tu nombre puesto todavía.
 */
export async function nuevaDemo(): Promise<string | null> {
  try {
    const r = await fetch("/api/demo", { method: "POST" });
    const { code } = (await r.json()) as { code?: string };
    return code ?? null;
  } catch {
    return null;
  }
}

/** Dónde se apunta cuál es tu mesa de ejemplo, para poder volver. */
const CLAVE = "divi.demo";

/**
 * Apunta la mesa de ejemplo en la que has estado.
 *
 * Es lo que hace que ocultarla de la lista no la pierda: el menú de la cuenta
 * la abre otra vez. Una sola, la última, que es la que tiene tu nombre y lo
 * que marcaste.
 */
export function recuerdaDemo(code: string): void {
  try {
    localStorage.setItem(CLAVE, code);
  } catch {
    /* sin sitio: el menú creará una nueva, que tampoco es grave */
  }
}

export function demoGuardada(): string | null {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

/**
 * La mesa de ejemplo a la que ir desde el menú: la tuya si sigue viva, y si no
 * una nueva. Se comprueba que exista porque caducan a los treinta días y
 * mandar a alguien a una mesa borrada es peor que darle una limpia.
 */
export async function demoParaVolver(): Promise<string | null> {
  const guardada = demoGuardada();
  if (guardada) {
    try {
      const r = await fetch(`/api/tickets/${guardada}`);
      if (r.ok) return guardada;
    } catch {
      // Sin red no se puede comprobar; se intenta crear una y ya fallará ahí.
    }
  }
  return nuevaDemo();
}
