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
