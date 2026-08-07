"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { LIMITS } from "@/lib/ticketDoc";
import type { Item, ItemBreakdown, Participant } from "@/lib/types";
import { Avatar, Sheet } from "./ui";

/**
 * Todo lo que se puede hacer con una línea aparte de tocarla para quedártela:
 * decir de quién es, partirla entre varios o quitarla de la comanda.
 *
 * Lo de «de quién es» va primero porque es lo que resuelve la mesa de ocho en
 * la que sólo uno tiene la app abierta: apuntas a los demás y vas marcando lo
 * que ha tomado cada uno sin esperar a que saquen el móvil. Quitar la línea
 * vive abajo del todo y pide confirmación, que es lo único que no tiene vuelta.
 */
export default function ItemSheet({
  item,
  breakdown,
  participants,
  currency,
  ticketTotalCents,
  totalAfterCents,
  onSetShares,
  onPick,
  onRemove,
  onClose,
}: {
  item: Item;
  breakdown: ItemBreakdown;
  participants: Participant[];
  currency: string;
  ticketTotalCents: number;
  /** Con qué total se queda el ticket si se quita esta línea. */
  totalAfterCents: number;
  onSetShares: (participantId: string, shares: number) => void;
  onPick: (into: number) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("");
  const [confirming, setConfirming] = useState(false);
  const taken = breakdown.shares.length;
  const options = [2, 3, 4, 5, 6, 7];

  const typed = Number.parseInt(custom, 10);
  const customValid =
    Number.isFinite(typed) && typed >= Math.max(2, taken) && typed <= LIMITS.splitInto;

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-lg font-bold tracking-tight">{item.name}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {money(item.totalCents, currency)}
        {item.qty > 1 && ` · ${item.qty} unidades`}
      </p>

      {/* ------------------------------------------------- quién lo ha tomado */}
      {participants.length > 0 && (
        <>
          <p className="stamp mt-4 text-ink-faint">Quién lo ha tomado</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {participants.map((person) => {
              const share = breakdown.shares.find((s) => s.participantId === person.id);
              // El contador sólo aparece cuando la línea tiene partes que
              // repartir: en un plato único sobra y sólo estorba.
              const canStep = Boolean(share) && item.splitInto > 1;
              return (
                <span
                  key={person.id}
                  className={`flex items-center rounded-xl border-2 transition-colors ${
                    share ? "border-amber bg-amber/12" : "border-line"
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={Boolean(share)}
                    onClick={() => onSetShares(person.id, share ? 0 : 1)}
                    className="flex items-center gap-1.5 py-1.5 pl-2 pr-2.5"
                  >
                    <Avatar name={person.name} color={person.color} size={20} />
                    <span className="max-w-28 truncate text-sm font-semibold">{person.name}</span>
                  </button>
                  {canStep && (
                    <span className="flex items-center pr-1">
                      <Step
                        label={`Quitarle una parte a ${person.name}`}
                        onClick={() => onSetShares(person.id, share!.shares - 1)}
                      >
                        −
                      </Step>
                      <span className="tnum w-4 text-center text-xs font-bold">{share!.shares}</span>
                      <Step
                        label={`Darle otra parte a ${person.name}`}
                        disabled={breakdown.freeShares === 0}
                        onClick={() => onSetShares(person.id, share!.shares + 1)}
                      >
                        +
                      </Step>
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </>
      )}

      <p className="stamp mt-4 text-ink-faint">¿Entre cuántos va?</p>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {options.map((n) => {
          // Partir en menos trozos de los ya repartidos dejaría a alguien fuera.
          const blocked = n < taken;
          return (
            <button
              key={n}
              type="button"
              disabled={blocked}
              onClick={() => onPick(n)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl border-2 py-3 transition-colors disabled:opacity-25 ${
                item.splitInto === n
                  ? "border-mint bg-mint/10"
                  : "border-line hover:border-mint active:bg-paper-3"
              }`}
            >
              <span className="tnum text-xl font-bold">{n}</span>
              <span className="tnum text-[0.7rem] text-ink-soft">
                {money(Math.round(item.totalCents / n), currency)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mesas grandes: el menú rápido se queda corto a partir de 7. */}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (customValid) onPick(typed);
        }}
      >
        <input
          value={custom}
          onChange={(event) => setCustom(event.target.value.replace(/\D/g, "").slice(0, 2))}
          inputMode="numeric"
          placeholder="otro número"
          aria-label="Entre cuántas personas se reparte"
          className="tnum min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-2.5 text-center focus:border-mint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!customValid}
          className="shrink-0 rounded-xl bg-mint px-4 py-2.5 text-sm font-bold text-paper disabled:opacity-30"
        >
          {customValid ? money(Math.round(item.totalCents / typed), currency) : "Repartir"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => onPick(Math.max(1, item.qty))}
        className="mt-3 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-amber hover:text-amber"
      >
        {item.qty > 1 ? `Volver a ${item.qty} unidades sueltas` : "No compartir"}
      </button>

      <div className="rule my-4" />

      {/* ---------------------------------------------------- quitar la línea */}
      {confirming ? (
        <div className="rounded-xl border border-clay/40 bg-clay/10 p-3">
          <p className="text-sm leading-relaxed text-clay">
            Desaparece de la comanda
            {taken > 0 &&
              (taken === 1
                ? " y quien la tenía marcada deja de pagarla"
                : ` y las ${taken} personas que la tenían marcada dejan de pagarla`)}
            .{" "}
            {totalAfterCents === ticketTotalCents ? (
              "El total del ticket no cambia."
            ) : (
              <>
                El total baja a{" "}
                <span className="tnum font-bold">{money(totalAfterCents, currency)}</span>.
              </>
            )}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={onRemove}
              className="flex-1 rounded-xl bg-clay py-2.5 text-sm font-bold text-paper active:scale-[0.98] transition-transform"
            >
              Sí, quitar
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="flex-1 rounded-xl border border-line py-2.5 text-sm font-semibold text-ink-soft"
            >
              Dejarla
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-ink-faint transition-colors hover:text-clay"
        >
          Quitar de la comanda
        </button>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-xl py-2 text-sm text-ink-faint"
      >
        Cancelar
      </button>
    </Sheet>
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
      className="grid h-7 w-5 place-items-center text-sm font-bold transition-colors hover:text-amber disabled:opacity-25"
    >
      {children}
    </button>
  );
}
