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
  onOpenSplit: () => void;
}

/**
 * Cada línea de la comanda es una burbuja que se toca entera. Sin steppers ni
 * conmutadores: tocas si te lo has comido, vuelves a tocar si te has colado.
 * Lo que necesitas saber antes de tocar —cuánto te va a costar— es lo más
 * grande de la burbuja.
 */
export default function ItemBubble({
  item,
  breakdown,
  participants,
  meId,
  currency,
  onToggle,
  onOpenSplit,
}: Props) {
  const mine = breakdown.shares.find((s) => s.participantId === meId);
  const others = breakdown.shares.filter((s) => s.participantId !== meId);
  const byId = new Map(participants.map((p) => [p.id, p]));

  const isMine = Boolean(mine);
  const full = breakdown.freeShares === 0;
  const sharedNow = breakdown.shares.length > 1 || item.splitInto > item.qty;

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

      {/* quién lo lleva + partir en N */}
      <div className="flex items-center gap-1 px-3 pb-2.5">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {mine && <Avatar name="tú" color={byId.get(meId!)?.color ?? "#e8b04b"} size={22} />}
          {others.slice(0, 3).map((share) => {
            const person = byId.get(share.participantId);
            return person ? (
              <Avatar key={share.participantId} name={person.name} color={person.color} size={22} />
            ) : null;
          })}
          {others.length > 3 && (
            <span className="tnum text-[0.7rem] text-ink-faint">+{others.length - 3}</span>
          )}
        </span>

        <button
          type="button"
          onClick={onOpenSplit}
          aria-label={`Compartir ${item.name} entre varios`}
          className="shrink-0 rounded-lg px-2 py-1 text-sm font-bold text-ink-faint transition-colors hover:bg-paper-3 hover:text-mint active:bg-paper-3"
        >
          ÷
        </button>
      </div>
    </div>
  );
}
