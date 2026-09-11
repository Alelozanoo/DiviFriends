"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

/**
 * El guiado de la mesa de ejemplo.
 *
 * Cuatro pasos, y **ninguno se pasa leyendo**: cada uno se cierra haciendo la
 * cosa que explica. Marcar un plato, dividir uno entre varios, mirar las
 * cuentas. Un tutorial de «siguiente, siguiente, siguiente» se salta entero y
 * no enseña nada; éste no tiene botón de siguiente, sólo la mesa.
 *
 * El paso no se guarda en ninguna parte: se deduce de lo que hay en la mesa en
 * este momento. Si te vas atrás —te quitas el plato que habías cogido— el
 * guiado vuelve solo a ese paso, porque es la verdad de lo que has hecho. Y si
 * llegas a una mesa ya empezada, empieza donde estés.
 *
 * Va arriba del todo, donde estaba el aviso de «esto no es real», y se lo come:
 * dos carteles amarillos a la vez no los lee nadie. El aviso sigue estando, en
 * la línea pequeña de debajo.
 */
export default function TutorialDemo({
  paso,
  inicio,
}: {
  /** 0 unirse · 1 marcar · 2 dividir · 3 cuentas · 4 hecho. */
  paso: number;
  /** A dónde lleva el botón del final. */
  inicio: string;
}) {
  const t = useT();
  const pasos = [t.demo.paso0, t.demo.paso1, t.demo.paso2, t.demo.paso3, t.demo.paso4];
  const actual = pasos[Math.min(paso, pasos.length - 1)];
  const hecho = paso >= 4;

  return (
    <div className="mb-3 rounded-bloque border border-amber/35 bg-amber/[0.07] px-3.5 py-3">
      <div className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            {/* Cuatro puntos: cuánto llevas y cuánto queda, sin números que
                contar. El de ahora, lleno; los pasados, a medias. */}
            <span aria-hidden className="flex shrink-0 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <i
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full ${
                    i < paso ? "bg-amber/60" : i === paso ? "bg-amber" : "bg-amber/20"
                  }`}
                />
              ))}
            </span>
            <span className="text-[13px] font-bold text-amber">{actual.titulo}</span>
          </span>
          <span className="mt-1 block text-[12.5px] leading-snug text-ink-soft">
            {actual.texto}
          </span>
        </span>

        {hecho && (
          <Link
            href={inicio}
            className="shrink-0 rounded-pieza bg-amber px-3 py-2 text-[13px] font-bold text-paper transition-transform active:scale-[0.97]"
          >
            {t.demo.deVerdad}
          </Link>
        )}
      </div>

      {/* Que esto no es real se dice siempre, no sólo al final: alguien puede
          llegar a las cuentas y ver que le debe 7,40 € a una tal Bea. */}
      <p className="mt-2 border-t border-amber/20 pt-2 text-[11.5px] leading-snug text-ink-faint">
        {t.demo.aviso}
      </p>
    </div>
  );
}
