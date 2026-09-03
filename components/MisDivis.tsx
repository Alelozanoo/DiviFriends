"use client";

import Link from "next/link";
import { useState } from "react";
import { money } from "@/lib/format";
import { cuando, useMisDivis, type DiviGuardado } from "@/lib/misDivis";
import { useT } from "@/lib/i18n";
import { useCuenta } from "@/lib/cuenta";
import { Avatar, CerrarHoja, Sheet } from "./ui";

/**
 * Las comandas por las que has pasado, para volver a la de anoche de un toque.
 *
 * Quien vuelve a esta web vuelve por dos cosas y sólo dos: «¿cuánto le debo a
 * Álex?» y «¿ya me han pagado todos?». Las dos son una cifra, así que la cifra
 * es lo más grande de cada fila. La competencia pone ahí «Activa», que no
 * responde a ninguna de las dos.
 *
 * Vive detrás de un icono de la cabecera y no debajo del papel, que es donde
 * estaba. Con tres divis guardadas la lista se comía media pantalla y dejaba
 * el ticket en una franja de 360 por 235: ancho, chato y sin parecer un
 * ticket. Y peor: la primera pantalla cambiaba de forma según cuántas divis
 * llevaras, cuando es la que tiene que decir siempre lo mismo —haz la foto—.
 *
 * Sin divis guardadas el icono no existe. Quien llega por primera vez ve la
 * cabecera limpia y el papel entero.
 */
export default function MisDivisBoton() {
  const t = useT();
  const { divis } = useMisDivis();
  const [abierta, setAbierta] = useState(false);

  // `null` es «todavía no lo sé» —servidor o hidratación—, y pintar el icono
  // para quitarlo medio segundo después es un parpadeo en cada visita.
  if (divis === null || divis.length === 0) return null;

  /*
    El punto sólo cuando hay dinero de por medio, y sin número: el número ya
    está dentro, y la campana de al lado usa cifra en rojo para lo que no has
    visto. Dos contadores juntos no se distinguen de un golpe.
  */
  const algoVivo = divis.some((d) => !d.saldado && d.cents !== 0);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        aria-label={t.misDivis.titulo}
        className="relative grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
      >
        {/* Un ticket: papel con los dientes de la impresora y dos renglones. */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 3.5h12v15.5l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2z" />
          <path d="M9.5 8h5M9.5 11.5h5" />
        </svg>
        {algoVivo && (
          <span aria-hidden className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-paper bg-amber" />
        )}
      </button>

      {abierta && <MisDivisHoja onClose={() => setAbierta(false)} />}
    </>
  );
}

/** La lista, entera y con su propio scroll: en una hoja no hace falta cortarla. */
function MisDivisHoja({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { divis, quitar } = useMisDivis();
  const { usuario } = useCuenta();
  const lista = divis ?? [];

  return (
    <Sheet onClose={onClose} titulo={t.misDivis.titulo} sub={usuario ? t.misDivis.enTuCuenta : t.misDivis.donde}>
      <div className="mt-4">
        <ul className="space-y-1.5">
          {lista.map((divi) => (
            <Fila key={divi.code} divi={divi} onQuitar={() => quitar(divi.code)} t={t} />
          ))}
        </ul>

      </div>

      <div className="mt-4">
        <CerrarHoja onClick={onClose}>{t.cuenta.cerrar}</CerrarHoja>
      </div>
    </Sheet>
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
      <span className="text-[12px] shrink-0 text-ink-faint">{cuando(divi.at, t)}</span>
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
      <span className="text-[12px] block text-mint">{t.misDivis.cuadrado}</span>
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
       <span className="text-[12px] block text-ink-faint">
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
