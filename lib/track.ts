/**
 * El píxel de Meta, en un solo sitio.
 *
 * Sin `NEXT_PUBLIC_META_PIXEL_ID` no se carga nada y todas estas llamadas se
 * quedan en nada: la app funciona igual sin píxel, como ya pasa con Firebase
 * y con la clave de Anthropic. Así el repo se puede clonar y arrancar sin
 * tener cuenta de anuncios.
 *
 * Aquí no se manda ni un dato de la mesa: ni nombres, ni importes, ni el
 * código de la comanda. Sólo que algo ha pasado.
 */

import { leer } from "./consent";

type Params = Record<string, string | number | boolean>;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

/**
 * Los seis momentos que hay que medir.
 *
 * Donde la semántica de Meta encaja se usa su evento estándar, porque se
 * puede optimizar en la campaña sin configurar nada. Donde no encaja ninguno
 * —compartir la mesa, mirar las cuentas— va un evento propio, y ésos hay que
 * convertirlos en «conversión personalizada» en el Administrador de Eventos
 * antes de poder optimizar por ellos.
 */
export const EV = {
  /** Alguien abre una mesa: por el enlace, por el QR o con el código. */
  abreMesa: "ViewContent",
  /** Se apunta con su nombre. El primer acto voluntario de la cadena. */
  seApunta: "CompleteRegistration",
  /** Marca su primer plato: ya está usando la app, no mirándola. */
  marcaPlato: "AddToCart",
  /** Crea un divi. La conversión que de verdad importa. */
  creaDivi: "Lead",
  /** Añade otro ticket al mismo divi. */
  anadeTicket: "TicketAnadido",
  /** Pasa el enlace al grupo: es lo que hace crecer esto solo. */
  comparte: "MesaCompartida",
  /** Abre la pantalla de cuentas. */
  veCuentas: "CuentasVistas",
} as const;

/** Los que Meta ya conoce. El resto van como `trackCustom`. */
const ESTANDAR = new Set<string>([
  EV.abreMesa,
  EV.seApunta,
  EV.marcaPlato,
  EV.creaDivi,
]);

export function track(event: string, params?: Params): void {
  if (typeof window === "undefined" || !window.fbq) return;
  // Si alguien cambia de idea a mitad de sesión, `fbq` sigue cargado en
  // memoria: sin esto, seguiría midiendo a quien ya ha dicho que no.
  if (leer() !== "si") return;
  window.fbq(ESTANDAR.has(event) ? "track" : "trackCustom", event, params);
}

/**
 * Una sola vez por carga de página.
 *
 * Marcar platos son veinte toques seguidos y abrir cuentas se hace cada dos
 * minutos: sin esto, un solo divi mandaría cien eventos y el coste por
 * conversión de la campaña saldría regalado y falso.
 */
const enviados = new Set<string>();

export function trackOnce(clave: string, event: string, params?: Params): void {
  if (enviados.has(clave)) return;
  enviados.add(clave);
  track(event, params);
}
