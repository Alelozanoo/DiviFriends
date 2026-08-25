import { COSTE_POR_LECTURA } from "./rateLimit";
import type { EventDoc, TicketDoc } from "./ticketDoc";

/**
 * Las cuentas de la casa: lo que se puede saber mirando lo que ya está
 * guardado, sin cookies, sin píxel y sin mandarle nada a nadie.
 *
 * Es una función pura sobre los documentos de Firestore —igual que
 * `settle.ts`— así que se puede probar sin base de datos delante.
 *
 * **Lo que esto no puede saber:** si alguien vuelve. Una comanda no guarda
 * quién la creó más allá de esa mesa, así que no hay forma de decir que el
 * divi del sábado y el del sábado siguiente son de la misma persona. Para eso
 * haría falta un identificador anónimo en el navegador, que es otro asunto.
 */

export type Franja = "madrugada" | "mañana" | "tarde" | "noche";

export interface Metricas {
  total: number;
  hoy: number;
  semana: number;
  /** Últimos 14 días, del más viejo al más nuevo. */
  porDia: { etiqueta: string; n: number }[];
  personas: {
    media: number;
    solo: number;
    dosOMas: number;
    tresOMas: number;
    /**
     * Cuánta gente se ha apuntado a un divi, sumando todas las mesas.
     *
     * **No son personas distintas.** Quien hace un divi el sábado y otro el
     * domingo cuenta dos veces, porque una comanda no guarda quién la abrió más
     * allá de esa mesa. Es el techo del número de usuarios, no el número.
     */
    total: number;
    hoy: number;
    semana: number;
  };
  /**
   * Cuántos divis llegan a cada paso, del primero al último.
   *
   * Es la respuesta a «¿la usan o entran a mirar?»: la caída entre «se crea» y
   * «alguien coge algo» son los que se asomaron y se fueron.
   */
  embudo: { etiqueta: string; n: number; pct: number }[];
  /** Los divis que nadie llegó a usar. */
  curiosos: {
    /** Nadie se apuntó ni cogió nada. */
    vacios: number;
    /** No se volvieron a tocar después de crearse. */
    efimeros: number;
    /** Mediana de lo que pasa entre que se crea un divi y su último cambio. */
    medianaMinutos: number;
  };
  /** Qué se hace dentro de un divi, contando los cambios que quedan grabados. */
  acciones: { etiqueta: string; n: number }[];
  recibos: { media: number; conVarios: number };
  /**
   * Lo que cuesta leer tickets, que es el único gasto que crece con la gente.
   *
   * En dólares, que es como facturan Google y Anthropic: pasarlo a euros aquí
   * sería inventarse un cambio y que la página no cuadrase con el recibo.
   *
   * **Es un techo, no una factura.** Se cuenta una lectura por cada papel de
   * cada divi, y una comanda escrita a mano no llamó a nadie ni costó nada. Por
   * el otro lado se queda corto: las fotos que el modelo no supo leer se
   * pagaron igual y no dejaron comanda que contar. El número exacto del día lo
   * tiene el contador del tope, en `lecturasDelDia`.
   */
  coste: {
    /** Dólares por lectura, con el modelo que esté puesto ahora mismo. */
    porLectura: number;
    lecturas: { hoy: number; semana: number; total: number };
    hoy: number;
    semana: number;
    total: number;
  };
  /** Cuántos de los que se apuntan eligen bicho. */
  avatares: number;
  /** Divis con alguien marcado como pagador. */
  conPagador: number;
  /** Divis donde ya no queda nadie por devolver. */
  saldados: number;
  /** Divis en los que todas las líneas tienen dueño. */
  repartidos: number;
  /** Media de líneas por comanda. */
  lineas: number;
  porFranja: Record<Franja, number>;
  porDiaSemana: { etiqueta: string; n: number }[];
}

const DIA = 86_400_000;
const ZONA = "Europe/Madrid";

/** La hora y el día tal y como los vive la mesa, no en UTC. */
function enMadrid(iso: string): { hora: number; diaSemana: number; clave: string } {
  const fecha = new Date(iso);
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone: ZONA,
    hour: "2-digit",
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(fecha);
  const get = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  const dias = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    hora: Number(get("hour")),
    diaSemana: Math.max(0, dias.indexOf(get("weekday"))),
    clave: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function franja(hora: number): Franja {
  if (hora < 6) return "madrugada";
  if (hora < 12) return "mañana";
  if (hora < 19) return "tarde";
  return "noche";
}

/**
 * Cómo se lee cada tipo de cambio del historial.
 *
 * Escrito a mano y no a partir del nombre técnico porque esta página la mira
 * una persona: «item.add» no dice nada y «añaden una línea» sí.
 */
const ACCIONES: Record<EventDoc["kind"], string> = {
  "item.add": "Añaden una línea",
  "item.remove": "Quitan una línea",
  "total.edit": "Corrigen el total",
  "payer.set": "Marcan quién pagó",
  "pago.ok": "Anuncian un pago",
  "mesa.nombre": "Ponen nombre a la mesa",
};

const pct = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte / total) * 100));
const media = (suma: number, total: number) => (total === 0 ? 0 : suma / total);

export function resumen(docs: TicketDoc[], ahora = new Date()): Metricas {
  const total = docs.length;

  // ── cuántos y cuándo ──────────────────────────────────────────────
  const hoyClave = enMadrid(ahora.toISOString()).clave;
  const desdeSemana = ahora.getTime() - 7 * DIA;

  const cuenta = new Map<string, number>();
  const porFranja: Record<Franja, number> = { madrugada: 0, mañana: 0, tarde: 0, noche: 0 };
  const semanaCuenta = [0, 0, 0, 0, 0, 0, 0];
  let hoy = 0;
  let semana = 0;

  // ── qué pasa dentro ───────────────────────────────────────────────
  let personasTotal = 0;
  let recibosTotal = 0;
  let lineasTotal = 0;
  let participantes = 0;
  let conAvatar = 0;
  let solo = 0;
  let dosOMas = 0;
  let tresOMas = 0;
  let conVariosRecibos = 0;
  let recibosHoy = 0;
  let recibosSemana = 0;
  let conPagador = 0;
  let saldados = 0;
  let repartidos = 0;
  let personasHoy = 0;
  let personasSemana = 0;
  let conGente = 0;
  let conReparto = 0;
  let conPago = 0;
  let vacios = 0;
  let efimeros = 0;
  const vidas: number[] = [];
  const acciones = new Map<EventDoc["kind"], number>();

  for (const doc of docs) {
    const { hora, diaSemana, clave } = enMadrid(doc.createdAt);
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
    porFranja[franja(hora)] += 1;
    semanaCuenta[diaSemana] += 1;
    const esDeHoy = clave === hoyClave;
    const esDeLaSemana = new Date(doc.createdAt).getTime() >= desdeSemana;
    if (esDeHoy) hoy += 1;
    if (esDeLaSemana) semana += 1;

    const gente = doc.participants?.length ?? 0;
    personasTotal += gente;
    if (esDeHoy) personasHoy += gente;
    if (esDeLaSemana) personasSemana += gente;
    if (gente <= 1) solo += 1;
    if (gente >= 2) dosOMas += 1;
    if (gente >= 3) tresOMas += 1;

    participantes += gente;
    conAvatar += (doc.participants ?? []).filter((p) => p.avatar).length;

    // Un divi con un solo recibo es lo de siempre; con dos o más es la
    // novedad en uso, que es justo lo que hay que vigilar.
    //
    // El ticket con el que nace la mesa no está en `receipts` —sus líneas son
    // las que no llevan `receiptId`—, así que los papeles son ese más los que
    // se hayan añadido después. Contando sólo el array, un divi de dos tickets
    // parecía de uno y «con varios» empezaba a los tres.
    const recibos = 1 + (doc.receipts?.length ?? 0);
    recibosTotal += recibos;
    if (esDeHoy) recibosHoy += recibos;
    if (esDeLaSemana) recibosSemana += recibos;
    if (recibos >= 2) conVariosRecibos += 1;

    lineasTotal += doc.items?.length ?? 0;

    const pagadores = new Set(
      [doc.payerId, ...(doc.receipts ?? []).map((r) => r.payerId)].filter(Boolean),
    );
    const pagadorLegacy = (doc.participants ?? []).some((p) => p.isPayer);
    if (pagadores.size > 0 || pagadorLegacy) conPagador += 1;

    // Saldado: nadie de la mesa queda por devolver. Si sólo hay una persona
    // no cuenta, porque no hay nada que devolver.
    const deudores = (doc.participants ?? []).filter((p) => !p.isPayer);
    if (gente >= 2 && deudores.length > 0 && deudores.every((p) => p.settled)) saldados += 1;

    // Repartido: ninguna línea se ha quedado sin dueño.
    const tomadas = new Map<string, number>();
    for (const c of doc.claims ?? []) {
      // `units` es como se llamaba antes de hablar de partes: las comandas
      // viejas todavía lo traen y cuentan igual.
      tomadas.set(c.itemId, (tomadas.get(c.itemId) ?? 0) + (c.shares ?? c.units ?? 0));
    }
    const huerfanas = (doc.items ?? []).some(
      (i) => (tomadas.get(i.id) ?? 0) < Math.max(1, i.splitInto),
    );
    if ((doc.items?.length ?? 0) > 0 && !huerfanas) repartidos += 1;

    // ── quién llegó hasta dónde ──────────────────────────────────────
    const cogidas = (doc.claims ?? []).length;
    if (gente >= 1) conGente += 1;
    if (cogidas > 0) conReparto += 1;
    if ((doc.pagos ?? []).length > 0) conPago += 1;
    // Nadie se apuntó y nadie cogió nada: se abrió el divi y ahí se quedó.
    if (gente === 0 && cogidas === 0) vacios += 1;

    // `updatedAt` se reescribe en cada cambio (ver `mutate` en store.ts), así
    // que la distancia con `createdAt` es cuánto tiempo estuvo viva la mesa.
    // Las comandas más viejas pueden no traerlo: sin él se cuenta como cero,
    // que es justo lo que significa —nadie la tocó después de crearla.
    const nacio = new Date(doc.createdAt).getTime();
    const ultimo = new Date(doc.updatedAt ?? doc.createdAt).getTime();
    const vida = Number.isFinite(nacio) && Number.isFinite(ultimo) ? Math.max(0, ultimo - nacio) : 0;
    vidas.push(vida);
    if (vida < 60_000) efimeros += 1;

    for (const evento of doc.events ?? []) {
      acciones.set(evento.kind, (acciones.get(evento.kind) ?? 0) + 1);
    }
  }

  // La mediana y no la media: un solo divi que alguien dejó abierto una semana
  // arrastraría la media y diría que la mesa típica dura días.
  const ordenadas = [...vidas].sort((a, b) => a - b);
  const medianaMinutos = ordenadas.length
    ? Math.round(ordenadas[Math.floor(ordenadas.length / 2)] / 60_000)
    : 0;

  // ── los últimos catorce días, con sus huecos ──────────────────────
  const porDia: { etiqueta: string; n: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dia = new Date(ahora.getTime() - i * DIA);
    const { clave } = enMadrid(dia.toISOString());
    const etiqueta = new Intl.DateTimeFormat("es-ES", {
      timeZone: ZONA,
      day: "numeric",
      month: "numeric",
    }).format(dia);
    porDia.push({ etiqueta, n: cuenta.get(clave) ?? 0 });
  }

  const nombresDia = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const porDiaSemana = [1, 2, 3, 4, 5, 6, 0].map((d) => ({
    etiqueta: nombresDia[d],
    n: semanaCuenta[d],
  }));

  return {
    total,
    hoy,
    semana,
    porDia,
    personas: {
      media: media(personasTotal, total),
      solo: pct(solo, total),
      dosOMas: pct(dosOMas, total),
      tresOMas: pct(tresOMas, total),
      total: personasTotal,
      hoy: personasHoy,
      semana: personasSemana,
    },
    embudo: [
      { etiqueta: "Se crea el divi", n: total },
      { etiqueta: "Alguien se apunta", n: conGente },
      { etiqueta: "Alguien coge algo", n: conReparto },
      { etiqueta: "Son dos o más", n: dosOMas },
      { etiqueta: "Todo repartido", n: repartidos },
      { etiqueta: "Alguien anuncia que paga", n: conPago },
    ].map((paso) => ({ ...paso, pct: pct(paso.n, total) })),
    curiosos: { vacios: pct(vacios, total), efimeros: pct(efimeros, total), medianaMinutos },
    acciones: [...acciones.entries()]
      .map(([kind, n]) => ({ etiqueta: ACCIONES[kind] ?? kind, n }))
      .sort((a, b) => b.n - a.n),
    recibos: { media: media(recibosTotal, total), conVarios: pct(conVariosRecibos, total) },
    coste: {
      porLectura: COSTE_POR_LECTURA,
      lecturas: { hoy: recibosHoy, semana: recibosSemana, total: recibosTotal },
      hoy: recibosHoy * COSTE_POR_LECTURA,
      semana: recibosSemana * COSTE_POR_LECTURA,
      total: recibosTotal * COSTE_POR_LECTURA,
    },
    avatares: pct(conAvatar, participantes),
    conPagador: pct(conPagador, total),
    saldados: pct(saldados, total),
    repartidos: pct(repartidos, total),
    lineas: media(lineasTotal, total),
    porFranja,
    porDiaSemana,
  };
}
