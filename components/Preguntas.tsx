import Link from "next/link";

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

export default function Preguntas() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
      <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Preguntas</h2>

      {/* Ancho corto a propósito: una respuesta de sesenta caracteres por línea
          se lee; una que cruza toda la pantalla, no. */}
      <div className="mt-8 max-w-2xl space-y-2">
        {PREGUNTAS.map(({ p, r }) => (
          /* `details` nativo: se pliega sin JavaScript, el teclado y los
             lectores de pantalla ya lo entienden, y el texto sigue estando en
             el HTML aunque esté cerrado, así que los buscadores lo leen. */
          <details key={p} className="group rounded-xl border border-line bg-paper-2/40">
            <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-3.5 font-semibold [&::-webkit-details-marker]:hidden">
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
            mainEntity: PREGUNTAS.map(({ p }) => ({
              "@type": "Question",
              name: p,
              acceptedAnswer: { "@type": "Answer", text: TEXTO_PLANO[p] },
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
