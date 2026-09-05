"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";
import type { Item, ItemBreakdown, Participant } from "@/lib/types";
import { useT, rellena } from "@/lib/i18n";
import { Avatar } from "./ui";

interface Props {
  item: Item;
  breakdown: ItemBreakdown;
  participants: Participant[];
  meId: string | null;
  currency: string;
  /** Sólo hay una fila abierta a la vez, así que lo manda la lista. */
  open: boolean;
  onOpen: () => void;
  onSetShares: (shares: number) => void;
  onOpenOptions: () => void;
  onRemove: () => void;
}

/**
 * Una línea de la comanda.
 *
 * En reposo sólo dice lo que hace falta para decidir: qué es, cuánto te toca a
 * ti y si queda algo libre. Los mandos aparecen al tocarla y no antes, porque
 * con cuatro botones fijos por línea la lista era un panel de mandos y no una
 * cuenta.
 *
 * Tocar la fila ya no marca el plato. Marcaba, y era un gesto sin vuelta atrás
 * visible: te cobrabas algo de un roce y no había nada en pantalla que dijera
 * qué había pasado. Ahora abre, y lo que cobra es un botón con su palabra.
 */
export default function ItemRow({
  item,
  breakdown,
  participants,
  meId,
  currency,
  open,
  onOpen,
  onSetShares,
  onOpenOptions,
  onRemove,
}: Props) {
  const t = useT();
  const mine = breakdown.shares.find((s) => s.participantId === meId);
  const byId = new Map(participants.map((p) => [p.id, p]));
  const gente = breakdown.shares
    .map((s) => byId.get(s.participantId))
    .filter((p): p is Participant => Boolean(p));

  const isMine = Boolean(mine);
  const full = breakdown.freeShares === 0;
  /*
    La línea que ya se ha pedido otro.

    Se atenuaba la fila entera al 50 %, y eso no bajaba un escalón: dejaba el
    renglón de debajo —el precio y el «completo»— en 2,26:1 sobre la tarjeta,
    la peor cifra de la app y menos de la mitad del mínimo. Además parecía
    desactivada, cuando se puede abrir igual que las demás para ver quién la
    tiene o quitársela a alguien.

    Ahora recede hundiéndose en la página en vez de desvaneciéndose: fondo del
    color del papel, más oscuro que la tarjeta, y el nombre un punto por debajo
    del blanco. Se lee menos, pero se lee.
  */
  const agotada = full && !isMine;
  // De un «9 × Caña» puedes haberte bebido tres, y el + las va sumando. Sólo
  // cuando cada parte es una unidad de verdad: en un «entre 2» una parte es
  // media línea y el + te duplicaría lo que pagas de un toque.
  const canStep = item.qty > 1 && item.splitInto === item.qty;

  /* El anillo de los avatares apilados va del color del fondo de la fila, que
     cambia con el estado. Se pasa como variable para no repetir el cálculo. */
  const fondo = isMine
    ? open
      ? "#282013"
      : "#241d13"
    : agotada
      ? open
        ? "#1c1714"
        : "#14100d"
      : open
        ? "#262019"
        : "#1c1714";

  /*
    «Completo» sobra cuando la línea es tuya.

    A la derecha ya va el ✓ con la frase de quién la lleva, y en una línea de
    tres cañas repartidas entre dos el renglón salía «3 × 2,50 € · comple…»:
    se cortaba justo la palabra que menos falta hacía. Cuando la línea no es
    tuya sí se queda, porque ahí es el dato que decide —dice que no queda nada
    que pedirse.
  */
  /*
    «Completo» también cuando la línea es tuya.

    Se callaba en ese caso para que no se cortara el renglón, y con eso quien
    acababa de coger la última unidad no tenía ni una palabra que le dijera
    qué había pasado: pulsabas y la fila se iba al fondo de la lista. Ya no se
    va —la lista no se reordena—, así que la palabra es lo único que queda por
    decir, y hace falta justo en el momento en que eres tú quien la llena.
  */
  const quedan =
    breakdown.freeShares > 0
      ? rellena(t.linea.quedanN, { n: breakdown.freeShares })
      : t.linea.completo;
  const precio =
    item.splitInto > 1
      ? `${item.splitInto} × ${money(breakdown.perShareCents, currency)}`
      : money(item.totalCents, currency);
  const meta = quedan ? `${precio} · ${quedan}` : precio;

  /*
    Lo que la fila dice de tu parte, en palabras.

    Ponía «✓ Tuyo ×2 ÷2» y hay que descifrarlo: el ×2 eran las unidades que
    habías cogido y el ÷2 en cuántas partes está partida la línea, dos cosas
    distintas escritas igual y pegadas. Ahora cada caso dice una frase: cuántas
    llevas de cuántas, o con cuánta gente lo compartes.
  */
  const otros = breakdown.shares.filter((s) => s.participantId !== meId).length;
  const loTuyo = (() => {
    if (!mine) return "";
    if (otros > 0) {
      const con =
        otros === 1 ? t.linea.tuYUnoMas : rellena(t.linea.tuYVariosMas, { n: otros });
      // Con varias unidades tuyas hace falta decir cuántas: compartir la línea
      // no dice si te tomaste una caña o tres.
      return mine.shares > 1 ? `${mine.shares} · ${con}` : con;
    }
    if (mine.shares < item.splitInto) {
      return rellena(t.linea.nDeM, { n: mine.shares, total: item.splitInto });
    }
    return t.linea.tuyo;
  })();

  const rotulo = [
    item.name,
    mine ? `${loTuyo}, ${money(mine.cents, currency)}` : `${t.comanda.loTuyo}: 0`,
    meta,
  ].join(", ");

  /*
    El destello: un segundo de verde cuando la línea acaba de llenarse.

    Es lo que sustituye al viaje al fondo de la lista. No hay que pulsar nada
    ni sale ningún cartel encima: la propia fila dice «ya está» y se apaga.
    Sólo en la transición, nunca al abrir la mesa: si no, entrar en una
    comanda a medias sería una fila de luces de discoteca.
  */
  const eraLlena = useRef(full);
  const [destello, setDestello] = useState(false);
  useEffect(() => {
    if (full && !eraLlena.current) {
      setDestello(true);
      const reloj = setTimeout(() => setDestello(false), 1200);
      eraLlena.current = full;
      return () => clearTimeout(reloj);
    }
    eraLlena.current = full;
  }, [full]);

  return (
    <li
      data-destello={destello || undefined}
      style={{ ["--fila" as string]: fondo }}
      className={`overflow-hidden rounded-caja border-[1.5px] transition-colors duration-200 ${
        isMine
          ? open
            ? "border-amber bg-amber/[0.13]"
            : "border-amber bg-amber/[0.085]"
          : agotada
            ? open
              ? "border-line-soft bg-paper-2"
              : "border-line-soft/50 bg-paper"
            : open
              ? "border-line-soft bg-paper-3"
              : "border-line-soft bg-paper-2"
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-expanded={open}
        aria-label={rotulo}
        className="grid min-h-[70px] w-full gap-2 px-[13px] py-3 text-left"
      >
        <span className="flex items-baseline gap-2.5">
          <span
            className={`min-w-0 flex-1 text-[17px] font-semibold leading-tight tracking-[-0.01em] ${
              agotada ? "text-ink-soft" : ""
            }`}
          >
            {item.name}
          </span>
          {/* La cifra de la derecha significa siempre lo mismo: lo que pagas tú. */}
          <span
            className={`tnum shrink-0 text-[17px] font-bold ${
              isMine ? "text-amber" : "text-ink-faint"
            }`}
          >
            {mine ? money(mine.cents, currency) : "—"}
          </span>
        </span>

        <span className="flex min-w-0 items-center gap-2.5">
          <span className="tnum min-w-0 flex-1 truncate text-[13px] text-ink-faint">{meta}</span>
          <span className="flex shrink-0 items-center gap-2">
            {gente.length > 0 && (
              <span className="flex">
                {gente.slice(0, 3).map((person, i) => (
                  <span
                    key={person.id}
                    className="rounded-full"
                    style={{
                      marginLeft: i === 0 ? 0 : -6,
                      boxShadow: "0 0 0 2px var(--fila)",
                    }}
                  >
                    <Avatar
                      name={person.name}
                      avatar={person.avatar}
                      color={person.color}
                      size={25}
                    />
                  </span>
                ))}
              </span>
            )}
            {/*
              Forma además de color: quien no distinga el ámbar sigue viendo un
              ✓ con palabra cuando la línea es suya, y unas casillas llenas o
              vacías cuando no lo es.
            */}
            {isMine ? (
              <span className="whitespace-nowrap text-[13px] font-bold text-amber">
                ✓ {loTuyo}
              </span>
            ) : (
              /* Sólo cuando hay partes que contar: en una línea de una sola
                 parte, un pip suelto no dice nada que no diga ya el avatar. */
              item.splitInto > 1 &&
              item.splitInto <= 6 && (
                <span aria-hidden className="flex gap-[3px]">
                  {Array.from({ length: item.splitInto }, (_, i) => (
                    <i
                      key={i}
                      className={`h-1.5 w-3 rounded-[2px] border ${
                        i < item.splitInto - breakdown.freeShares
                          ? "border-amber bg-amber"
                          : "border-line bg-paper-3"
                      }`}
                    />
                  ))}
                </span>
              )
            )}
          </span>
        </span>
      </button>

      {/* Los mandos, sólo cuando se pide la fila. */}
      <div className="slot" data-open={open}>
        <div>
          <div className="flex gap-2 border-t border-line-soft px-[13px] pb-[13px] pt-[11px]">
            {isMine && canStep ? (
              <span className="flex flex-1 items-center rounded-bloque bg-amber">
                <Step
                  label={`${t.linea.quitarUnidad} ${item.name}`}
                  onClick={() => onSetShares(mine!.shares - 1)}
                >
                  −
                </Step>
                <span className="tnum flex-1 text-center text-[15px] font-bold text-paper">
                  {mine!.shares}
                </span>
                <Step
                  label={`${t.linea.anadirUnidad} ${item.name}`}
                  disabled={full}
                  onClick={() => onSetShares(mine!.shares + 1)}
                >
                  +
                </Step>
              </span>
            ) : isMine ? (
              <button
                type="button"
                onClick={() => onSetShares(0)}
                className="flex min-h-[46px] flex-1 items-center justify-center rounded-pieza border border-line px-4 text-[15px] font-semibold text-ink transition-colors active:bg-paper-2"
              >
                {t.linea.yaNo}
              </button>
            ) : (
              <button
                type="button"
                disabled={full}
                onClick={() => onSetShares(1)}
                className="flex min-h-[46px] flex-1 items-center justify-center rounded-pieza bg-amber px-4 text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
              >
                {t.linea.esMio}
              </button>
            )}

            <button
              type="button"
              onClick={onOpenOptions}
              aria-label={rellena(t.linea.repartirEntreVarios, { name: item.name })}
              className="flex min-h-[46px] flex-1 items-center justify-center gap-1.5 rounded-pieza border border-line px-4 text-[15px] font-semibold text-ink transition-colors active:bg-paper-2"
            >
              ÷ {t.linea.dividir}
            </button>

            <button
              type="button"
              onClick={onRemove}
              aria-label={rellena(t.linea.masOpciones, { name: item.name })}
              className="grid min-h-[46px] w-[50px] shrink-0 place-items-center rounded-pieza border border-line text-[15px] text-ink-soft transition-colors active:bg-paper-2"
            >
              ⋯
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

function Step({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid min-h-[46px] w-12 place-items-center rounded-pieza text-[21px] font-bold text-paper disabled:opacity-35"
    >
      {children}
    </button>
  );
}
