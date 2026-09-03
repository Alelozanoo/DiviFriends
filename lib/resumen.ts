import type { DiviGuardado } from "./misDivis";

/**
 * Las cuentas del mes, sacadas de las divis que ya llevas guardadas.
 *
 * No pregunta nada al servidor: cada divi deja apuntado al salir lo que
 * pusiste, lo que era tuyo y quién te debe, así que esto es sumar. El precio
 * es el mismo que el de la lista de la portada —es una foto de aquel momento,
 * y si alguien pagó después de que te fueras, aquí sigue debiendo hasta que
 * vuelvas a abrirla—, y por eso la pantalla enseña siempre la fecha.
 *
 * Las divis guardadas antes de que esto existiera no traen esos campos. No se
 * inventan: se quedan fuera de las sumas y la pantalla dice cuántas son, que
 * es más honrado que enseñar un mes que empieza a mitad.
 */

export interface Cuentas {
  /** Lo que pusiste tú en la barra. */
  puestoCents: number;
  /** De eso, lo que te comiste tú. */
  mioCents: number;
  /** Lo que ya te han devuelto. */
  vueltoCents: number;
  /** Lo que falta por volver. */
  debenCents: number;
  /** Cuántas mesas entran en la cuenta. */
  divis: number;
  /** Cuántas quedan fuera por ser de antes. */
  sinDatos: number;
  currency: string;
}

export interface Linea {
  code: string;
  /** Quién debe, o a quién debes. */
  name: string;
  place: string | null;
  cents: number;
  at: string;
  currency: string;
}

const VACIO: Cuentas = {
  puestoCents: 0,
  mioCents: 0,
  vueltoCents: 0,
  debenCents: 0,
  divis: 0,
  sinDatos: 0,
  currency: "EUR",
};

/** Cuándo fue la mesa: la fecha de la mesa, y sólo si falta, la de la visita. */
export function fechaDe(divi: DiviGuardado): string {
  const creada = divi.creada ? new Date(divi.creada) : null;
  return creada && !Number.isNaN(creada.getTime()) ? divi.creada! : divi.at;
}

function delMismoMes(iso: string, ref: Date): boolean {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha.getFullYear() === ref.getFullYear() && fecha.getMonth() === ref.getMonth();
}

/** Si una divi trae ya lo que hace falta para sumar. */
function tieneDatos(divi: DiviGuardado): boolean {
  return divi.puestoCents !== undefined || divi.deudas !== undefined;
}

/**
 * Lo puesto y lo devuelto en un mes.
 *
 * Sólo en una moneda: sumar euros con libras da un número que no es nada. Se
 * queda con la de la mesa más reciente del mes, que es la que la pantalla va a
 * escribir al lado de la cifra.
 */
export function delMes(divis: DiviGuardado[], ref: Date = new Date()): Cuentas {
  const mes = divis.filter((d) => delMismoMes(fechaDe(d), ref));
  if (mes.length === 0) return VACIO;

  const ordenadas = [...mes].sort(
    (a, b) => new Date(fechaDe(b)).getTime() - new Date(fechaDe(a)).getTime(),
  );
  const currency = ordenadas[0].currency || "EUR";
  const cuentan = ordenadas.filter((d) => d.currency === currency && tieneDatos(d));

  return cuentan.reduce<Cuentas>(
    (a, d) => {
      const deudas = d.deudas ?? [];
      return {
        puestoCents: a.puestoCents + (d.puestoCents ?? 0),
        mioCents: a.mioCents + (d.mioCents ?? 0),
        vueltoCents:
          a.vueltoCents + deudas.reduce((s, x) => (x.pagado ? s + x.cents : s), 0),
        debenCents: a.debenCents + deudas.reduce((s, x) => (x.pagado ? s : s + x.cents), 0),
        divis: a.divis + 1,
        sinDatos: a.sinDatos,
        currency,
      };
    },
    { ...VACIO, currency, sinDatos: ordenadas.filter((d) => !tieneDatos(d)).length },
  );
}

/**
 * Quién te debe, de cualquier fecha y de más a menos.
 *
 * Sin límite de mes a propósito: lo que se pregunta al abrir esto no es «qué
 * pasó en septiembre» sino «quién me debe todavía», y una deuda de hace seis
 * semanas sigue siendo una deuda.
 */
export function teDeben(divis: DiviGuardado[]): Linea[] {
  return divis
    .flatMap((d) =>
      (d.deudas ?? [])
        .filter((x) => !x.pagado && x.cents > 0)
        .map((x) => ({
          code: d.code,
          name: x.name,
          place: d.place,
          cents: x.cents,
          at: fechaDe(d),
          currency: d.currency || "EUR",
        })),
    )
    .sort((a, b) => b.cents - a.cents);
}

/** Y lo que debes tú, que es la otra mitad de la pregunta. */
export function debes(divis: DiviGuardado[]): Linea[] {
  return divis
    .filter((d) => d.cents > 0 && !d.saldado)
    .map((d) => ({
      code: d.code,
      name: d.aQuien ?? "",
      place: d.place,
      cents: d.cents,
      at: fechaDe(d),
      currency: d.currency || "EUR",
    }))
    .sort((a, b) => b.cents - a.cents);
}
