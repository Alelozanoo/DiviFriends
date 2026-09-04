import { NextResponse } from "next/server";
import { fail } from "@/lib/api";
import { esAdmin, usuarioDe } from "@/lib/cuentaServer";
import { firestore, TICKETS } from "@/lib/firebaseAdmin";
import { resumen } from "@/lib/metricas";
import { metricasCuentas } from "@/lib/metricasCuentas";
import { lecturasDelDia, MODELO_LECTOR } from "@/lib/rateLimit";
import type { TicketDoc } from "@/lib/ticketDoc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * La respuesta se guarda en memoria veinte segundos.
 *
 * Cada resumen lee todas las mesas y todas las cuentas: con el panel abierto
 * en dos pestañas, o con «Ahora» pulsado a lo loco, eso sería una factura de
 * Firestore. Con esto, por muchas veces que se pida, Firestore se lee una vez
 * por instancia y por veinte segundos, que para mirar el día es tiempo real.
 */
const CACHE_MS = 20_000;
let guardado: { cuando: number; cuerpo: unknown } | null = null;

/**
 * Las cuentas de la casa, para el panel de admin.
 *
 * Es lo mismo que enseña /metricas con la llave en la URL, más lo que aquélla
 * no enseña a propósito —quién se ha registrado, con su correo, y las últimas
 * mesas—, porque esto sólo lo ve la cuenta de la casa: el token de Google
 * tiene que ser el de hola@divifriends.es. A cualquier otro le devuelve un
 * 404, como si la ruta no existiera.
 */
export async function GET(request: Request) {
  const quien = await usuarioDe(request);
  if (!esAdmin(quien)) return NextResponse.json({ error: "No existe." }, { status: 404 });
  const cabeceras = { "cache-control": "private, no-store" };
  if (guardado && Date.now() - guardado.cuando < CACHE_MS) {
    return NextResponse.json(guardado.cuerpo, { headers: cabeceras });
  }
  try {
    const db = firestore();
    const [tickets, users, lecturas, c] = await Promise.all([
      db.collection(TICKETS).orderBy("createdAt", "desc").limit(2000).get(),
      db.collection("users").limit(5000).get(),
      lecturasDelDia(),
      metricasCuentas(),
    ]);
    const docs = tickets.docs.map((d) => d.data() as TicketDoc);
    const m = resumen(docs);

    const usuarios = users.docs
      .map((d) => {
        const x = d.data();
        return {
          uid: d.id,
          nombre: (x.perfil?.name as string | undefined) ?? null,
          correo: (x.email as string | undefined) ?? null,
          usuario: (x.usuario as string | undefined) ?? null,
          novedades: x.novedades === true,
          terminos: (x.terminos as string | undefined) ?? null,
          creada: (x.creada as string | undefined) ?? null,
          divis: Array.isArray(x.divis) ? x.divis.length : 0,
        };
      })
      .sort((a, b) => (b.creada ?? "").localeCompare(a.creada ?? ""))
      .slice(0, 200);

    const mesas = tickets.docs.slice(0, 30).map((d) => {
      const x = d.data() as TicketDoc;
      return {
        code: d.id,
        place: x.place,
        creada: x.createdAt,
        personas: x.participants?.length ?? 0,
        lineas: x.items?.length ?? 0,
        total: x.totalCents,
        currency: x.currency,
        cerrada: x.closed === true,
      };
    });

    const cuerpo = {
      generado: new Date().toISOString(),
      modelo: MODELO_LECTOR,
      m,
      c,
      lecturas,
      usuarios,
      mesas,
    };
    guardado = { cuando: Date.now(), cuerpo };
    return NextResponse.json(cuerpo, { headers: cabeceras });
  } catch (error) {
    return fail(error);
  }
}
