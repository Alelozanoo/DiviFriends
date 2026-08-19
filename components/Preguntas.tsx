"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";

/**
 * Las dudas reales de quien acaba de escanear un ticket.
 *
 * Sustituye a la sección de bares, que prometía crear la comanda «desde el
 * TPV» cuando no existe ninguna integración. Además, a quien llega con el
 * papel en la mano no le interesa el TPV de nadie: le interesa si esto es
 * gratis, si le van a guardar la foto y qué pasa si lee mal un precio.
 *
 * Las respuestas están escritas para poder sostenerlas: nada de «no
 * compartimos tus datos» genérico, sino qué se guarda exactamente.
 */
const PREGUNTAS: { p: string; r: React.ReactNode }[] = [
  {
    p: "¿Es gratis de verdad?",
    r: (
      <>
        Sí. No hay cuentas, ni pagos, ni una versión de pago esperándote al final. No pedimos ni un
        correo.
      </>
    ),
  },
  {
    p: "¿Se guarda la foto de mi ticket?",
    r: (
      <>
        No. La foto se lee en el momento y se descarta: no se guarda ni en el servidor ni en ninguna
        parte. De la comanda queda sólo lo que ves en pantalla —los platos, los precios, el total y
        el nombre de pila de cada uno—, y se conserva mientras el código siga existiendo.
      </>
    ),
  },
  {
    p: "¿Tienen que instalarse algo los demás?",
    r: (
      <>
        No. Les pasas el enlace o les enseñas el QR y lo abren en el navegador del móvil, como
        cualquier página. Sólo escriben su nombre para que la mesa sepa qué platos son suyos.
      </>
    ),
  },
  {
    p: "¿Y si lee mal un precio?",
    r: (
      <>
        Se corrige a mano y sin salir de la comanda: tocas la línea para cambiar cómo se reparte,
        añades lo que falte con <b className="font-semibold text-ink">+ Falta algo</b> y quitas lo
        que sobre. Si el total leído no cuadra con el papel, se edita en{" "}
        <b className="font-semibold text-ink">Cuentas</b>.
      </>
    ),
  },
  {
    p: "¿Quién puede ver mi comanda?",
    r: (
      <>
        Quien tenga el código de seis caracteres, igual que quien pueda leer el ticket de la mesa.
        No aparece en Google —las comandas están fuera de los buscadores a propósito— y el único
        dato personal es el nombre de pila que escribe cada uno.
      </>
    ),
  },
  {
    p: "¿Hace falta que estemos todos a la vez?",
    r: (
      <>
        No. La comanda se actualiza en directo en todos los móviles, así que cada uno marca lo suyo
        cuando pueda. Y si alguien no saca el móvil, otro puede marcar por él desde la misma
        pantalla.
      </>
    ),
  },
  {
    p: "¿Y si no tenemos el ticket?",
    r: (
      <>
        Se escribe a mano:{" "}
        <Link href="/nueva" className="text-amber underline underline-offset-4 hover:text-ink">
          apunta lo que hay en la mesa
        </Link>{" "}
        y funciona igual. También sirve si el papel salió tan borroso que no hay quien lo lea.
      </>
    ),
  },
  {
    p: "Tengo un bar, ¿puedo usarlo?",
    r: (
      <>
        Sí, aunque todavía a mano: creas la comanda{" "}
        <Link href="/nueva" className="text-amber underline underline-offset-4 hover:text-ink">
          desde aquí
        </Link>{" "}
        e imprimes el QR para dejarlo en la mesa. La integración con el TPV, para que la comanda
        salga sola al cerrar la cuenta, todavía no existe.
      </>
    ),
  },
];

/**
 * The same questions in English.
 *
 * Written, not translated: an English speaker calls the paper a receipt and the
 * shared tab a bill, and «comanda» has no good one-word match. What matters is
 * that each answer stays as checkable as the Spanish one — no generic «we care
 * about your privacy», just what is actually stored.
 */
const PREGUNTAS_EN: { p: string; r: React.ReactNode }[] = [
  {
    p: "Is it really free?",
    r: <>Yes. No accounts, no payments, no paid tier waiting at the end. We don&apos;t even ask for an email.</>,
  },
  {
    p: "Do you keep the photo of my receipt?",
    r: (
      <>
        No. The photo is read there and then and thrown away: it isn&apos;t stored on the server or
        anywhere else. All that&apos;s left of the bill is what you see on screen —the dishes, the
        prices, the total and everyone&apos;s first name— and it stays for as long as the code exists.
      </>
    ),
  },
  {
    p: "Does everyone else have to install something?",
    r: (
      <>
        No. You send them the link or show them the QR and they open it in their phone&apos;s browser,
        like any other page. They only type a name so the table knows which dishes are theirs.
      </>
    ),
  },
  {
    p: "What if it reads a price wrong?",
    r: (
      <>
        You fix it by hand without leaving the bill: tap a line to change how it&apos;s shared, add
        anything missing with <b className="font-semibold text-ink">+ Something&apos;s missing</b> and
        remove what shouldn&apos;t be there. If the total it read doesn&apos;t match the paper, edit
        it in{" "}
        <b className="font-semibold text-ink">Totals</b>.
      </>
    ),
  },
  {
    p: "Who can see my bill?",
    r: (
      <>
        Anyone with the six-character code, the same as anyone who can read the receipt on the
        table. It doesn&apos;t show up on Google —bills are kept out of search on purpose— and the only
        personal detail is the first name each person types.
      </>
    ),
  },
  {
    p: "Do we all have to be there at once?",
    r: (
      <>
        No. The bill updates live on every phone, so everyone taps their own whenever they can. And
        if somebody never gets their phone out, another person can tap for them from the same
        screen.
      </>
    ),
  },
  {
    p: "What if we don't have the receipt?",
    r: (
      <>
        You write it out:{" "}
        <Link href="/nueva" className="text-amber underline underline-offset-4 hover:text-ink">
          note down what&apos;s on the table
        </Link>{" "}
        and it works the same. It also helps when the photo came out too blurry to read.
      </>
    ),
  },
  {
    p: "I run a bar — can I use it?",
    r: (
      <>
        Yes, by hand for now: create the bill{" "}
        <Link href="/nueva" className="text-amber underline underline-offset-4 hover:text-ink">
          from here
        </Link>{" "}
        and print the QR to leave on the table. Integration with the till, so the bill appears by
        itself when the tab is closed, doesn&apos;t exist yet.
      </>
    ),
  },
];

const TEXTO_PLANO_EN: Record<string, string> = {
  "Is it really free?":
    "Yes. No accounts, no payments, no paid tier. We don't even ask for an email.",
  "Do you keep the photo of my receipt?":
    "No. The photo is read there and then and thrown away: it isn't stored on the server. All that's left of the bill is what you see on screen: the dishes, the prices, the total and everyone's first name.",
  "Does everyone else have to install something?":
    "No. They open the link or the QR in their phone's browser. They only type a name so the table knows which dishes are theirs.",
  "What if it reads a price wrong?":
    "You fix it by hand on the bill itself: change how a line is shared, add what's missing, remove what shouldn't be there, and edit the total.",
  "Who can see my bill?":
    "Anyone with the six-character code. It doesn't appear in search engines and the only personal detail is each person's first name.",
  "Do we all have to be there at once?":
    "No. The bill updates live on every phone and everyone taps their own whenever they can.",
  "What if we don't have the receipt?":
    "You write it out by noting down what's on the table, and it works the same.",
  "I run a bar — can I use it?":
    "Yes, by creating the bill by hand and printing the QR for the table. Integration with the till doesn't exist yet.",
};

export default function Preguntas() {
  const lang = useLang();
  const preguntas = lang === "en" ? PREGUNTAS_EN : PREGUNTAS;
  const plano = lang === "en" ? TEXTO_PLANO_EN : TEXTO_PLANO;
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {lang === "en" ? "Questions" : "Preguntas"}
      </h2>

      {/* Ancho corto a propósito: una respuesta de sesenta caracteres por línea
          se lee; una que cruza toda la pantalla, no. */}
      <div className="mt-8 max-w-2xl space-y-2">
        {preguntas.map(({ p, r }) => (
          /* `details` nativo: se pliega sin JavaScript, el teclado y los
             lectores de pantalla ya lo entienden, y el texto sigue estando en
             el HTML aunque esté cerrado, así que los buscadores lo leen. */
          <details key={p} className="group rounded-xl border border-line bg-paper-2/40 transition-colors hover:border-line/80 hover:bg-paper-2/70">
            <summary className="flex cursor-pointer list-none items-center gap-4 rounded-xl px-4 py-3.5 font-semibold transition-colors hover:text-amber [&::-webkit-details-marker]:hidden">
              <span className="flex-1">{p}</span>
              <span
                aria-hidden
                className="shrink-0 text-lg leading-none text-ink-faint transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <p className="border-t border-line/60 px-4 py-3.5 text-sm leading-relaxed text-ink-soft">
              {r}
            </p>
          </details>
        ))}
      </div>

      {/*
        Marcado para buscadores. Google ya casi no enseña estos resultados
        enriquecidos salvo a sitios muy asentados, así que no se pone esperando
        estrellitas: se pone porque describe la página tal como es y no cuesta
        nada. Lo que de verdad posiciona es el texto de arriba.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: preguntas.map(({ p }) => ({
              "@type": "Question",
              name: p,
              acceptedAnswer: { "@type": "Answer", text: plano[p] },
            })),
          }),
        }}
      />
    </section>
  );
}

/**
 * La misma respuesta sin etiquetas, para el marcado de buscadores.
 *
 * Se escribe aparte en vez de sacarla del JSX porque el JSX lleva enlaces y
 * negritas que en un JSON-LD sobran, y arrancar el texto de unos nodos de React
 * en el servidor es más frágil que tenerlo escrito.
 */
const TEXTO_PLANO: Record<string, string> = {
  "¿Es gratis de verdad?":
    "Sí. No hay cuentas, ni pagos, ni una versión de pago. No pedimos ni un correo.",
  "¿Se guarda la foto de mi ticket?":
    "No. La foto se lee en el momento y se descarta: no se guarda en el servidor. De la comanda queda sólo lo que ves en pantalla: los platos, los precios, el total y el nombre de pila de cada uno.",
  "¿Tienen que instalarse algo los demás?":
    "No. Se abre el enlace o el QR en el navegador del móvil. Sólo escriben su nombre para que la mesa sepa qué platos son suyos.",
  "¿Y si lee mal un precio?":
    "Se corrige a mano en la propia comanda: cambiar cómo se reparte una línea, añadir lo que falte, quitar lo que sobre y editar el total.",
  "¿Quién puede ver mi comanda?":
    "Quien tenga el código de seis caracteres. No aparece en buscadores y el único dato personal es el nombre de pila de cada uno.",
  "¿Hace falta que estemos todos a la vez?":
    "No. La comanda se actualiza en directo en todos los móviles y cada uno marca lo suyo cuando puede.",
  "¿Y si no tenemos el ticket?":
    "Se escribe a mano apuntando lo que hay en la mesa, y funciona igual.",
  "Tengo un bar, ¿puedo usarlo?":
    "Sí, creando la comanda a mano e imprimiendo el QR para la mesa. La integración con el TPV todavía no existe.",
};
