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
    <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
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

      <Bloque titulo="Cuánta gente" nota="Apuntada a un divi, del principio a hoy">
        <div className="grid grid-cols-3 gap-3">
          <Cifra n={m.personas.total} label="Desde el principio" destacado />
          <Cifra n={m.personas.semana} label="Últimos 7 días" />
          <Cifra n={m.personas.hoy} label="Hoy" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          <b className="text-ink-soft">No son personas distintas.</b> Quien hace un divi el
          sábado y otro el domingo cuenta dos veces: una comanda no guarda quién la abrió más
          allá de esa mesa. Esto es el techo del número de usuarios, no el número.
        </p>
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

      <Bloque titulo="Hasta dónde llegan" nota="Cuántos divis alcanzan cada paso">
        <Escalera pasos={m.embudo} />
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          El escalón que importa es el segundo. Un divi creado sólo dice que alguien le hizo una
          foto a un ticket; uno donde alguien coge algo dice que hubo una mesa de verdad
          repartiendo. Lo que se cae entre esos dos son los que se asomaron y se fueron.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Cifra n={m.conPagador} label="Con pagador" sufijo="%" />
          <Cifra n={m.saldados} label="Ya saldados" sufijo="%" tono="mint" />
          <Cifra n={m.lineas} label="Líneas por ticket" decimales={1} />
        </div>
      </Bloque>

      <Bloque titulo="Los que sólo miran" nota="Lo que no llegó a ser una mesa">
        <div className="grid grid-cols-3 gap-3">
          <Cifra n={m.curiosos.vacios} label="Nadie cogió nada" sufijo="%" tono="clay" />
          <Cifra n={m.curiosos.efimeros} label="No se volvió a tocar" sufijo="%" tono="clay" />
          <Cifra n={m.curiosos.medianaMinutos} label="Minutos de vida" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Un divi que se crea y no se toca nunca más es alguien probando qué es esto. Los
          minutos son la <b className="text-ink">mediana</b> de lo que pasa entre que se crea la
          comanda y su último cambio: una mesa de verdad se toca durante un rato largo, la del
          curioso muere en el mismo minuto en que nació.
        </p>
      </Bloque>

      <Bloque titulo="Qué hacen dentro" nota="Los cambios que quedan grabados en la comanda">
        {m.acciones.length ? (
          <Escalera pasos={m.acciones} />
        ) : (
          <p className="rounded-2xl border border-line bg-paper-2 px-4 py-3 text-sm text-ink-faint">
            Todavía no hay ni un cambio grabado.
          </p>
        )}
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
        un identificador anónimo guardado en el navegador.{" "}
        <b className="text-ink-soft">Por IP tampoco saldría:</b> en el wifi de un bar seis
        amigos comparten una, y detrás del móvil hay miles de personas con la misma. Contaría
        una mesa entera como un usuario y a mil desconocidos también.
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

/**
 * Una lista de barras horizontales, para lo que se lee de arriba abajo.
 *
 * Horizontal y no vertical como `Barras` porque aquí la etiqueta es una frase
 * —«alguien anuncia que paga»— y en vertical no cabe sin partirla en dos.
 *
 * La barra se mide contra el paso más alto y no contra el total: si el 4 % de
 * los divis llega al final, seis barras diminutas no dejan comparar nada entre
 * ellas. El número de al lado es el dato; la barra sólo es la forma.
 */
function Escalera({ pasos }: { pasos: { etiqueta: string; n: number; pct?: number }[] }) {
  const alto = Math.max(1, ...pasos.map((p) => p.n));
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-paper-2 p-4">
      {pasos.map((paso) => (
        <div key={paso.etiqueta} className="flex items-center gap-3">
          <span className="w-40 shrink-0 text-[13px] leading-tight text-ink-soft">
            {paso.etiqueta}
          </span>
          <div className="h-5 min-w-0 flex-1 overflow-hidden rounded bg-paper">
            <div
              className="h-full rounded bg-amber"
              style={{ width: `${Math.max(2, (paso.n / alto) * 100)}%` }}
            />
          </div>
          <span className="tnum w-20 shrink-0 text-right text-[13px] font-bold text-ink">
            {paso.n.toLocaleString("es-ES")}
            {paso.pct === undefined ? "" : ` · ${paso.pct}%`}
          </span>
        </div>
      ))}
    </div>
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
