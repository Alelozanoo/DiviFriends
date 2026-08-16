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
import { useT } from "@/lib/i18n";

export default function GuideSheet({ onClose }: { onClose: () => void }) {
  const t = useT();

  function renderTextWithB(text: string) {
    const parts = text.split(/(<B>.*?<\/B>)/g);
    return parts.map((part, i) => {
      if (part.startsWith("<B>") && part.endsWith("</B>")) {
        return <B key={i}>{part.slice(3, -4)}</B>;
      }
      return part;
    });
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[21px] font-bold leading-tight tracking-[-0.025em]">{t.guia.titulo}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{t.guia.entradilla}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-[17px] leading-none text-ink-faint transition-colors hover:bg-paper-3 hover:text-ink active:bg-paper-3"
        >
          ✕
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {t.guia.preguntas.map(({ pregunta, pasos }, i) => (
          /* `details` nativo: se pliega solo, funciona sin JavaScript y el
             teclado y los lectores de pantalla ya saben manejarlo. */
          <details
            key={pregunta}
            open={i === 0}
            className="group overflow-hidden rounded-xl border border-line bg-paper"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
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
                <li key={n} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-soft">
                  <span className="tnum mt-px shrink-0 text-[13px] font-bold text-amber">{n + 1}</span>
                  <span>{renderTextWithB(paso)}</span>
                </li>
              ))}
            </ol>
          </details>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full min-h-[52px] rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
      >
        {t.guia.entendido}
      </button>
    </Sheet>
  );
}

/** Resalta el texto exacto de un botón de la app. */
function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}
