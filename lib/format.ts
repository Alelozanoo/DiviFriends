/** Sin I, O, 0, 1: se confunden al teclear el código a mano. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function ticketCode(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function id(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function money(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * La cantidad de una línea, tal y como venía en el papel.
 *
 * En un bar son unidades enteras —«2 cañas»— pero en una carnicería la
 * cantidad es un peso, y el ticket trae 1,025 de entrañas. Sin pasar por aquí
 * se escribía tal cual sale de JavaScript, con punto, que en español es el
 * separador de los miles: «1.025» se lee mil veinticinco.
 *
 * Sin ceros de relleno a la derecha: «1,5» y no «1,500».
 */
export function quantity(qty: number): string {
  if (!Number.isFinite(qty) || qty <= 0) return "1";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 3 }).format(qty);
}

/** "12,50" o "12.50" -> 1250 céntimos. */
export function parseMoney(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  if (typeof input === "number") return Math.round(input * 100);
  const cleaned = input.trim().replace(/[^\d,.-]/g, "");
  // Si hay coma y punto, el último separador es el decimal.
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;
  if (lastComma > -1 && lastDot > -1) {
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    normalized = cleaned.replace(",", ".");
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export const PALETTE = [
  "#e8b04b",
  "#5ec5c0",
  "#e0705f",
  "#8b9dde",
  "#c187d4",
  "#7fb069",
  "#e79bb4",
  "#d4a373",
  "#6aa9e0",
  "#b0b84f",
];

export function colorFor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

/**
 * La inicial con la que se marca a alguien que todavía no ha puesto foto.
 *
 * Devolvía dos letras —«AL», «RO», «NU»— y dos letras dentro de un círculo de
 * color plano es el marcador de posición de toda la vida: es lo que pinta el
 * correo cuando no sabe quién eres. Con una sola letra el círculo deja de
 * parecer un hueco por rellenar y pasa a parecer una marca, que es lo que es.
 *
 * A quién es quién no le afecta: el color ya es único por persona, y el nombre
 * va escrito al lado en todas las listas. Donde sí se nota es en los avatares
 * de veinte píxeles de una fila de la comanda, que es donde salen solos: dos
 * letras ahí caían a diez píxeles y no se leían.
 */
export function initials(name: string): string {
  const limpio = name.trim();
  if (!limpio) return "?";
  return [...limpio][0].toUpperCase();
}
