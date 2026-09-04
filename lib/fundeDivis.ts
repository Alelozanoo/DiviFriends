import type { DiviGuardado } from "./misDivis";

/**
 * Fundir dos listas de divis, con memoria de las que se quitaron.
 *
 * Es la misma regla en el móvil y en el servidor, y por eso vive aquí, sin
 * tocar ni Firestore ni el navegador: por código, y la que se vio más tarde
 * manda.
 *
 * Lo que faltaba, y era un fallo que se veía: **fundir nunca borraba**. Quitar
 * una divi de «Tus divis» la borraba del móvil, el móvil subía su lista sin
 * ella, la cuenta la fundía con la que tenía —que sí la tenía— y la
 * devolvía. Un segundo después estaba otra vez en la lista. Se vio el 3 de
 * septiembre de 2026.
 *
 * La solución es una marca por código con la hora en que se quitó. Una divi
 * cuenta como quitada si se quitó **después** de la última vez que se vio
 * (`at`): así la copia vieja de otro móvil no la resucita, y si vuelves a
 * entrar en esa mesa —`at` más nuevo que la marca— vuelve sola y la marca
 * sobra.
 */
export type Quitadas = Record<string, string>;

/** Cuántas marcas se recuerdan. Más viejas que la número sesenta ya no
    tienen copia en ningún móvil que las resucite. */
export const TOPE_QUITADAS = 60;

const cuando = (iso: string) => new Date(iso).getTime();

/** ¿Se quitó esta divi después de la última vez que se vio? */
export function quitada(divi: DiviGuardado, quitadas: Quitadas): boolean {
  const marca = quitadas[divi.code];
  return marca !== undefined && cuando(divi.at) <= cuando(marca);
}

export function fundeDivis(
  a: DiviGuardado[],
  b: DiviGuardado[],
  quitadas: Quitadas = {},
  tope = 30,
): { divis: DiviGuardado[]; quitadas: Quitadas } {
  const porCodigo = new Map<string, DiviGuardado>();
  for (const divi of [...a, ...b]) {
    const previa = porCodigo.get(divi.code);
    if (!previa || cuando(divi.at) >= cuando(previa.at)) porCodigo.set(divi.code, divi);
  }

  const vivas: Quitadas = { ...quitadas };
  const lista: DiviGuardado[] = [];
  for (const divi of porCodigo.values()) {
    if (quitada(divi, vivas)) continue;
    // Se ha vuelto a entrar después de quitarla: vuelve, y la marca sobra.
    delete vivas[divi.code];
    lista.push(divi);
  }
  lista.sort((x, y) => cuando(y.at) - cuando(x.at));

  return { divis: lista.slice(0, tope), quitadas: recorta(vivas) };
}

/** Sólo las marcas más recientes, para que el documento no crezca sin fin. */
function recorta(quitadas: Quitadas): Quitadas {
  const entradas = Object.entries(quitadas)
    .filter(([, iso]) => !Number.isNaN(cuando(iso)))
    .sort((x, y) => cuando(y[1]) - cuando(x[1]))
    .slice(0, TOPE_QUITADAS);
  return Object.fromEntries(entradas);
}

/** Lo que llega de fuera como marcas: sólo códigos con pinta de código y fechas de verdad. */
export function limpiaQuitadas(raw: unknown): Quitadas {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return {};
  const limpio: Quitadas = {};
  for (const [code, iso] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^[A-Z0-9]{4,12}$/.test(code) || typeof iso !== "string") continue;
    if (Number.isNaN(cuando(iso))) continue;
    limpio[code] = iso;
  }
  return recorta(limpio);
}
