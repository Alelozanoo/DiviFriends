"use client";
import { rellena } from "./i18n";
import type { Dict } from "./i18n/es";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Las comandas por las que has pasado, guardadas en este móvil.
 *
 * Se guarda ya calculado —tu saldo, a quién se lo debes, las caras de la
 * mesa— en vez de sólo el código. Es a propósito: la portada carga hoy en
 * 128 ms sin tocar Firebase, y pedirle al servidor el estado de cinco
 * comandas al abrirla serían cinco peticiones contra un backend que arranca
 * en frío en casi dos segundos. Se cargaría lo mejor que tiene esa página.
 *
 * El precio es que puede quedar desfasado si alguien toca la comanda después
 * de que te fueras. Por eso la fecha se enseña siempre: no es decoración,
 * dice que esto es una foto de aquel momento.
 *
 * Vive sólo aquí. Ni se manda al servidor ni hay cuenta que lo sincronice, así
 * que se pierde al borrar los datos del navegador — y Safari lo borra solo tras
 * unos días sin visitar la web. Es una comodidad, no un archivo.
 */

const CLAVE = "divi.mis-divis";
export const EVENTO = "divi:mis-divis";
/**
 * Doce eran «lo de este fin de semana», que es para lo que servía la lista.
 * El resumen del mes pregunta otra cosa —cuánto has puesto y cuánto te deben—
 * y con doce se queda corto en cuanto alguien sale dos veces por semana. La
 * portada sigue enseñando tres y un «ver todas»: esto es memoria, no lista.
 */
const TOPE = 30;

export interface DiviGuardado {
  code: string;
  place: string | null;
  /** ISO de la última vez que estuviste dentro. */
  at: string;
  currency: string;
  /** Tu saldo. Positivo = debes; negativo = te deben; 0 = no hay nada tuyo. */
  cents: number;
  /** A quién le debes, cuando es a una sola persona. */
  aQuien: string | null;
  saldado: boolean;
  /** Sólo lo justo para pintar las caras. */
  gente: { name: string; color: string; avatar?: string }[];

  /*
    Lo que sigue lo pide el resumen del mes, y por eso va con interrogante:
    las divis que ya estaban guardadas antes de que existiera no lo traen, y
    valen igual para lo suyo. Al volver a abrir una, se completa sola.
  */

  /** Lo que pusiste tú en la barra. Cero si pagó otro. */
  puestoCents?: number;
  /** Lo que consumiste tú, con tu parte del servicio o el descuento. */
  mioCents?: number;
  /** Quién te debe de esta mesa, y si ya te lo ha devuelto. */
  deudas?: { name: string; cents: number; pagado: boolean }[];
  /**
   * Cuándo fue la mesa.
   *
   * No vale `at` para esto: `at` es la última vez que entraste, y abrir en
   * octubre la cena de septiembre la mudaría de mes entero, con sus cifras.
   */
  creada?: string;
}

function leerCrudo(): DiviGuardado[] {
  try {
    const raw = window.localStorage.getItem(CLAVE);
    if (!raw) return [];
    const datos = JSON.parse(raw) as unknown;
    // Cualquier cosa rara se descarta entera antes que pintar basura en la
    // portada: esto lo escribe una versión anterior de la propia app.
    if (!Array.isArray(datos)) return [];
    return datos.filter(
      (d): d is DiviGuardado =>
        typeof d === "object" && d !== null && typeof (d as DiviGuardado).code === "string",
    );
  } catch {
    // Navegación privada con el almacenamiento capado, o JSON roto.
    return [];
  }
}

function guardar(lista: DiviGuardado[]): void {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    // Sin sitio o sin permiso: la app funciona igual, sólo que sin memoria.
  }
  window.dispatchEvent(new CustomEvent(EVENTO));
}

/** Apunta —o pone al día— una comanda. La más reciente queda arriba. */
export function recordar(divi: DiviGuardado): void {
  const resto = leerCrudo().filter((d) => d.code !== divi.code);
  guardar([divi, ...resto].slice(0, TOPE));
}

export function olvidar(code: string): void {
  guardar(leerCrudo().filter((d) => d.code !== code));
}

export function olvidarTodo(): void {
  guardar([]);
}

/** La lista tal cual está, para mandársela a la cuenta. */
export function todos(): DiviGuardado[] {
  return leerCrudo();
}

/**
 * Mete las divis de la cuenta en las del móvil.
 *
 * Por código, y la que se vio más tarde manda: es la misma regla que aplica el
 * servidor, para que dé igual desde qué lado llegue el cambio. Sólo escribe si
 * de verdad cambia algo; si no, el evento haría que la cuenta se volviera a
 * mandar a sí misma en bucle.
 */
export function fundir(remotas: DiviGuardado[]): void {
  const locales = leerCrudo();
  const porCodigo = new Map<string, DiviGuardado>();
  for (const divi of [...locales, ...remotas]) {
    const previa = porCodigo.get(divi.code);
    if (!previa || new Date(divi.at).getTime() >= new Date(previa.at).getTime()) {
      porCodigo.set(divi.code, divi);
    }
  }
  const lista = [...porCodigo.values()]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, TOPE);
  if (JSON.stringify(lista) !== JSON.stringify(locales)) guardar(lista);
}

/* ------------------------------------------------------------------ react */

const oyentes = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  oyentes.add(listener);
  window.addEventListener(EVENTO, listener);
  // "storage" cubre tener la web abierta en dos pestañas.
  window.addEventListener("storage", listener);
  return () => {
    oyentes.delete(listener);
    window.removeEventListener(EVENTO, listener);
    window.removeEventListener("storage", listener);
  };
}

/*
  `useSyncExternalStore` exige que dos lecturas seguidas devuelvan lo mismo o
  se queda repintando sin parar, y `JSON.parse` crea un array nuevo cada vez.
  Se cachea por el texto crudo: mientras no cambie, se devuelve el mismo objeto.
*/
let ultimoTexto: string | null = null;
let ultimaLista: DiviGuardado[] = [];

function instantanea(): DiviGuardado[] {
  const texto = (() => {
    try {
      return window.localStorage.getItem(CLAVE);
    } catch {
      return null;
    }
  })();
  if (texto !== ultimoTexto) {
    ultimoTexto = texto;
    ultimaLista = leerCrudo();
  }
  return ultimaLista;
}

/** `null` mientras se pinta en el servidor y durante la hidratación. */
export function useMisDivis(): { divis: DiviGuardado[] | null; quitar: (code: string) => void } {
  const divis = useSyncExternalStore(subscribe, instantanea, () => null);
  const quitar = useCallback((code: string) => olvidar(code), []);
  return { divis, quitar };
}

/**
 * «hace 2 h», «ayer», «12 ago».
 *
 * Lo que se pregunta al mirar la lista es si esto es de hoy o de la semana
 * pasada, no la hora exacta. Pasado el día, lo relativo deja de decir nada.
 */
export function cuando(iso: string, t: Dict): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "";

  const min = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (min < 1) return t.misDivis.ahoraMismo;
  if (min < 60) return rellena(t.misDivis.haceMin, { n: min });
  if (min < 60 * 24) return rellena(t.misDivis.haceH, { n: Math.floor(min / 60) });

  // Por días de calendario, no por horas: a las 2 de la mañana, lo de anoche
  // es «ayer» aunque hayan pasado cuatro horas.
  const hoy = new Date();
  const dias = Math.round(
    (new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime() -
      new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()).getTime()) /
      86_400_000,
  );
  if (dias === 1) return t.misDivis.ayer;
  if (dias < 7) return rellena(t.misDivis.haceDias, { n: dias });
  return fecha.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
