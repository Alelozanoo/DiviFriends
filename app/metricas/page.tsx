import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { firestore, TICKETS } from "@/lib/firebaseAdmin";
import { resumen } from "@/lib/metricas";
import { metricasCuentas } from "@/lib/metricasCuentas";
import { lecturasDelDia, MODELO_LECTOR } from "@/lib/rateLimit";
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
  // El marcador del tope: un documento más, y es el único gasto exacto que hay.
  const lecturas = await lecturasDelDia();
  // Las cuentas de la gente: Google, amigos, invitaciones y correos.
  const c = await metricasCuentas();

  return (
    <main id="contenido" className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Las cuentas de la casa</h1>
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

      <Bloque titulo="Dos cosas que se pueden hacer" nota="Y cuánta gente las hace">
        <div className="grid grid-cols-2 gap-3">
          <Cifra n={m.recibos.conVarios} label="Divis con más de un ticket" sufijo="%" destacado />
          <Cifra n={m.avatares} label="Se ponen foto de perfil" sufijo="%" destacado />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Ojo, que cuentan cosas distintas. La primera es de <b className="text-ink">divis</b>:
          cuántas mesas juntan dos papeles o más —la cena y luego las copas—. La segunda es de{" "}
          <b className="text-ink">personas</b>: de toda la gente que se ha apuntado alguna vez a
          una mesa, cuántos se pusieron una foto o un emoji en vez de quedarse con sus
          iniciales.
        </p>
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
          <p className="rounded-caja border border-line bg-paper-2 px-4 py-3 text-sm text-ink-faint">
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


      {/* ---------------------------------------------------- las cuentas */}
      <Bloque titulo="Cuentas con Google" nota="Quién ha entrado, y qué ha hecho con la cuenta">
        <div className="grid grid-cols-3 gap-3">
          <Cifra n={c.cuentas.total} label="Cuentas" destacado />
          <Cifra n={c.cuentas.semana} label="Últimos 7 días" />
          <Cifra n={c.cuentas.hoy} label="Hoy" />
        </div>
        <div className="mt-3">
          <Barras datos={c.cuentas.porDia} />
        </div>
        <div className="mt-3">
          <Escalera
            pasos={[
              { etiqueta: "con foto", n: c.cuentas.conFoto, pct: pct(c.cuentas.conFoto, c.cuentas.total) },
              { etiqueta: "con Bizum o Revolut", n: c.cuentas.conBizum, pct: pct(c.cuentas.conBizum, c.cuentas.total) },
              { etiqueta: "con usuario elegido", n: c.cuentas.conUsuario, pct: pct(c.cuentas.conUsuario, c.cuentas.total) },
              { etiqueta: "con los correos apagados", n: c.cuentas.correosApagados, pct: pct(c.cuentas.correosApagados, c.cuentas.total) },
            ]}
          />
        </div>
      </Bloque>

      <Bloque titulo="Amigos y mesas" nota="Lo que sólo pasa con cuenta">
        <div className="grid grid-cols-3 gap-3">
          <Cifra n={c.amigos.amistades} label="Amistades" destacado />
          <Cifra n={c.amigos.pendientes} label="Sin aceptar" />
          <Cifra n={c.mesas.invitados} label="Metidos en una mesa por un amigo" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          De los {c.mesas.invitados} metidos por un amigo, <b className="text-ink-soft">{c.mesas.abiertos}</b> llegaron
          a abrir la mesa. Además, {c.mesas.propios} se sentaron ellos mismos con su cuenta.
        </p>
      </Bloque>

      <Bloque titulo="Correos" nota="Cada aviso se apunta; salir por correo es sólo una de las vías">
        <div className="grid grid-cols-3 gap-3">
          <Cifra n={c.correos.hoy} label="Hoy" destacado />
          <Cifra n={c.correos.semana} label="Últimos 7 días" />
          <Cifra n={c.correos.total} label="Desde el principio" />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[12px] text-ink-faint">Qué pasó con cada uno</p>
            <Escalera pasos={c.correos.porEstado} />
          </div>
          <div>
            <p className="mb-1.5 text-[12px] text-ink-faint">De qué eran</p>
            <Escalera pasos={c.correos.porTipo} />
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          El freno global de hoy va por{" "}
          <b className={c.correos.tope.hechos >= c.correos.tope.max * 0.8 ? "text-clay" : "text-ink-soft"}>
            {c.correos.tope.hechos} de {c.correos.tope.max}
          </b>
          . Si se llena, los siguientes se quedan apuntados en la campana y no salen por correo hasta el día
          siguiente.
        </p>
      </Bloque>

      <Bloque titulo="Lo que cuesta" nota="Leer tickets es el único gasto que crece con la gente">
        <div className="grid grid-cols-3 gap-3">
          <Dinero dolares={m.coste.hoy} label="Hoy" destacado />
          <Dinero dolares={m.coste.semana} label="Últimos 7 días" />
          <Dinero dolares={m.coste.total} label="Desde el principio" />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-faint">
          Cada papel que pasa por {MODELO_LECTOR} cuesta{" "}
          <b className="text-ink">{centimos(m.coste.porLectura)} ¢</b>, así que la cuenta es
          cuántos han pasado: {m.coste.lecturas.total.toLocaleString("es-ES")} desde el principio,{" "}
          {m.coste.lecturas.semana.toLocaleString("es-ES")} en la última semana y{" "}
          {m.coste.lecturas.hoy.toLocaleString("es-ES")} hoy.{" "}
          <b className="text-ink-soft">Es un techo, no una factura:</b> una comanda escrita a
          mano no llama a nadie y aquí cuenta igual, y las fotos que el modelo no supo leer se
          pagaron y no dejaron divi que contar.
        </p>
        {m.nonatas.total > 0 && (
          <p className="mt-2 text-xs leading-relaxed text-ink-faint">
            Ahí dentro van{" "}
            <b className="text-ink">{m.nonatas.total.toLocaleString("es-ES")} mesas que se
            abrieron y no llegaron a tener ni una línea</b> ({m.nonatas.hoy} hoy): alguien cerró
            la pestaña antes de que la foto terminara de leerse, o la lectura falló. Se pagaron
            igual, así que cuentan aquí — pero no son divis y no salen en ningún otro número de
            esta página. Si esa cifra sube, es que algo se está rompiendo entre la foto y la
            mesa.
          </p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          <b className="text-ink-soft">El número exacto es el otro:</b> el contador del tope
          lleva <b className="text-ink">{lecturas.hechas.toLocaleString("es-ES")}</b> lecturas de
          las {lecturas.tope.toLocaleString("es-ES")} que caben en un día
          {lecturas.desde ? ` —la ventana arrancó a las ${hora(lecturas.desde)}—` : ""}, que son
          unos {Math.round(lecturas.tope * m.coste.porLectura)} $. Ese es el freno: el día que
          alguien mande fotos en bucle, la factura para ahí.
        </p>
      </Bloque>


      <p className="mt-8 rounded-caja border border-line bg-paper-2 px-4 py-3 text-xs leading-relaxed text-ink-faint">
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

const pct = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte / total) * 100));

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
    <div className="rounded-caja border border-line bg-paper-2 px-4 py-3">
      <p className={`tnum text-3xl font-bold leading-tight ${color}`}>
        {n.toLocaleString("es-ES", {
          minimumFractionDigits: decimales,
          maximumFractionDigits: decimales,
        })}
        {sufijo}
      </p>
   <p className="text-[12px] mt-1 text-ink-faint">{label}</p>
    </div>
  );
}

/**
 * Un importe en dólares, en la unidad en la que se puede leer.
 *
 * Por debajo de un dólar sale en céntimos: a este tamaño «0,00 $» no dice nada
 * y «36 ¢» sí. Dólares y no euros porque es como factura Google; convertirlo
 * aquí sería inventarse un cambio que no cuadraría con el recibo.
 */
function Dinero({
  dolares,
  label,
  destacado = false,
}: {
  dolares: number;
  label: string;
  destacado?: boolean;
}) {
  const enCentimos = dolares < 1;
  const n = enCentimos ? dolares * 100 : dolares;
  return (
    <Cifra
      n={n}
      label={label}
      sufijo={enCentimos ? " ¢" : " $"}
      decimales={enCentimos ? (n < 10 ? 1 : 0) : 2}
      destacado={destacado}
    />
  );
}

/** Dólares a céntimos, con los decimales justos para que 0,0018 no sea «0». */
function centimos(dolares: number): string {
  return (dolares * 100).toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

/** La hora de la mesa, no la del servidor. */
function hora(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
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
    <div className="flex flex-col gap-2 rounded-caja border border-line bg-paper-2 p-4">
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
    <div className="flex items-end gap-1.5 rounded-caja border border-line bg-paper-2 p-4">
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
