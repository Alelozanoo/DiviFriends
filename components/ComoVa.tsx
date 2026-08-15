"use client";

import { useT } from "@/lib/i18n";
import type { Dict } from "@/lib/i18n/es";

/**
 * Los cuatro pasos, dibujados en vez de fotografiados.
 *
 * Son las piezas de verdad de la app —la línea de la comanda, la fila de quién
 * debe— pero recortadas a lo mínimo: sin cabecera, sin barra de abajo y sin las
 * diez líneas del ticket. Una captura enseña la app entera y obliga a buscar
 * dónde mirar; esto enseña sólo lo que explica el paso.
 *
 * Además pesa cero: son nodos, no imágenes, así que se ven nítidas en cualquier
 * pantalla y cambian solas si mañana cambia el color de la marca.
 */

/* -------------------------------------------------------------------------- */
/*  01 · la foto se convierte en cuenta                                        */
/* -------------------------------------------------------------------------- */

export function PasoFoto() {
  const t = useT();
  return (
    <Marco>
      {/* el papel */}
      <div className="w-[6.5rem] -rotate-6">
        <div className="torn-top h-2 bg-[#f4ece0]" />
        <div className="space-y-1.5 bg-[#f4ece0] px-3 pb-3 pt-1">
          {[
            ["Croquetas", "9,80"],
            ["Caña", "7,50"],
            ["Pulpo", "18,90"],
          ].map(([nombre, precio]) => (
            <div key={nombre} className="flex items-baseline justify-between gap-2">
              <span className="text-[0.5rem] text-[#14100d]">{nombre}</span>
              <span className="tnum text-[0.5rem] text-[#14100d]">{precio}</span>
            </div>
          ))}
          <div className="rule opacity-40" />
          <div className="flex items-baseline justify-between">
            <span className="stamp text-[0.45rem] text-[#776a5c]">{t.pasos.total}</span>
            <span className="tnum text-[0.6rem] font-bold text-[#14100d]">54,70</span>
          </div>
        </div>
        <div className="torn-top h-2 rotate-180 bg-[#f4ece0]" />
      </div>

      <Flecha />

      {/* lo que sale */}
      <div className="grid w-[7.5rem] grid-cols-2 gap-1.5">
        {[
          ["Croquetas", "4,90"],
          ["Caña", "2,50"],
          ["Pulpo", "18,90"],
          ["Tarta", "5,50"],
        ].map(([nombre, precio]) => (
          <div key={nombre} className="rounded-lg border border-line bg-paper-2 p-1.5">
            <p className="truncate text-[0.5rem] font-semibold leading-tight">{nombre}</p>
            {/* Sin esto el símbolo del euro se cae solo a la línea de abajo. */}
            <p className="tnum whitespace-nowrap text-[0.65rem] font-bold leading-tight">
              {precio} €
            </p>
          </div>
        ))}
      </div>
    </Marco>
  );
}

/* -------------------------------------------------------------------------- */
/*  02 · varios tickets, una sola cuenta                                       */
/* -------------------------------------------------------------------------- */

export function PasoTickets() {
  const t = useT();
  const tickets = [
    { sitio: "Casa Paco", total: "54,70", quien: "Álex", color: "#5ec5c0" },
    { sitio: "Bodega Luis", total: "18,20", quien: "Marta", color: "#e0705f" },
  ];

  return (
    <Marco>
      {/* Las pestañas de arriba de la comanda: una por ticket y la de añadir.
          Son la pieza que hace entender el paso de un vistazo, porque enseñan
          que los dos tickets viven dentro del mismo sitio. */}
      <div className="flex w-full max-w-[15rem] items-center gap-1.5">
        <span className="rounded-full bg-amber px-2.5 py-1 text-[0.55rem] font-bold text-paper">
          Casa Paco
        </span>
        <span className="rounded-full border border-line bg-paper-2 px-2.5 py-1 text-[0.55rem] font-bold text-ink-soft">
          Bodega Luis
        </span>
        <span className="rounded-full border border-dashed border-line px-2 py-1 text-[0.55rem] font-bold text-ink-faint">
          +
        </span>
      </div>

      <div className="w-full max-w-[15rem] space-y-1.5">
        {tickets.map((recibo) => (
          <div
            key={recibo.sitio}
            className="flex items-center gap-2 rounded-xl border border-line bg-paper-2 px-2.5 py-2"
          >
            <span
              style={{ background: recibo.color }}
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.5rem] font-bold text-paper"
            >
              {recibo.quien.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.7rem] font-semibold leading-tight">
                {recibo.sitio}
              </span>
              {/* Que cada ticket lo pague otro es justo lo que hay que contar:
                  es la mitad del porqué de la pantalla siguiente. */}
              <span className="stamp block text-[0.5rem] text-ink-faint">{t.pasos.pago} {recibo.quien}</span>
            </span>
            <span className="tnum shrink-0 whitespace-nowrap text-xs font-bold">{recibo.total} €</span>
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-[15rem] items-baseline justify-between border-t border-line pt-2.5">
        <span className="stamp text-ink-faint">{t.pasos.totalMesa}</span>
        <span className="tnum whitespace-nowrap text-lg font-bold">72,90 €</span>
      </div>
    </Marco>
  );
}

/* -------------------------------------------------------------------------- */
/*  03 · tocas lo tuyo                                                         */
/* -------------------------------------------------------------------------- */

export function PasoMarcar() {
  const t = useT();
  return (
    <Marco>
      <div className="grid w-full max-w-[15rem] grid-cols-2 gap-2.5">
        <Linea nombre="Ensaladilla" precio="7,50" />
        {/* La marcada: borde ámbar, importe en ámbar y tu ficha. Es exactamente
            lo que ve la mesa al tocar, sin nada alrededor que distraiga. */}
        <Linea nombre="Pulpo" precio="18,90" mia />
        <Linea nombre="Croquetas" precio="4,90" />
        <Linea nombre="Caña" precio="2,50" mia entre={`${t.pasos.entre} 3`} />
      </div>

      {/* la barra de abajo, que es donde se mira */}
      <div className="mt-4 flex w-full max-w-[15rem] items-center justify-between rounded-xl border border-line bg-paper-2 px-3 py-2">
        <span className="stamp text-ink-faint">{t.pasos.loTuyo}</span>
        <span className="tnum text-lg font-bold">21,40 €</span>
      </div>
    </Marco>
  );
}

function Linea({
  nombre,
  precio,
  mia = false,
  entre,
}: {
  nombre: string;
  precio: string;
  mia?: boolean;
  entre?: string;
}) {
  const t = useT();
  return (
    <div
      className={`rounded-xl border-2 p-2 ${
        mia ? "border-amber bg-amber/12" : "border-line bg-paper-2"
      }`}
    >
      <p className="truncate text-[0.7rem] font-semibold leading-tight">{nombre}</p>
      <p className={`tnum text-sm font-bold leading-tight ${mia ? "text-amber" : ""}`}>
        {precio} €
      </p>
      {mia ? (
        <span className="mt-1 inline-grid h-4 w-4 place-items-center rounded-full bg-mint text-[0.45rem] font-bold leading-none text-paper">
          {t.pasos.tu}
        </span>
      ) : (
        <span className="stamp mt-1 block text-[0.5rem] text-mint">{entre ?? t.pasos.libre}</span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  04 · quién le paga a quién                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Las cuentas cuando ha pagado más de uno.
 *
 * Los números salen de los dos tickets del paso anterior y cuadran: Álex puso
 * los 54,70 de Casa Paco y Marta los 18,20 de la bodega, y de los 72,90 se
 * comieron 30,00, 8,00 y 34,90. Están calculados y no puestos a ojo porque
 * alguien los va a sumar —yo lo haría— y una portada que no cuadra dice más de
 * la app que cualquier eslogan.
 */
export function PasoCuentas() {
  const t = useT();
  const gente: {
    nombre: string;
    inicial: string;
    importe: string;
    color: string;
    notas: string[];
    cobra?: boolean;
    yo?: boolean;
  }[] = [
    {
      nombre: "Leo",
      inicial: "LE",
      importe: "34,90",
      color: "#e0705f",
      // Dos pagos porque pagaron dos: es justo lo que la app resuelve sola.
      notas: [`24,70 € ${t.pasos.a} Álex`, `10,20 € ${t.pasos.a} Marta`],
    },
    {
      nombre: "Álex",
      inicial: "ÁL",
      importe: "24,70",
      color: "#5ec5c0",
      notas: [`${t.pasos.recibeDe} Leo`],
      cobra: true,
      yo: true,
    },
    {
      nombre: "Marta",
      inicial: "MA",
      importe: "10,20",
      color: "#8b8bf0",
      notas: [`${t.pasos.recibeDe} Leo`],
      cobra: true,
    },
  ];

  return (
    <Marco>
      <div className="w-full max-w-[15rem]">
        <div className="rounded-xl border border-line bg-paper-2 px-3 py-2.5">
          {/* Corto a propósito: en una columna estrecha, la frase entera de la
              app se parte en dos líneas y estropea la cifra de debajo. */}
          <p className="stamp text-ink-faint">{t.pasos.faltaPorSaldar}</p>
          <p className="tnum mt-1 text-2xl font-bold leading-none">34,90 €</p>
        </div>

        <ul className="mt-2.5 overflow-hidden rounded-xl border border-line bg-paper-2">
          {gente.map((p, i) => (
            <li
              key={p.nombre}
              className={`flex items-center gap-2 px-3 py-2 ${
                i > 0 ? "border-t border-line/60" : ""
              }`}
            >
              <span
                style={{ background: p.color }}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.5rem] font-bold text-paper"
              >
                {p.inicial}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium leading-tight">
                  {p.nombre}
                  {p.yo && <span className="ml-1 text-[0.55rem] text-amber">(tú)</span>}
                </span>
                {p.notas.map((nota) => (
                  <span key={nota} className="block truncate text-[0.55rem] leading-tight text-ink-faint">
                    {nota}
                  </span>
                ))}
              </span>

              <span
                className={`tnum shrink-0 whitespace-nowrap text-xs font-bold ${
                  p.cobra ? "text-mint" : ""
                }`}
              >
                {p.importe} €
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Marco>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Caja común. La altura es fija y no mínima a propósito: con `min-h` cada
 * columna crecía lo suyo y los tres pies quedaban a distinta altura, que es
 * justo lo que hace que una fila de tres parezca descuidada.
 */
function Marco({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[17.5rem] flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border border-line bg-paper p-5">
      {children}
    </div>
  );
}

function Flecha() {
  return (
    <svg
      aria-hidden
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--amber)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      /* Las piezas van apiladas, así que la flecha apunta hacia abajo. */
      className="shrink-0 rotate-90"
    >
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Los cuatro pasos, dibujados con las piezas de la propia app.
 *
 * Se probó con capturas de pantalla y pesaban medio mega para acabar
 * enseñando la app entera —cabecera, barra de abajo, diez líneas— cuando cada
 * paso sólo necesita una de esas piezas. Dibujadas se recortan a lo justo, se
 * ven nítidas en cualquier pantalla y no cuestan una sola petición.
 */
export const PASOS = (t: Dict) => [
  { n: "01", title: t.pasos.uno.title, foot: t.pasos.uno.foot, Pieza: PasoFoto },
  { n: "02", title: t.pasos.dos.title, foot: t.pasos.dos.foot, Pieza: PasoTickets },
  { n: "03", title: t.pasos.tres.title, foot: t.pasos.tres.foot, Pieza: PasoMarcar },
  { n: "04", title: t.pasos.cuatro.title, foot: t.pasos.cuatro.foot, Pieza: PasoCuentas },
];
