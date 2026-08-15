import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { firestore, TICKETS } from "@/lib/firebaseAdmin";
import { resumen } from "@/lib/metricas";
import type { TicketDoc } from "@/lib/ticketDoc";

/**
 * Las cuentas de la casa, en una página.
 *
 * No hay usuarios ni sesiones en esta app, así que la puerta es un token en
 * la URL comparado en el servidor: sin él la ruta no existe —404, no un «no
 * autorizado»—, y así ni se sabe que está ahí. Se abre desde el móvil como
 * cualquier otra página.
 *
 * Aquí no sale ni un nombre ni un importe de nadie: sólo cuántos y cuándo.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Métricas",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { searchParams: Promise<{ k?: string }> };

export default async function MetricasPage({ searchParams }: Props) {
  const { k } = await searchParams;
  const token = process.env.METRICAS_TOKEN;
  if (!token || k !== token) notFound();

  // Un documento por comanda: leerlas todas es una sola consulta. El tope
  // está para que el día que haya miles esto no se convierta en una factura.
  const snap = await firestore()
    .collection(TICKETS)
    .orderBy("createdAt", "desc")
    .limit(2000)
    .get();
  const docs = snap.docs.map((d) => d.data() as TicketDoc);
  const m = resumen(docs);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Las cuentas de la casa</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Lo que dice Firestore. Ni cookies ni píxel: esto no lo bloquea nadie.
        </p>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Cifra n={m.hoy} label="Divis hoy" destacado />
        <Cifra n={m.semana} label="Últimos 7 días" />
        <Cifra n={m.total} label="Desde el principio" />
      </div>

      <Bloque titulo="Divis por día" nota="Últimos catorce días">
        <Barras datos={m.porDia} />
      </Bloque>

      <Bloque
        titulo="Cuánta gente entra por divi"
        nota="Es el número que decide si esto crece solo"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cifra n={m.personas.media} label="De media" decimales={1} destacado />
          <Cifra n={m.personas.solo} label="Se queda en uno" sufijo="%" tono="clay" />
          <Cifra n={m.personas.dosOMas} label="Dos o más" sufijo="%" />
          <Cifra n={m.personas.tresOMas} label="Tres o más" sufijo="%" tono="mint" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Cada divi que se queda en una sola persona es alguien que lo abrió y no llegó a
          pasárselo a nadie. Ese porcentaje bajando es la señal de que la app se entiende.
        </p>
      </Bloque>

      <Bloque titulo="Las dos novedades" nota="Si se usan o no">
        <div className="grid grid-cols-2 gap-3">
          <Cifra n={m.recibos.conVarios} label="Divis con varios tickets" sufijo="%" destacado />
          <Cifra n={m.avatares} label="Se ponen bicho" sufijo="%" destacado />
        </div>
      </Bloque>

      <Bloque titulo="Hasta dónde llegan" nota="El embudo de una comanda">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cifra n={m.repartidos} label="Todo repartido" sufijo="%" />
          <Cifra n={m.conPagador} label="Con pagador" sufijo="%" />
          <Cifra n={m.saldados} label="Ya saldados" sufijo="%" tono="mint" />
          <Cifra n={m.lineas} label="Líneas por ticket" decimales={1} />
        </div>
      </Bloque>

      <Bloque titulo="Cuándo se usa" nota="La hora de la mesa, no la del servidor">
        <Barras datos={m.porDiaSemana} />
        <div className="mt-4 grid grid-cols-4 gap-3">
          <Cifra n={m.porFranja.mañana} label="Mañana" />
          <Cifra n={m.porFranja.tarde} label="Tarde" />
          <Cifra n={m.porFranja.noche} label="Noche" destacado />
          <Cifra n={m.porFranja.madrugada} label="Madrugada" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Si algún día pones anuncios, esta es la tabla que dice a qué horas ponerlos.
        </p>
      </Bloque>

      <p className="mt-8 rounded-2xl border border-line bg-paper-2 px-4 py-3 text-xs leading-relaxed text-ink-faint">
        <b className="text-ink-soft">Lo que esto no puede saber:</b> si alguien vuelve. Una
        comanda no guarda quién la creó más allá de esa mesa, así que no hay forma de decir que
        el divi de este sábado y el del que viene son de la misma persona. Para eso haría falta
        un identificador anónimo guardado en el navegador.
      </p>
    </main>
  );
}

/* ------------------------------------------------------------------ piezas */

function Cifra({
  n,
  label,
  sufijo = "",
  decimales = 0,
  destacado = false,
  tono,
}: {
  n: number;
  label: string;
  sufijo?: string;
  decimales?: number;
  destacado?: boolean;
  tono?: "mint" | "clay";
}) {
  const color = tono === "mint" ? "text-mint" : tono === "clay" ? "text-clay" : destacado ? "text-amber" : "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-paper-2 px-4 py-3">
      <p className={`tnum text-3xl font-bold leading-tight ${color}`}>
        {n.toLocaleString("es-ES", {
          minimumFractionDigits: decimales,
          maximumFractionDigits: decimales,
        })}
        {sufijo}
      </p>
      <p className="stamp mt-1 text-ink-faint">{label}</p>
    </div>
  );
}

function Bloque({
  titulo,
  nota,
  children,
}: {
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-bold tracking-tight">{titulo}</h2>
      {nota && <p className="mb-3 mt-0.5 text-xs text-ink-faint">{nota}</p>}
      {children}
    </section>
  );
}

/** Barras dibujadas con divs: ni librería de gráficos ni imagen que cargar. */
function Barras({ datos }: { datos: { etiqueta: string; n: number }[] }) {
  const alto = Math.max(1, ...datos.map((d) => d.n));
  return (
    <div className="flex items-end gap-1.5 rounded-2xl border border-line bg-paper-2 p-4">
      {datos.map((d) => (
        <div key={d.etiqueta} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="tnum text-[10px] text-ink-faint">{d.n || ""}</span>
          <div
            className="w-full rounded-t bg-amber"
            style={{ height: Math.max(2, (d.n / alto) * 96) }}
          />
          <span className="text-[10px] text-ink-faint">{d.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}
