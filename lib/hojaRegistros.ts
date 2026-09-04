/**
 * La hoja de cálculo de los registros.
 *
 * Cada vez que alguien acepta los términos, marca o desmarca las novedades o
 * borra la cuenta, se le manda a un Apps Script de Google (`docs/hoja-registros.gs`)
 * que pone al día la fila de ese correo. Es lo que Alejandro mira para saber a
 * quién puede escribir: por eso la baja y el borrado también llegan aquí, y
 * no sólo el alta.
 *
 * Sin `HOJA_REGISTROS_URL` o sin el secreto no se manda nada y no pasa nada:
 * la cuenta se guarda igual. Y si la hoja falla, se apunta en el log y la
 * petición de la app sigue su curso; la cuenta manda sobre la hoja, nunca al
 * revés.
 */
export type ApunteHoja =
  | {
      accion?: "alta";
      correo: string;
      nombre?: string;
      terminos: string | null;
      novedades: boolean;
    }
  | { accion: "borrar"; correo: string };

export async function apuntaEnHoja(apunte: ApunteHoja): Promise<void> {
  const url = process.env.HOJA_REGISTROS_URL;
  const secreto = process.env.HOJA_REGISTROS_SECRETO;
  if (!url || !secreto || !apunte.correo) return;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secreto, cuando: new Date().toISOString(), ...apunte }),
      // Apps Script contesta con una redirección a googleusercontent: se sigue.
      redirect: "follow",
      // Cuatro segundos: la hoja no puede retener el registro de nadie.
      signal: AbortSignal.timeout(4000),
    });
    if (!r.ok) console.warn(`[hoja] la hoja de registros contestó ${r.status}`);
  } catch (fallo) {
    console.warn(`[hoja] no se pudo apuntar · ${(fallo as Error).message}`);
  }
}
