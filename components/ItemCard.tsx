"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import type { Item, ItemBreakdown, Participant } from "@/lib/types";
import { Avatar } from "./ui";

interface Props {
  item: Item;
  breakdown: ItemBreakdown;
  participants: Participant[];
  meId: string | null;
  currency: string;
  onClaim: (units: number) => void;
  onToggleShared: () => void;
  onDelete: () => void;
}

export default function ItemCard({
  item,
  breakdown,
  participants,
  meId,
  currency,
  onClaim,
  onToggleShared,
  onDelete,
}: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const shared = item.splitMode === "shared";
  const mine = breakdown.shares.find((s) => s.participantId === meId);
  const myUnits = mine?.units ?? 0;
  const iAmIn = myUnits > 0;
  const free = breakdown.freeUnits;
  const byId = new Map(participants.map((p) => [p.id, p]));

  return (
    <li
      className={`rounded-2xl border p-4 transition-colors ${
        breakdown.settled ? "border-line/60 bg-paper-2/40" : "border-line bg-paper-2"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`tnum mt-0.5 grid h-7 min-w-7 shrink-0 place-items-center rounded-lg px-1.5 text-sm font-bold ${
            breakdown.settled ? "bg-line text-ink-faint" : "bg-paper-3 text-ink-soft"
          }`}
        >
          {formatQty(item.qty)}
        </span>

        <div className="min-w-0 flex-1">
          <p className={`font-semibold leading-snug ${breakdown.settled ? "text-ink-soft" : ""}`}>
            {item.name}
          </p>
          <p className="stamp mt-1 text-ink-faint">
            {shared ? "Compartido" : `${money(item.unitCents, currency)} /ud`}
            {!shared && free > 0 && ` · quedan ${formatQty(free)}`}
            {shared && breakdown.shares.length > 0 && ` entre ${breakdown.shares.length}`}
          </p>
        </div>

        <div className="text-right">
          <p className="tnum font-bold">{money(item.totalCents, currency)}</p>
          {iAmIn && (
            <p className="tnum mt-0.5 text-sm font-semibold text-amber">
              tú {money(mine!.cents, currency)}
            </p>
          )}
        </div>
      </div>

      {/* quién se lo ha quedado */}
      {breakdown.shares.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {breakdown.shares.map((share) => {
            const person = byId.get(share.participantId);
            if (!person) return null;
            return (
              <span
                key={share.participantId}
                className="flex items-center gap-1.5 rounded-full bg-paper-3 py-1 pl-1 pr-2.5"
              >
                <Avatar name={person.name} color={person.color} size={20} />
                <span className="text-xs font-medium text-ink-soft">
                  {person.name}
                  {!shared && share.units > 1 && ` ×${formatQty(share.units)}`}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* controles */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {meId ? (
          shared ? (
            <button
              type="button"
              onClick={() => onClaim(iAmIn ? 0 : 1)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                iAmIn
                  ? "bg-amber text-paper"
                  : "bg-paper-3 text-ink hover:bg-amber hover:text-paper"
              }`}
            >
              {iAmIn ? "Me apunto ✓" : "Me apunto"}
            </button>
          ) : item.qty > 1 ? (
            <div className="flex items-center gap-1 rounded-xl bg-paper-3 p-1">
              <StepButton
                label="Quitar una unidad"
                disabled={myUnits <= 0}
                onClick={() => onClaim(myUnits - 1)}
              >
                −
              </StepButton>
              <span className="tnum w-14 text-center text-sm font-semibold">
                {myUnits > 0 ? `${formatQty(myUnits)} mías` : "ninguna"}
              </span>
              <StepButton
                label="Añadir una unidad"
                disabled={free <= 0}
                onClick={() => onClaim(myUnits + 1)}
              >
                +
              </StepButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onClaim(iAmIn ? 0 : 1)}
              disabled={!iAmIn && free <= 0}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 ${
                iAmIn
                  ? "bg-amber text-paper"
                  : "bg-paper-3 text-ink hover:bg-amber hover:text-paper"
              }`}
            >
              {iAmIn ? "Es mío ✓" : "Es mío"}
            </button>
          )
        ) : null}

        <button
          type="button"
          onClick={onToggleShared}
          aria-pressed={shared}
          className={`rounded-xl border px-3 py-2 text-sm transition-colors ${
            shared
              ? "border-mint bg-mint/10 text-mint"
              : "border-line text-ink-soft hover:border-mint hover:text-mint"
          }`}
        >
          {shared ? "Dejar de compartir" : "Compartir"}
        </button>

        <button
          type="button"
          onClick={() => {
            if (confirmDelete) onDelete();
            else setConfirmDelete(true);
          }}
          onBlur={() => setConfirmDelete(false)}
          className="ml-auto rounded-lg px-2 py-2 text-xs text-ink-faint transition-colors hover:text-clay"
        >
          {confirmDelete ? "¿Seguro?" : "Borrar"}
        </button>
      </div>
    </li>
  );
}

function StepButton({
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
      className="grid h-8 w-8 place-items-center rounded-lg bg-paper text-lg font-bold transition-colors hover:bg-amber hover:text-paper disabled:opacity-30 disabled:hover:bg-paper disabled:hover:text-ink"
    >
      {children}
    </button>
  );
}

/** 2 -> "2", 1.5 -> "1,5" (medias raciones y compartidos). */
function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(1).replace(".", ",");
}
