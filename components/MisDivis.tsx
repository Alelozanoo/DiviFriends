"use client";

import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/format";
import { cuando, useMisDivis, type DiviGuardado } from "@/lib/misDivis";
import { useT } from "@/lib/i18n";
import { Avatar } from "./ui";

/**
 * Las comandas por las que has pasado, para volver a la de anoche de un toque.
 *
 * Quien vuelve a esta web vuelve por dos cosas y sólo dos: «¿cuánto le debo a
 * Álex?» y «¿ya me han pagado todos?». Las dos son una cifra, así que la cifra
 * es lo más grande de cada fila. La competencia pone ahí «Activa», que no
 * responde a ninguna de las dos.
 *
 * No se pinta nada si no hay divis guardados: quien llega por primera vez ve la
 * portada exactamente igual que antes.
 */
export default function MisDivis() {
  const t = useT();
  const { divis, quitar } = useMisDivis();
  const [todos, setTodos] = useState(false);

  // `null` es «todavía no lo sé» —servidor o hidratación—, y pintar un hueco
  // vacío para luego rellenarlo daría un salto en la página.
  if (divis === null || divis.length === 0) return null;

  const VISIBLES = 3;
  const lista = todos ? divis : divis.slice(0, VISIBLES);
  const ocultos = divis.length - lista.length;

  return (
    <section className="mt-6">
      {/* Los dos rótulos, al mismo tono.

          El de la derecha iba a `/70` para quedar por detrás del otro, y con eso
          se caía a 3,3:1: `ink-faint` está calculado para dar 5,58:1 justo, no
          le sobra nada que rebajar. Ya queda en segundo plano por lo que es —un
          sello de once píxeles a la derecha del todo—, sin necesidad de que se
          borre. */}
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <p className="stamp text-ink-faint">{t.misDivis.titulo}</p>
        <p className="stamp text-ink-faint">{t.misDivis.donde}</p>
      </div>

      <ul className="space-y-1.5">
        {lista.map((divi) => (
          <Fila key={divi.code} divi={divi} onQuitar={() => quitar(divi.code)} t={t} />
        ))}
      </ul>

      {ocultos > 0 && (
        <button
          type="button"
          onClick={() => setTodos(true)}
          className="stamp mt-2 w-full rounded-xl border border-line py-2 text-ink-faint transition-colors hover:border-amber hover:text-amber"
        >
          {t.misDivis.verTodos} {divis.length}
        </button>
      )}
    </section>
  );
}

function Fila({ divi, onQuitar, t }: { divi: DiviGuardado; onQuitar: () => void; t: ReturnType<typeof useT> }) {
  const cobra = !divi.saldado && divi.cents < 0;
  const [confirmando, setConfirmando] = useState(false);

  /*
    Cerrar pide confirmación, y la confirmación dice qué pasa de verdad.

    Es importante que no se lea como «borrar la comanda»: esto sólo la quita de
    la lista de este móvil. La comanda sigue viva para los demás y se vuelve con
    el enlace o el código. Sin esa frase, quien lo pulse puede creer que acaba
    de cargarse la cuenta de la cena de todos.
  */
  if (confirmando) {
    return (
      <li className="rounded-caja border border-clay/40 bg-clay/[0.07] px-3.5 py-3">
        <p className="text-sm font-semibold">{t.misDivis.cerrarTitulo} {divi.place || divi.code}?</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-soft">
          {t.misDivis.cerrarAviso}
        </p>
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={onQuitar}
            className="flex-1 rounded-xl bg-clay py-2 text-xs font-bold text-paper transition-transform active:scale-[0.98]"
          >
            {t.misDivis.cerrarSi}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(false)}
            className="flex-1 rounded-xl border border-line py-2 text-xs font-semibold text-ink-soft"
          >
            {t.misDivis.cerrarNo}
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="relative">
      <Link
        href={`/t/${divi.code}`}
        className="flex items-center gap-3 rounded-caja border border-line bg-paper-2 py-2.5 pl-3.5 pr-11 transition-colors active:bg-paper-3"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {/* Sin nombre de sitio queda el código, que al menos identifica.
                «Comanda» a secas no distingue una de otra en una lista. */}
            {divi.place || divi.code}
          </span>

          <span className="mt-1 flex items-center gap-2">
            <span className="stamp shrink-0 text-ink-faint">{cuando(divi.at, t)}</span>
            {divi.gente.length > 0 && (
              <span className="flex items-center -space-x-1.5">
                {divi.gente.slice(0, 4).map((p, i) => (
                  <Avatar key={`${p.name}-${i}`} name={p.name} avatar={p.avatar} color={p.color} size={18} />
                ))}
                {divi.gente.length > 4 && (
                  <span className="tnum pl-2.5 text-[0.6rem] text-ink-faint">
                    +{divi.gente.length - 4}
                  </span>
                )}
              </span>
            )}
          </span>
        </span>

        {/* La cifra, que es a lo que se venía. El color ya dice de qué lado
            estás sin tener que leer la línea de abajo. */}
        <span className="shrink-0 text-right">
          {divi.saldado || divi.cents === 0 ? (
            <span className="stamp block text-mint">{t.misDivis.cuadrado}</span>
          ) : (
            <>
              <span
                className={`tnum block whitespace-nowrap text-base font-bold leading-tight ${
                  cobra ? "text-mint" : "text-amber"
                }`}
              >
                {money(Math.abs(divi.cents), divi.currency)}
              </span>
              {/* «Debes» sólo cuando hay a quién: mientras nadie haya marcado
                  quién puso la tarjeta no le debes nada a nadie todavía, eso
                  es sólo tu parte de la cuenta. */}
              <span className="stamp block text-ink-faint">
                {cobra ? t.misDivis.teDeben : divi.aQuien ? `${t.misDivis.a} ${divi.aQuien}` : t.misDivis.loTuyo}
              </span>
            </>
          )}
        </span>
      </Link>

      {/* Fuera del enlace: un botón dentro de otro no es HTML válido. Y hace
          falta, porque esta lista cuenta dónde has comido y el móvil se presta. */}
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        aria-label={`Cerrar ${divi.place || divi.code}`}
        /* A tono pleno: estaba a `/60`, o sea 2,77:1, y es la única cosa de la
           lista que borra algo. Lo que tiene que ser discreto es su peso, no su
           legibilidad. */
        className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-[0.7rem] text-ink-faint transition-colors hover:bg-clay/15 hover:text-clay"
      >
        ✕
      </button>
    </li>
  );
}
