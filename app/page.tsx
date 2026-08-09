import Link from "next/link";
import Logo from "@/components/Logo";
import TicketUploader from "@/components/TicketUploader";
import { PasoCuentas, PasoFoto, PasoMarcar } from "@/components/ComoVa";

/**
 * Los tres pasos, dibujados con las piezas de la propia app.
 *
 * Se probó con capturas de pantalla y pesaban medio mega para acabar
 * enseñando la app entera —cabecera, barra de abajo, diez líneas— cuando cada
 * paso sólo necesita una de esas piezas. Dibujadas se recortan a lo justo, se
 * ven nítidas en cualquier pantalla y no cuestan una sola petición.
 */
const PASOS = [
  {
    n: "01",
    title: "Le haces una foto",
    foot: "El ticket se convierte en la lista, plato a plato.",
    Pieza: PasoFoto,
  },
  {
    n: "02",
    title: "Tocas lo que has tomado",
    foot: "Lo compartido se parte solo entre quienes lo pidieron.",
    Pieza: PasoMarcar,
  },
  {
    n: "03",
    title: "Sale lo que debe cada uno",
    foot: "Y quien puso la tarjeta ve quién le falta por pagar.",
    Pieza: PasoCuentas,
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full opacity-[0.14] blur-3xl"
          style={{ background: "radial-gradient(circle, var(--amber), transparent 65%)" }}
        />

        {/* El aire de arriba y entre columnas se recorta en el móvil para que
            el bloque de subir la foto siga entrando en la primera pantalla. */}
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-5 pb-20 pt-6 lg:flex-row lg:items-center lg:gap-16 lg:pt-16">
          <div className="flex-1">
            <Link href="/" className="inline-flex items-center gap-2.5 lg:gap-4">
              <Logo size={128} priority className="h-11 w-11 lg:h-20 lg:w-20" />
              <span className="text-xl font-bold tracking-tight lg:text-3xl">DiviFriends</span>
            </Link>

            <h1 className="mt-7 text-[2.6rem] font-bold leading-[1.02] tracking-[-0.03em] lg:mt-9 sm:text-6xl">
              La cuenta se reparte
              <br />
              <span className="text-amber">antes de pedir la segunda</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
              Cada uno marca lo que se ha comido desde su móvil, sobre la misma comanda. Sin
              calculadoras, sin «yo solo tomé la caña», sin nadie poniendo de más.
            </p>

            {/*
              Lo que más frena a alguien que llega de un QR en un bar es pensar
              que le van a pedir descargar algo o darse de alta.

              Centradas y no a la izquierda: así se leen como un sello del
              producto y no como la cuarta línea del párrafo. El tamaño va
              ajustado porque en 360 px caben en una fila por poco, y con una
              pizca más de relleno saltan a dos y empujan el bloque de subir la
              foto fuera de la pantalla, que es lo que hay que proteger aquí.
            */}
            <ul className="mt-6 flex flex-wrap justify-center gap-1.5 lg:mt-8 lg:gap-2">
              {/* «Sin instalar» y no «Sin instalar nada»: las dos sílabas de
                  más partían la fila en pantallas de 360 px. */}
              {["Gratis", "Sin registro", "Sin instalar"].map((texto) => (
                <li
                  key={texto}
                  className="flex items-center gap-1.5 rounded-full border border-line bg-paper-2/70 py-1.5 pl-2.5 pr-3 text-xs font-semibold text-ink-soft lg:py-2 lg:pl-3 lg:pr-4 lg:text-sm"
                >
                  <CheckIcon />
                  {texto}
                </li>
              ))}
            </ul>
          </div>

          <div className="w-full lg:max-w-md">
            <div className="rounded-[1.75rem] border border-line bg-paper-2/60 p-4 shadow-2xl shadow-black/40 backdrop-blur">
              <p className="stamp mb-3 px-2 text-ink-faint">Empieza aquí</p>
              <TicketUploader />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- proceso */}
      <section className="border-y border-line bg-paper-2/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cómo funciona</h2>
          <p className="mt-3 max-w-md text-ink-soft">Tres pantallas y ya está.</p>

          {/* Al dibujarlas son bajitas, así que caben apiladas en el móvil sin
              carrusel ni scroll lateral: se leen de arriba abajo, en orden. */}
          <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-6">
            {PASOS.map(({ n, title, foot, Pieza }) => (
              <li key={n}>
                <Pieza />
                <p className="mt-4 flex items-baseline gap-2.5">
                  <span className="tnum text-sm font-bold text-amber">{n}</span>
                  <span className="text-lg font-semibold tracking-tight">{title}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{foot}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------------------------------------------- bares */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
          <div>
            <p className="stamp text-amber">Para bares y restaurantes</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Un QR en el ticket y se acabaron las diez tarjetas
            </h2>
            <p className="mt-5 leading-relaxed text-ink-soft">
              Creas la comanda desde el TPV o a mano, imprimes el código junto al total y la mesa se
              organiza sola. Tú cobras una vez, ellos se lo reparten después.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/nueva"
                className="rounded-xl bg-amber px-5 py-3 font-semibold text-paper transition-colors hover:bg-ink"
              >
                Crear una comanda
              </Link>
              <Link
                href="/nueva?demo=1"
                className="rounded-xl border border-line px-5 py-3 font-semibold text-ink-soft transition-colors hover:border-amber hover:text-ink"
              >
                Ver un ejemplo
              </Link>
            </div>
          </div>

          <ReceiptPreview />
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-ink-faint sm:flex-row sm:items-center sm:justify-between">
          <p>DiviFriends · reparte la cuenta sin discutir</p>
          <p className="tnum">Los importes se calculan al céntimo.</p>
        </div>
      </footer>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--mint)"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <path d="M4 12.5 9.5 18 20 6.5" />
    </svg>
  );
}

/** Maqueta estática: enseña de un vistazo dónde acaba el QR. */
function ReceiptPreview() {
  const lines = [
    ["2", "Croquetas jamón", "9,80"],
    ["1", "Ensaladilla", "7,50"],
    ["3", "Caña", "7,50"],
    ["1", "Pulpo a la brasa", "18,90"],
  ];
  return (
    <div className="mx-auto w-full max-w-xs">
      <div className="torn-top h-3 bg-[#f4ece0]" />
      <div className="bg-[#f4ece0] px-6 pb-6 pt-2 text-[#14100d]">
        <p className="stamp text-center text-[#776a5c]">Bar Casa Nuria · Mesa 12</p>
        <div className="rule my-4 opacity-30" />
        <ul className="space-y-2 text-sm">
          {lines.map(([qty, name, price]) => (
            <li key={name} className="flex items-baseline gap-3">
              <span className="tnum w-4 text-[#776a5c]">{qty}</span>
              <span className="flex-1">{name}</span>
              <span className="tnum">{price}</span>
            </li>
          ))}
        </ul>
        <div className="rule my-4 opacity-30" />
        <div className="flex items-baseline justify-between font-bold">
          <span className="stamp">Total</span>
          <span className="tnum text-lg">43,70 €</span>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-lg border border-dashed border-[#776a5c]/40 p-3">
          <div className="grid h-14 w-14 shrink-0 grid-cols-5 grid-rows-5 gap-[2px]" aria-hidden>
            {QR_PATTERN.map((on, i) => (
              <span key={i} className={on ? "bg-[#14100d]" : "bg-transparent"} />
            ))}
          </div>
          <p className="stamp leading-relaxed text-[#776a5c]">
            Escanea
            <br />
            y reparte
          </p>
        </div>
      </div>
      <div className="torn-top h-3 rotate-180 bg-[#f4ece0]" />
    </div>
  );
}

// Rejilla decorativa 5×5; el QR real se genera en /t/[code]/qr.
const QR_PATTERN = [
  1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1,
].map(Boolean);
