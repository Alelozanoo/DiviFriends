"use client";

import { money } from "@/lib/format";
import type { Item, ItemBreakdown, Participant } from "@/lib/types";
import { Avatar } from "./ui";

interface Props {
  item: Item;
  breakdown: ItemBreakdown;
  participants: Participant[];
  meId: string | null;
  currency: string;
  onToggle: () => void;
  onSetShares: (shares: number) => void;
  onOpenOptions: () => void;
  onRemove: () => void;
}

/**
 * Cada línea de la comanda es una burbuja que se toca entera: tocas si te lo
 * has comido, vuelves a tocar si te has colado. Lo que necesitas saber antes
 * de tocar —cuánto te va a costar— es lo más grande de la burbuja.
 *
 * Si ya no queda sitio, la burbuja no se deja tocar. Antes crecía sola para
 * hacerte hueco y eso acababa cobrándote de más sin que lo pidieras; ahora
 * compartir algo que ya tiene dueño se pide a propósito, con el ÷.
 */
export default function ItemBubble({
  item,
  breakdown,
  participants,
  meId,
  currency,
  onToggle,
  onSetShares,
  onOpenOptions,
  onRemove,
}: Props) {
  const mine = breakdown.shares.find((s) => s.participantId === meId);
  const others = breakdown.shares.filter((s) => s.participantId !== meId);
  const byId = new Map(participants.map((p) => [p.id, p]));

  const isMine = Boolean(mine);
  const full = breakdown.freeShares === 0;
  const sharedNow = breakdown.shares.length > 1 || item.splitInto > item.qty;
  // Sin sitio y sin parte tuya no hay nada que tocar: para colarte está el ÷.
  const locked = full && !isMine;
  // De un «9 × Caña» puedes haberte bebido tres, y el + las va sumando.
  //
  // Sólo cuando cada parte es una unidad de verdad: en un «entre 2» una parte
  // es media línea y el + te duplicaría lo que pagas de un toque. Ése fue el
  // fallo de las nueve cervezas y por eso la condición sigue aquí.
  const canStep = item.qty > 1 && item.splitInto === item.qty;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border-2 transition-colors ${
        isMine
          ? "border-amber bg-amber/12"
          : full
            ? "border-line/60 bg-paper-2/50"
            : "border-line bg-paper-2"
      }`}
    >
      {/*
        Quitar la línea, en la esquina y a un toque.

        Vivía escondida al final de la hoja del ÷, que es un sitio raro para
        algo que no tiene nada que ver con repartir: para borrar una línea mal
        leída había que entrar a «dividir» primero. Va fuera del botón grande
        porque un botón dentro de otro no es HTML válido, y sigue pidiendo
        confirmación: es lo único de la comanda que no tiene vuelta atrás.
      */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar ${item.name} de la comanda`}
        className="absolute right-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full border border-line bg-paper-3/70 text-[0.7rem] leading-none text-ink-faint transition-colors hover:border-clay hover:bg-clay/15 hover:text-clay active:bg-clay/25"
      >
        ✕
      </button>

      <button
        type="button"
        onClick={onToggle}
        disabled={locked}
        aria-pressed={isMine}
        className="flex flex-1 flex-col gap-1.5 p-3 pr-11 pb-2 text-left transition-transform active:scale-[0.97] disabled:active:scale-100"
      >
        {/* cuántos hay de esto */}
        {/* El hueco de la derecha lo hace el pr-11 del botón padre, para que
            nada (ni el nombre ni el precio) pise la ✕ de borrar. */}
        <span className="flex items-start justify-between gap-1.5 w-full">
          <span
            className={`min-w-0 flex-1 text-[0.92rem] font-semibold leading-tight ${
              full && !isMine ? "text-ink-soft" : "text-ink"
            }`}
          >
            {item.name}
          </span>
          {/*
            Sólo unidades enteras. El «×9» está para decir «hay nueve, coge las
            tuyas», y es lo que cuenta el + de abajo. Una carnicería trae 1,025
            de entrañas, y ahí no hay nada que contar: un «×1,025» en una
            esquina no informa de nada y encima cabe mal. El peso exacto sigue
            estando en «Ver ticket», que es donde se va a comprobar el papel.
          */}
          {Number.isInteger(item.qty) && item.qty > 1 && (
            <span className="tnum shrink-0 rounded-md bg-paper-3 px-1.5 py-0.5 text-[0.7rem] font-bold text-ink-soft">
              ×{item.qty}
            </span>
          )}
        </span>

        {/*
          Lo que te cuesta tu parte: la cifra que se mira antes de tocar. Al
          lado, lo que vale la línea entera cuando no es lo mismo, que es lo
          que deja ver de un vistazo que estás pagando un trozo y no el todo.
        */}
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span
            className={`tnum text-xl font-bold leading-none ${isMine ? "text-amber" : "text-ink"}`}
          >
            {money(mine ? mine.cents : breakdown.perShareCents, currency)}
          </span>
          {item.splitInto > 1 && (
            <span className="tnum text-[0.68rem] leading-none text-ink-faint">
              de {money(item.totalCents, currency)}
            </span>
          )}
        </span>

        {/*
          Lo que queda libre manda sobre todo lo demás: es la única línea que
          dice si todavía hay algo que hacer con esta burbuja.
        */}
        <span className={`stamp ${breakdown.freeShares > 0 ? "text-mint" : "text-ink-faint"}`}>
          {breakdown.freeShares > 0
            ? `quedan ${breakdown.freeShares}`
            : isMine && mine!.shares > 1
              ? `tus ${mine!.shares} de ${item.splitInto}`
              : sharedNow
                ? `entre ${item.splitInto}`
                : "completo"}
        </span>
      </button>

      {/* quién lo lleva */}
      <div className="flex min-h-[26px] items-center gap-1 px-3 pb-2">
        {mine && <Avatar name="tú" color={byId.get(meId!)?.color ?? "#e8b04b"} size={22} />}
        {others.slice(0, 3).map((share) => {
          const person = byId.get(share.participantId);
          return person ? (
            <Avatar key={share.participantId} name={person.name} color={person.color} size={20} />
          ) : null;
        })}
        {others.length > 3 && (
          <span className="tnum text-[0.7rem] text-ink-faint">+{others.length - 3}</span>
        )}
      </div>

      {/*
        Una sola fila de mandos, pegada abajo del todo.

        A la izquierda se suman unidades sin abrir nada: de nueve cañas te vas
        marcando las tuyas a toques. A la derecha, repartir o quitar la línea.
        El ÷ se queda porque es el gesto de la app, pero ahora lleva la palabra
        al lado: como icono suelto en una esquina no lo entendía nadie.
      */}
      <div className="flex items-stretch border-t border-line/60">
        {isMine ? (
          canStep ? (
            <span className="flex flex-1 items-center justify-center border-r border-line/60">
              <Step
                label={`Quitar una unidad de ${item.name}`}
                onClick={() => onSetShares(mine!.shares - 1)}
              >
                −
              </Step>
              <span className="tnum w-6 text-center text-sm font-bold">{mine!.shares}</span>
              <Step
                label={`Añadir una unidad de ${item.name}`}
                disabled={full}
                highlight={false}
                onClick={() => onSetShares((mine?.shares ?? 0) + 1)}
              >
                +
              </Step>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSetShares(0)}
              className="flex flex-1 items-center justify-center gap-0.5 border-r border-line/60 py-2 text-[0.6rem] font-bold uppercase text-ink-soft transition-colors hover:text-clay active:bg-paper-3"
            >
              Quitar
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={full}
            onClick={() => onSetShares(1)}
            className="flex flex-1 items-center justify-center gap-0.5 border-r border-line/60 py-2 text-[0.6rem] font-bold uppercase text-ink-faint opacity-60 transition-all hover:opacity-100 hover:text-amber active:bg-paper-3 disabled:opacity-30"
          >
            Añadir
          </button>
        )}

        <button
          type="button"
          onClick={onOpenOptions}
          aria-label={`Repartir ${item.name} entre varios`}
          className="flex flex-1 items-center justify-center gap-0.5 py-2 text-[0.6rem] font-bold uppercase text-ink-faint opacity-60 transition-all hover:opacity-100 hover:text-mint active:bg-paper-3"
        >
          A medias
        </button>
      </div>
    </div>
  );
}

function Step({
  children,
  label,
  disabled,
  highlight,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  /** El primer + de una línea que aún no es tuya: es la invitación a empezar. */
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-full w-9 place-items-center text-lg font-bold transition-colors active:bg-paper-3 disabled:opacity-25 ${
        highlight ? "text-amber" : "text-ink-soft hover:text-amber"
      }`}
    >
      {children}
    </button>
  );
}
