"use client";

import { Sheet } from "./ui";

/**
 * La guía de la comanda, detrás del icono de información.
 *
 * Va plegada por secciones a propósito: quien la abre viene con una duda
 * concreta —«¿cómo divido esto?»— y un muro de texto le obliga a leerlo todo
 * para encontrarla. Los títulos están escritos como la pregunta que se hace la
 * gente, no como el nombre de la función.
 *
 * Cada paso nombra el botón con las mismas palabras que aparecen en pantalla.
 * Un tutorial que dice «pulsa en opciones» cuando el botón pone «÷ Dividir» no
 * sirve de nada.
 */
const SECCIONES: { pregunta: string; pasos: React.ReactNode[] }[] = [
  {
    pregunta: "¿Cómo marco lo que me he tomado?",
    pasos: [
      <>Toca la tarjeta del plato. Se pone en ámbar y aparece tu ficha.</>,
      <>
        Vuelve a tocarla para soltarlo si te has colado. Abajo del todo,{" "}
        <B>Lo tuyo</B> va sumando en directo.
      </>,
      <>
        Si había varias unidades —tres cañas, por ejemplo— usa el <B>+</B> para
        ir sumando las tuyas de una en una.
      </>,
    ],
  },
  {
    pregunta: "¿Cómo divido un plato entre varios?",
    pasos: [
      <>
        Toca <B>÷ Dividir</B> en la tarjeta del plato. Van dos preguntas
        seguidas.
      </>,
      <>
        <B>Entre cuántos.</B> Debajo de cada número tienes lo que costaría cada
        parte. Tu parte queda fijada ahí mismo, sin esperar a que se apunte
        nadie.
      </>,
      <>
        <B>Con quién.</B> Toca a los de la mesa, y a quien no esté lo apuntas
        ahí mismo escribiendo su nombre.
      </>,
      <>
        A quien apuntes le saldrá su nombre esperándole cuando entre por el
        enlace: sólo tiene que tocarlo y hereda lo que le marcaste.
      </>,
    ],
  },
  {
    pregunta: "¿Falta algo, o sobra?",
    pasos: [
      <>
        Para añadir un plato suelto: el recuadro de puntos <B>+ Falta algo</B>, al final de la
        lista.
      </>,
      <>
        Para añadir otro ticket entero a la misma cuenta: pulsa <B>+ Añadir</B> en la barra superior.
      </>,
      <>
        Para quitar una línea o reducir su cantidad: la <B>✕</B> de su esquina. 
        El total del ticket baja automáticamente, así que queda anotado en el <B>historial</B> con el
        nombre de quien lo hizo.
      </>,
      <>
        Si el total leído no cuadra con el papel, se corrige en <B>Cuentas</B>,
        en <B>Total del ticket</B>.
      </>,
    ],
  },
  {
    pregunta: "¿Cómo meto a los demás?",
    pasos: [
      <>
        Arriba a la derecha, <B>Compartir</B>. Sale el QR y el enlace de la mesa.
      </>,
      <>
        Cada uno entra desde su móvil, escribe su nombre y marca lo suyo sobre la
        misma comanda.
      </>,
      <>
        También puedes apuntarlos tú desde ahí y marcar lo que ha tomado cada uno.
      </>,
    ],
  },
  {
    pregunta: "¿Y al final, quién paga?",
    pasos: [
      <>
        En <B>Cuentas</B>, marca quién ha pagado cada ticket de la lista.
      </>,
      <>
        Sale lo que le debe cada uno, de más a menos. Cuando le devuelvas lo
        tuyo, toca <B>He pagado</B>.
      </>,
      <>
        Quien pagó ve el balance de todos: los que deben pagar están en negro y los que tienen saldo a su favor en verde.
      </>,
    ],
  },
];

export default function GuideSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Cómo funciona</h2>
          <p className="mt-1 text-sm text-ink-soft">Toca una pregunta para desplegarla.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-lg leading-none text-ink-faint transition-colors hover:bg-paper-3 hover:text-ink active:bg-paper-3"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {SECCIONES.map(({ pregunta, pasos }, i) => (
          /* `details` nativo: se pliega solo, funciona sin JavaScript y el
             teclado y los lectores de pantalla ya saben manejarlo. */
          <details
            key={pregunta}
            open={i === 0}
            className="group overflow-hidden rounded-xl border border-line bg-paper"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span className="flex-1">{pregunta}</span>
              <span
                aria-hidden
                className="shrink-0 text-ink-faint transition-transform group-open:rotate-45"
              >
                +
              </span>
            </summary>

            <ol className="space-y-2.5 border-t border-line/60 px-4 py-3">
              {pasos.map((paso, n) => (
                <li key={n} className="flex gap-2.5 text-sm leading-relaxed text-ink-soft">
                  <span className="tnum mt-px shrink-0 text-xs font-bold text-amber">{n + 1}</span>
                  <span>{paso}</span>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-xl bg-amber py-3 text-sm font-bold text-paper transition-transform active:scale-[0.98]"
      >
        Entendido
      </button>
    </Sheet>
  );
}

/** Resalta el texto exacto de un botón de la app. */
function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}
