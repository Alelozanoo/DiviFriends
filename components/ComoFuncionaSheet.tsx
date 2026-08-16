"use client";

import { useState } from "react";
import { PASOS } from "./ComoVa";
import { useT } from "@/lib/i18n";
import { Sheet } from "./ui";

/**
 * El «cómo funciona» a un toque desde el pie.
 *
 * Enseña los mismos cuatro pasos dibujados de la portada, y no un texto
 * aparte: dos explicaciones de lo mismo acaban contando cosas distintas en
 * cuanto una se queda sin actualizar.
 *
 * En el móvil es además la única manera de llegar a ellos, porque ahí la
 * sección va escondida para que la pantalla sea sólo la app. Quien quiera
 * saber de qué va esto lo tiene aquí abajo, y quien venga a repartir una
 * cuenta no se lo encuentra por delante.
 */
export default function ComoFuncionaSheet() {
  const t = useT();
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="underline underline-offset-2 transition-colors hover:text-amber"
      >
        {t.home.comoFunciona}
      </button>

      {abierto && (
        <Sheet onClose={() => setAbierto(false)}>
          {/* Pegada arriba: la hoja es más alta que la pantalla —son cuatro
              dibujos— y un cierre al final obliga a bajarlo todo para salir. */}
          <div className="sticky -top-2 z-10 -mx-[var(--gutter)] -mt-2 flex items-start justify-between gap-3 bg-paper-2/95 px-[var(--gutter)] pb-3 pt-2 backdrop-blur">
            <div>
              <h2 className="text-[21px] font-bold leading-tight tracking-[-0.025em]">{t.pasos.titulo}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{t.pasos.entradilla}</p>
            </div>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar"
              className="-mr-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-[17px] leading-none text-ink-faint transition-colors hover:bg-paper-3 hover:text-ink active:bg-paper-3"
            >
              ✕
            </button>
          </div>

          <ol className="mt-4 space-y-6">
            {PASOS(t).map(({ n, title, foot, Pieza }) => (
              <li key={n} className="flex flex-col">
                <div>
                  <p className="flex items-baseline gap-2.5">
                    <span className="tnum text-[15px] font-bold text-amber">{n}</span>
                    <span className="text-[17px] font-semibold tracking-tight">{title}</span>
                  </p>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{foot}</p>
                </div>
                <div className="mt-4 flex-1">
                  <Pieza />
                </div>
              </li>
            ))}
          </ol>

          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="mt-6 w-full min-h-[52px] rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
          >
            {t.pasos.entendido}
          </button>
        </Sheet>
      )}
    </>
  );
}
