/**
 * Cómo se le devuelve el dinero a quien puso la cuenta.
 *
 * DiviFriends no toca un euro en ningún momento: lo único que hace es abrir la
 * app del otro con el importe y el concepto ya escritos. Por eso aquí no hay
 * ninguna clave ni ninguna llamada a nadie — son cuatro funciones que arman un
 * enlace y limpian lo que teclea la gente.
 */

export type Via = "revolut" | "bizum";

/**
 * El usuario de Revolut, venga como venga.
 *
 * La gente lo copia de sitios muy distintos: «@alex», «revolut.me/alex», el
 * enlace entero con https y barra final. Todas esas formas son la misma
 * persona, así que se quedan en una.
 */
export function limpiaRevolut(raw: string): string | null {
  const user = raw
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^revolut\.me\//i, "")
    .replace(/[/?#].*$/, "")
    .replace(/^@/, "");
  // Revolut admite letras, números, punto y guion bajo. Un espacio o una eñe
  // significan que han pegado otra cosa —su nombre, normalmente—, y más vale
  // decirlo ahora que dejar un botón de pagar que lleva a una página vacía.
  return /^[a-zA-Z0-9._]{3,32}$/.test(user) ? user : null;
}

/**
 * El móvil del Bizum, en nueve dígitos.
 *
 * Se acepta con prefijo, con espacios o con guiones porque así es como sale de
 * la agenda, pero se guarda desnudo: es lo que hay que pegar en la app del
 * banco. Sólo móviles, que es lo único que Bizum admite.
 */
export function limpiaTelefono(raw: string): string | null {
  const solo = raw.replace(/[\s.\-()]/g, "").replace(/^(\+34|0034|34)/, "");
  return /^[67]\d{8}$/.test(solo) ? solo : null;
}

/** Cómo se enseña un móvil: 600 11 22 33, que es como se lee en voz alta. */
export function telefonoBonito(tel: string): string {
  return tel.replace(/^(\d{3})(\d{2})(\d{2})(\d{2})$/, "$1 $2 $3 $4");
}

/**
 * El concepto que verá quien cobra, en su app y en su extracto.
 *
 * Lleva el sitio porque el que adelantó la cena necesita saber de cuál de las
 * dos cenas de esta semana es cada ingreso, y lleva la marca porque cada pago
 * es una recomendación gratis a alguien que todavía no nos conoce.
 *
 * El tope son 64 caracteres: es lo que admite el campo de Revolut, y pasarse
 * significaría que lo corta él por donde quiera.
 */
export const TOPE_CONCEPTO = 64;

export function conceptoDe(place: string | null | undefined): string {
  const marca = " · DiviFriends";
  const sitio = (place ?? "").trim();
  if (!sitio) return "DiviFriends";
  return `${sitio.slice(0, TOPE_CONCEPTO - marca.length)}${marca}`;
}

/**
 * El enlace de pago de Revolut con todo puesto.
 *
 * Los tres parámetros son los que lee su web: `amount` en la unidad pequeña de
 * la divisa —céntimos, que es justo como los guardamos—, `currency` con un
 * código que ellos reconozcan, y `note`, el concepto.
 *
 * Ojo con `amount`: sólo admite enteros. Mandar «12.50» se leería como 12, así
 * que los céntimos van tal cual y sin tocar nada por el camino.
 */
export function enlaceRevolut(user: string, cents: number, currency: string, nota: string): string {
  const params = new URLSearchParams({
    amount: String(Math.max(1, Math.round(cents))),
    currency: (currency || "EUR").toUpperCase(),
    note: nota.slice(0, TOPE_CONCEPTO),
  });
  return `https://revolut.me/${encodeURIComponent(user)}?${params}`;
}

/** Lo que hay que pegar en la app del banco, porque Bizum no tiene enlace. */
export function pasosBizum(tel: string, cents: number, nota: string) {
  return {
    telefono: telefonoBonito(tel),
    telefonoPlano: tel,
    nota: nota.slice(0, TOPE_CONCEPTO),
    cents,
  };
}
