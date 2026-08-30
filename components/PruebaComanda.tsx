"use client";

import { useState } from "react";
import { computeSettlement } from "@/lib/settle";
import { money } from "@/lib/format";
import { useT, rellena } from "@/lib/i18n";
import type { Claim, Item, Participant, TicketState } from "@/lib/types";
import ItemRow from "./ItemRow";
import { Avatar } from "./ui";

/**
 * Las dos comandas, una al lado de la otra.
 *
 * Está para decidir mirando, no para quedarse: es la comparación entre lo que
 * hay hoy —cada línea dentro de su tarjeta— y lo que propongo —las líneas
 * sobre el papel, separadas por el filete de la impresora—. El «antes» usa el
 * `ItemRow` de verdad, no una copia mía, porque si lo dibujo yo puedo hacerlo
 * ganar sin querer.
 *
 * Se puede tocar: marcar una línea cambia el total de abajo en las dos, así que
 * se compara el gesto y no sólo la foto.
 */

const YO = "p_ale";

const GENTE: Participant[] = [
  { id: YO, ticketId: "T", name: "Ale", color: "#e8b04b", isPayer: true, settled: false },
  { id: "p_nacho", ticketId: "T", name: "Nacho", color: "#5ec5c0", isPayer: false, settled: false },
  { id: "p_rocio", ticketId: "T", name: "Rocío", color: "#e0705f", isPayer: false, settled: false },
];

const linea = (
  id: string,
  name: string,
  qty: number,
  totalCents: number,
  position: number,
): Item => ({
  id,
  ticketId: "T",
  name,
  qty,
  unitCents: Math.round(totalCents / qty),
  totalCents,
  splitInto: qty,
  manualSplit: false,
  position,
});

const LINEAS: Item[] = [
  linea("i1", "Caña Estrella", 2, 560, 0),
  linea("i2", "Vermut rojo", 1, 390, 1),
  linea("i3", "Croquetas de jamón", 3, 660, 2),
  linea("i4", "Ensaladilla", 1, 750, 3),
  linea("i5", "Pulpo a la brasa", 1, 1890, 4),
  linea("i6", "Coca-Cola Zero", 2, 500, 5),
  linea("i7", "Tarta de queso", 1, 620, 6),
  linea("i8", "Café solo", 4, 640, 7),
];

const DE_ENTRADA: Claim[] = [
  { itemId: "i1", participantId: YO, shares: 1 },
  { itemId: "i3", participantId: "p_nacho", shares: 1 },
  { itemId: "i4", participantId: "p_nacho", shares: 1 },
  { itemId: "i5", participantId: "p_rocio", shares: 1 },
  { itemId: "i8", participantId: YO, shares: 1 },
];

export default function PruebaComanda() {
  const t = useT();
  const [claims, setClaims] = useState<Claim[]>(DE_ENTRADA);
  const [comoTicket, setComoTicket] = useState(true);
  const [abierta, setAbierta] = useState<string | null>(null);

  const state: TicketState = {
    ticket: {
      id: "PRUEBA",
      place: "Taberna La Cantina",
      tableLabel: "Mesa 12",
      currency: "EUR",
      totalCents: 5994,
      payerId: YO,
      createdAt: "",
    },
    receipts: [],
    items: LINEAS,
    participants: GENTE,
    claims,
    events: [],
    pagos: [],
  };
  const settlement = computeSettlement(state);

  /** Marcar y desmarcar, que es el único gesto que importa comparar. */
  function alternar(itemId: string) {
    setClaims((previas) => {
      const mia = previas.find((c) => c.itemId === itemId && c.participantId === YO);
      if (mia) return previas.filter((c) => c !== mia);
      const item = LINEAS.find((i) => i.id === itemId)!;
      const cogidas = previas
        .filter((c) => c.itemId === itemId)
        .reduce((a, c) => a + c.shares, 0);
      if (cogidas >= item.splitInto) return previas;
      return [...previas, { itemId, participantId: YO, shares: 1 }];
    });
  }

  const mio = settlement.byParticipant.find((p) => p.participantId === YO);
  const repartido = settlement.assignedCents;

  return (
    <div className="mx-auto w-full max-w-md px-[var(--gutter)] pb-28">
      {/* el mando de la prueba */}
      <div className="sticky top-0 z-20 -mx-[var(--gutter)] bg-paper/95 px-[var(--gutter)] pb-3 pt-4 backdrop-blur">
        <div className="grid grid-cols-2 gap-2 rounded-pieza border border-line bg-paper-2 p-1">
          {[
            { id: false, texto: "Como está ahora" },
            { id: true, texto: "Como quedaría" },
          ].map((o) => (
            <button
              key={String(o.id)}
              type="button"
              onClick={() => setComoTicket(o.id)}
              className={`min-h-[42px] rounded-menudo text-[15px] font-semibold transition-colors ${
                comoTicket === o.id ? "bg-paper-4 text-ink" : "text-ink-faint"
              }`}
            >
              {o.texto}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-[12px] text-ink-faint">
          Toca una línea para cogerla. Los números son de verdad.
        </p>
      </div>

      {/* la cabecera de la mesa, igual en las dos */}
      <div className="mt-4">
        <p className="text-[17px] font-bold tracking-[-0.02em]">{state.ticket.place}</p>
        <div className="rule mt-3" />
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <span className="stamp text-ink-faint">{t.comanda.repartido}</span>
          <span className="tnum text-[15px] font-bold">
            {money(repartido, "EUR")}{" "}
            <span className="font-normal text-ink-faint">/ {money(5994, "EUR")}</span>
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-amber transition-all duration-300"
            style={{ width: `${Math.max(0, (repartido / 5994) * 100)}%` }}
          />
        </div>
      </div>

      {comoTicket ? (
        /* ---------------------------------------------------- el ticket */
        <ul className="mt-5 grid list-none">
          {LINEAS.map((item, i) => (
            <FilaTicket
              key={item.id}
              item={item}
              breakdown={settlement.byItem[item.id]}
              participants={GENTE}
              primera={i === 0}
              onTocar={() => alternar(item.id)}
            />
          ))}
        </ul>
      ) : (
        /* ------------------------------------------------ las tarjetas */
        <ul className="mt-5 grid list-none gap-[9px]">
          {LINEAS.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              breakdown={settlement.byItem[item.id]}
              participants={GENTE}
              meId={YO}
              currency="EUR"
              open={abierta === item.id}
              onOpen={() => setAbierta(abierta === item.id ? null : item.id)}
              onSetShares={(shares) => (shares > 0 ? alternar(item.id) : alternar(item.id))}
              onOpenOptions={() => {}}
              onRemove={() => {}}
            />
          ))}
        </ul>
      )}

      {/* la barra de abajo, igual en las dos */}
      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3 px-[var(--gutter)] py-3">
          <span>
            <span className="stamp block text-ink-faint">{t.comanda.loTuyo}</span>
            <span className="tnum text-[24px] font-bold leading-tight">
              {money(mio?.owesCents ?? 0, "EUR")}
            </span>
          </span>
          <span className="rounded-pieza bg-amber px-5 py-3 text-[15px] font-bold text-paper">
            {t.comanda.cuentas}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Una línea de la comanda, dibujada como lo que es: un renglón de un ticket.
 *
 * Lo que cambia respecto de la tarjeta no es el adorno, es de dónde sale la
 * jerarquía. Antes cada línea traía su caja —borde, fondo y esquina— y ocho
 * cajas iguales no dejan mirar a ninguna: el ojo tiene que leerlas todas para
 * encontrar la suya. Aquí el papel es el fondo, las líneas se separan con el
 * filete de la impresora, y lo único que dibuja una caja es lo que es tuyo:
 * una franja ámbar que se sale por los dos lados, como un subrayado hecho
 * encima del papel y no un recuadro pegado al lado.
 *
 * Se gana sitio de paso: sin bordes ni huecos entre tarjetas caben nueve líneas
 * donde antes cabían seis, que en una comanda de bar es la diferencia entre
 * verla entera y andar bajando.
 */
function FilaTicket({
  item,
  breakdown,
  participants,
  primera,
  onTocar,
}: {
  item: Item;
  breakdown: import("@/lib/types").ItemBreakdown;
  participants: Participant[];
  primera: boolean;
  onTocar: () => void;
}) {
  const t = useT();
  const mia = breakdown.shares.find((s) => s.participantId === YO);
  const porId = new Map(participants.map((p) => [p.id, p]));
  const otros = breakdown.shares
    .filter((s) => s.participantId !== YO)
    .map((s) => porId.get(s.participantId))
    .filter((p): p is Participant => Boolean(p));
  const agotada = breakdown.freeShares === 0 && !mia;

  const precio =
    item.splitInto > 1
      ? `${item.splitInto} × ${money(breakdown.perShareCents, "EUR")}`
      : money(item.totalCents, "EUR");
  const quedan =
    breakdown.freeShares > 0
      ? rellena(t.linea.quedanN, { n: breakdown.freeShares })
      : mia
        ? ""
        : t.linea.completo;

  return (
    <li>
      {!primera && <div className="rule" />}
      <button
        type="button"
        onClick={onTocar}
        className={`relative -mx-[var(--gutter)] flex w-[calc(100%+2*var(--gutter))] items-baseline gap-3 px-[var(--gutter)] py-3 text-left transition-colors active:bg-paper-2 ${
          mia ? "bg-amber/[0.07]" : ""
        }`}
      >
        {/* El subrayado de lo tuyo: pegado al borde de la pantalla, como una
            marca de bolígrafo en el margen del papel. */}
        {mia && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-amber" />}

        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[17px] font-semibold leading-tight tracking-[-0.01em] ${
              agotada ? "text-ink-soft" : ""
            }`}
          >
            {item.name}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <span className="tnum text-[13px] text-ink-faint">
              {precio}
              {quedan && ` · ${quedan}`}
            </span>
            {otros.length > 0 && (
              <span className="flex items-center -space-x-1.5">
                {otros.slice(0, 3).map((p) => (
                  <Avatar key={p.id} name={p.name} avatar={p.avatar} color={p.color} size={17} />
                ))}
              </span>
            )}
          </span>
        </span>

        <span className="shrink-0 text-right">
          <span
            className={`tnum block text-[17px] font-bold leading-tight ${
              mia ? "text-amber" : "text-ink-faint"
            }`}
          >
            {mia ? money(mia.cents, "EUR") : "—"}
          </span>
          {mia && item.splitInto > 1 && (
            <span className="tnum text-[12px] leading-tight text-amber/80">
              {rellena(t.linea.nDeM, { n: mia.shares, total: item.splitInto })}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
