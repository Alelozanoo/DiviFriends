/**
 * Los tres pasos, dibujados en vez de fotografiados.
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
            <span className="stamp text-[0.45rem] text-[#776a5c]">Total</span>
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
/*  02 · tocas lo tuyo                                                         */
/* -------------------------------------------------------------------------- */

export function PasoMarcar() {
  return (
    <Marco>
      <div className="grid w-full max-w-[15rem] grid-cols-2 gap-2.5">
        <Linea nombre="Ensaladilla" precio="7,50" />
        {/* La marcada: borde ámbar, importe en ámbar y tu ficha. Es exactamente
            lo que ve la mesa al tocar, sin nada alrededor que distraiga. */}
        <Linea nombre="Pulpo" precio="18,90" mia />
        <Linea nombre="Croquetas" precio="4,90" />
        <Linea nombre="Caña" precio="2,50" mia entre="entre 3" />
      </div>

      {/* la barra de abajo, que es donde se mira */}
      <div className="mt-4 flex w-full max-w-[15rem] items-center justify-between rounded-xl border border-line bg-paper-2 px-3 py-2">
        <span className="stamp text-ink-faint">Lo tuyo</span>
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
          TÚ
        </span>
      ) : (
        <span className="stamp mt-1 block text-[0.5rem] text-mint">{entre ?? "libre"}</span>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  03 · cada uno ve lo que debe                                               */
/* -------------------------------------------------------------------------- */

export function PasoCuentas() {
  const gente: { nombre: string; importe: string; color: string; estado: "tu" | "falta" | "ok" }[] = [
    { nombre: "Álex", importe: "21,40", color: "#5ec5c0", estado: "tu" },
    { nombre: "Leo", importe: "13,50", color: "#e0705f", estado: "falta" },
    { nombre: "Sofía", importe: "7,50", color: "#8b8bf0", estado: "ok" },
  ];

  return (
    <Marco>
      <div className="w-full max-w-[15rem]">
        <div className="rounded-xl border border-line bg-paper-2 px-3 py-2.5">
          {/* Corto a propósito: en una columna estrecha «Falta por devolverle a
              Marta» se parte en dos líneas y estropea la cifra de debajo. */}
          <p className="stamp text-ink-faint">Le deben a Marta</p>
          <p className="tnum mt-1 text-2xl font-bold leading-none">34,90 €</p>
        </div>

        <ul className="mt-2.5 overflow-hidden rounded-xl border border-line bg-paper-2">
          {gente.map((p, i) => (
            <li
              key={p.nombre}
              className={`flex items-center gap-2 px-3 py-2 ${
                i > 0 ? "border-t border-line/60" : ""
              } ${p.estado === "ok" ? "opacity-55" : ""}`}
            >
              <span
                style={{ background: p.color }}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[0.5rem] font-bold text-paper"
              >
                {p.nombre.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{p.nombre}</span>
              <span className="tnum text-xs font-bold">{p.importe} €</span>
              {p.estado === "tu" ? (
                <span className="rounded-md bg-amber px-2 py-1 text-[0.55rem] font-bold text-paper">
                  He pagado
                </span>
              ) : p.estado === "ok" ? (
                <span className="text-[0.55rem] font-bold text-mint">Pagado ✓</span>
              ) : (
                <span className="rounded-md border border-line px-2 py-1 text-[0.55rem] font-semibold text-ink-soft">
                  Ha pagado
                </span>
              )}
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
