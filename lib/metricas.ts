import type { TicketDoc } from "./ticketDoc";

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
  personas: { media: number; solo: number; dosOMas: number; tresOMas: number };
  recibos: { media: number; conVarios: number };
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
  let conPagador = 0;
  let saldados = 0;
  let repartidos = 0;

  for (const doc of docs) {
    const { hora, diaSemana, clave } = enMadrid(doc.createdAt);
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1);
    porFranja[franja(hora)] += 1;
    semanaCuenta[diaSemana] += 1;
    if (clave === hoyClave) hoy += 1;
    if (new Date(doc.createdAt).getTime() >= desdeSemana) semana += 1;

    const gente = doc.participants?.length ?? 0;
    personasTotal += gente;
    if (gente <= 1) solo += 1;
    if (gente >= 2) dosOMas += 1;
    if (gente >= 3) tresOMas += 1;

    participantes += gente;
    conAvatar += (doc.participants ?? []).filter((p) => p.avatar).length;

    // Un divi con un solo recibo es lo de siempre; con dos o más es la
    // novedad en uso, que es justo lo que hay que vigilar.
    const recibos = Math.max(1, doc.receipts?.length ?? 0);
    recibosTotal += recibos;
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
  }

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
    },
    recibos: { media: media(recibosTotal, total), conVarios: pct(conVariosRecibos, total) },
    avatares: pct(conAvatar, participantes),
    conPagador: pct(conPagador, total),
    saldados: pct(saldados, total),
    repartidos: pct(repartidos, total),
    lineas: media(lineasTotal, total),
    porFranja,
    porDiaSemana,
  };
}
