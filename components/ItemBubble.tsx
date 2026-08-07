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
}

/**
 * Cada línea de la comanda es una burbuja que se toca entera: tocas si te lo
 * has comido, vuelves a tocar si te has colado. Lo que necesitas saber antes
 * de tocar —cuánto te va a costar— es lo más grande de la burbuja.
 *
 * El contador de partes sólo aparece cuando ya es tuya y hay más de una: así
 * la burbuja está limpia mientras decides, y detallada cuando ajustas.
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
}: Props) {
  const mine = breakdown.shares.find((s) => s.participantId === meId);
  const others = breakdown.shares.filter((s) => s.participantId !== meId);
  const byId = new Map(participants.map((p) => [p.id, p]));

  const isMine = Boolean(mine);
  const full = breakdown.freeShares === 0;
  const sharedNow = breakdown.shares.length > 1 || item.splitInto > item.qty;
  // De un «4 × Caña» puedes haberte bebido dos: con una línea de varias partes
  // ya cogida, el contador deja ajustar cuántas son tuyas sin salir de aquí.
  const canStep = isMine && item.splitInto > 1;

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
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={isMine}
        className="flex flex-1 flex-col gap-1.5 p-3 pb-2 text-left active:scale-[0.97] transition-transform"
      >
        {/* cuántos hay de esto */}
        <span className="flex items-start justify-between gap-1.5">
          <span
            className={`min-w-0 flex-1 text-[0.92rem] font-semibold leading-tight ${
              full && !isMine ? "text-ink-soft" : "text-ink"
            }`}
          >
            {item.name}
          </span>
          {item.qty > 1 && (
            <span className="tnum shrink-0 rounded-md bg-paper-3 px-1.5 py-0.5 text-[0.7rem] font-bold text-ink-soft">
              ×{item.qty}
            </span>
          )}
        </span>

        {/* lo que te cuesta tu parte: la cifra que se mira antes de tocar */}
        <span
          className={`tnum text-xl font-bold leading-none ${isMine ? "text-amber" : "text-ink"}`}
        >
          {money(mine ? mine.cents : breakdown.perShareCents, currency)}
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

      {/* cuántas son tuyas · quién más lo lleva · partir en N */}
      <div className="flex items-center gap-1 px-3 pb-2.5">
        {canStep ? (
          <span className="flex shrink-0 items-center rounded-lg bg-paper-3">
            <Step
              label={`Quitar una parte de ${item.name}`}
              onClick={() => onSetShares(mine!.shares - 1)}
            >
              −
            </Step>
            <span className="tnum w-5 text-center text-sm font-bold">{mine!.shares}</span>
            <Step
              label={`Añadir una parte de ${item.name}`}
              disabled={breakdown.freeShares === 0}
              onClick={() => onSetShares(mine!.shares + 1)}
            >
              +
            </Step>
          </span>
        ) : (
          mine && <Avatar name="tú" color={byId.get(meId!)?.color ?? "#e8b04b"} size={22} />
        )}

        <span className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          {others.slice(0, canStep ? 2 : 3).map((share) => {
            const person = byId.get(share.participantId);
            return person ? (
              <Avatar key={share.participantId} name={person.name} color={person.color} size={20} />
            ) : null;
          })}
          {others.length > (canStep ? 2 : 3) && (
            <span className="tnum text-[0.7rem] text-ink-faint">
              +{others.length - (canStep ? 2 : 3)}
            </span>
          )}
        </span>

        {/* Repartir entre varios y quitar la línea viven los dos aquí dentro. */}
        <button
          type="button"
          onClick={onOpenOptions}
          aria-label={`Opciones de ${item.name}: repartir o quitar`}
          className="shrink-0 rounded-lg px-1.5 py-1 text-base font-bold leading-none text-ink-faint transition-colors hover:bg-paper-3 hover:text-mint active:bg-paper-3"
        >
          ⋯
        </button>
      </div>
    </div>
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
      className="grid h-7 w-6 place-items-center text-base font-bold transition-colors hover:text-amber disabled:opacity-25"
    >
      {children}
    </button>
  );
}
