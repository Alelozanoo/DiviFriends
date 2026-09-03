import { firestore } from "./firebaseAdmin";

/**
 * Las cuentas de la casa, parte segunda: lo que pasa con las cuentas de la
 * gente. Cuántos entran con Google, cuántos eligen usuario, cuántos se hacen
 * amigos, cuántas invitaciones y cuántos correos, y de esos cuántos salieron
 * de verdad y cuántos se quedaron en un freno.
 *
 * Vive aparte de `lib/metricas.ts` a propósito: aquello resume comandas y esto
 * resume cuentas, y son dos colecciones que no se tocan. Cada número de aquí
 * es una consulta con tope, para que el día que haya miles de cuentas la
 * página de métricas siga siendo una página y no una factura.
 */

export interface MetricasCuentas {
  cuentas: {
    total: number;
    semana: number;
    hoy: number;
    conUsuario: number;
    conFoto: number;
    conBizum: number;
    correosApagados: number;
    porDia: { etiqueta: string; n: number }[];
  };
  amigos: {
    /** Amistades de verdad: cada una está escrita en los dos lados. */
    amistades: number;
    /** Solicitudes que alguien todavía no ha aceptado. */
    pendientes: number;
  };
  mesas: {
    /** Asientos reservados por un amigo («te han metido en»). */
    invitados: number;
    /** Asientos que alguien con cuenta se cogió él mismo. */
    propios: number;
    /** De los invitados, cuántos llegaron a abrir la mesa. */
    abiertos: number;
  };
  correos: {
    total: number;
    semana: number;
    hoy: number;
    porEstado: { etiqueta: string; n: number }[];
    porTipo: { etiqueta: string; n: number }[];
    /** El freno global del día: lo gastado y el tope. */
    tope: { hechos: number; max: number };
  };
}

const DIA = 86_400_000;
const ZONA = "Europe/Madrid";
const TOPE = 5000;

const ESTADOS: Record<string, string> = {
  mandado: "salió por correo",
  "sin-correo": "sin buzón configurado",
  baja: "avisos apagados",
  tope: "frenado por el tope",
  fallo: "el buzón lo rechazó",
};

const TIPOS: Record<string, string> = {
  invitacion: "te han metido en una mesa",
  cierre: "se ha cerrado la mesa",
  pago: "te han pagado",
  solicitud: "solicitud de amistad",
};

/** El día de Madrid de una fecha, como «2026-09-02». */
function diaDe(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function etiquetaCorta(clave: string): string {
  const [, m, d] = clave.split("-");
  return `${Number(d)}/${Number(m)}`;
}

export async function metricasCuentas(
  ahora = new Date(),
): Promise<MetricasCuentas> {
  const db = firestore();
  const hoy = diaDe(ahora.toISOString());
  const hace7 = new Date(ahora.getTime() - 7 * DIA).toISOString();

  const [users, correos, invitaciones, amigos, freno] = await Promise.all([
    db.collection("users").limit(TOPE).get(),
    db.collection("correos").limit(TOPE).get(),
    db.collection("invitaciones").limit(TOPE).get(),
    db.collectionGroup("amigos").limit(TOPE).get(),
    db.collection("limits").doc("correo_global_dia").get(),
  ]);

  /* ------------------------------------------------------------ cuentas */
  const creadas = users.docs
    .map((d) => (d.get("creada") as string) ?? "")
    .filter(Boolean);
  const ultimos14 = new Map<string, number>();
  for (let i = 13; i >= 0; i--)
    ultimos14.set(diaDe(new Date(ahora.getTime() - i * DIA).toISOString()), 0);
  for (const c of creadas) {
    const k = diaDe(c);
    if (ultimos14.has(k)) ultimos14.set(k, (ultimos14.get(k) ?? 0) + 1);
  }

  const cuentas = {
    total: users.size,
    semana: creadas.filter((c) => c >= hace7).length,
    hoy: creadas.filter((c) => diaDe(c) === hoy).length,
    conUsuario: users.docs.filter((d) => typeof d.get("usuario") === "string")
      .length,
    conFoto: users.docs.filter((d) => Boolean(d.get("perfil")?.avatar)).length,
    conBizum: users.docs.filter((d) =>
      Boolean(d.get("perfil")?.bizum || d.get("perfil")?.revolut),
    ).length,
    correosApagados: users.docs.filter((d) => d.get("avisos") === false).length,
    porDia: [...ultimos14].map(([k, n]) => ({ etiqueta: etiquetaCorta(k), n })),
  };

  /* ------------------------------------------------------------- amigos */
  const aceptadas = amigos.docs.filter(
    (d) => d.get("estado") === "aceptado",
  ).length;
  const pendientes = amigos.docs.filter(
    (d) => d.get("estado") === "pendiente",
  ).length;

  /* -------------------------------------------------------------- mesas */
  const invitados = invitaciones.docs.filter(
    (d) => d.get("por") && d.get("por") !== d.get("uid"),
  );
  const mesas = {
    invitados: invitados.length,
    propios: invitaciones.size - invitados.length,
    abiertos: invitados.filter((d) => d.get("visto") === true).length,
  };

  /* ------------------------------------------------------------ correos */
  const cuando = (d: FirebaseFirestore.QueryDocumentSnapshot) =>
    (d.get("cuando") as string) ?? "";
  const cuenta = (campo: string, nombres: Record<string, string>) => {
    const m = new Map<string, number>();
    for (const d of correos.docs) {
      // Los primeros avisos se apuntaron sin `tipo`: la clave lo lleva delante del punto.
      const v =
        (d.get(campo) as string) ??
        (campo === "tipo"
          ? (d.get("clave") as string | undefined)?.split(".")[0]
          : undefined) ??
        "?";
      m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m]
      .map(([v, n]) => ({ etiqueta: nombres[v] ?? v, n }))
      .sort((a, b) => b.n - a.n);
  };
  const contador = freno.data() as
    { count?: number; windowStart?: number } | undefined;
  const vivo =
    contador?.windowStart != null &&
    ahora.getTime() - contador.windowStart < DIA;

  const correosResumen = {
    total: correos.size,
    semana: correos.docs.filter((d) => cuando(d) >= hace7).length,
    hoy: correos.docs.filter((d) => diaDe(cuando(d) || "1970-01-01") === hoy)
      .length,
    porEstado: cuenta("estado", ESTADOS),
    porTipo: cuenta("tipo", TIPOS),
    tope: {
      hechos: vivo ? (contador?.count ?? 0) : 0,
      max: Number(process.env.CORREO_TOPE_DIA ?? 60),
    },
  };

  return {
    cuentas,
    // Cada amistad está escrita en los dos lados: la mitad son amistades.
    amigos: {
      amistades: Math.floor(aceptadas / 2),
      pendientes: Math.floor(pendientes / 2),
    },
    mesas,
    correos: correosResumen,
  };
}
