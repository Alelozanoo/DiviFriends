import Link from "next/link";
import Logo from "@/components/Logo";
import TicketUploader from "@/components/TicketUploader";
import JoinByCode from "@/components/JoinByCode";

const STEPS = [
  {
    n: "01",
    title: "El ticket lleva un QR",
    body: "El bar imprime el código junto al total. Quien quiera repartir, lo escanea: no hay que instalar nada ni registrarse.",
  },
  {
    n: "02",
    title: "Cada uno marca lo suyo",
    body: "Todos ven la misma comanda en su móvil. Tocas los platos que te has comido y desaparecen de la lista. Lo que fue de todos se marca como compartido y se parte solo.",
  },
  {
    n: "03",
    title: "Sale quién debe a quién",
    body: "Se reparten servicio y propina en proporción, y aparece lo que cada uno le tiene que devolver al que pagó. Si sobra o falta dinero, se ve al momento.",
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

        <div className="mx-auto flex max-w-6xl flex-col gap-14 px-5 pb-20 pt-8 lg:flex-row lg:items-center lg:gap-16 lg:pt-16">
          <div className="flex-1">
            <Link href="/" className="inline-flex items-center gap-2 lg:gap-3">
              <Logo size={56} priority className="h-9 w-9 lg:h-14 lg:w-14" />
              <span className="text-lg font-bold tracking-tight lg:text-2xl">DiviFriends</span>
            </Link>

            <h1 className="mt-9 text-[2.6rem] font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl">
              La cuenta se reparte
              <br />
              <span className="text-amber">antes de pedir la segunda</span>
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
              Cada uno marca lo que se ha comido desde su móvil, sobre la misma comanda. Sin
              calculadoras, sin «yo solo tomé la caña», sin nadie poniendo de más.
            </p>

            {/*
              En el móvil esto va justo encima de subir la foto y lo empuja
              fuera de la pantalla, así que sólo sale donde cabe al lado: en
              escritorio las dos columnas están una junto a otra y no estorba.
            */}
            <dl className="mt-9 hidden flex-wrap gap-x-10 gap-y-4 lg:flex">
              <Metric value="0" label="apps que instalar" />
              <Metric value="1" label="foto o un QR" />
              <Metric value="0,00 €" label="de descuadre" />
            </dl>
          </div>

          <div className="w-full lg:max-w-md">
            <div className="rounded-[1.75rem] border border-line bg-paper-2/60 p-4 shadow-2xl shadow-black/40 backdrop-blur">
              <p className="stamp mb-3 px-2 text-ink-faint">Empieza aquí</p>
              <TicketUploader />
            </div>

            <div className="mt-5 rounded-2xl border border-line bg-paper-2/40 p-4">
              <p className="stamp mb-3 text-ink-faint">O entra con el código del ticket</p>
              <JoinByCode />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- proceso */}
      <section className="border-y border-line bg-paper-2/40">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cómo va</h2>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3">
            {STEPS.map((step) => (
              <article key={step.n} className="bg-paper p-6 sm:p-7">
                <span className="tnum text-3xl font-bold text-amber">{step.n}</span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </article>
            ))}
          </div>
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

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="tnum text-2xl font-bold text-ink">{value}</dt>
      <dd className="stamp mt-1 text-ink-faint">{label}</dd>
    </div>
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
