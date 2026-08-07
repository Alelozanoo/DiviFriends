"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { LIMITS } from "@/lib/ticketDoc";
import type { Item, ItemBreakdown } from "@/lib/types";

/**
 * «Esto va entre N». Al elegir el número tu parte queda fijada al momento, sin
 * esperar a que los demás se apunten: es la diferencia entre saber lo que
 * pagas ahora y tener que perseguir a la mesa para averiguarlo.
 */
export default function SplitSheet({
  item,
  breakdown,
  currency,
  onPick,
  onClose,
}: {
  item: Item;
  breakdown: ItemBreakdown;
  currency: string;
  onPick: (into: number) => void;
  onClose: () => void;
}) {
  const [custom, setCustom] = useState("");
  const taken = breakdown.shares.length;
  const options = [2, 3, 4, 5, 6, 7];

  const typed = Number.parseInt(custom, 10);
  const customValid = Number.isFinite(typed) && typed >= Math.max(2, taken) && typed <= LIMITS.splitInto;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="rise w-full max-w-md rounded-t-3xl border-t border-line bg-paper-2 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-bold tracking-tight">{item.name}</h2>
        <p className="mt-1 text-sm text-ink-soft">
          {money(item.totalCents, currency)} · ¿entre cuántos va?
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
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

        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-xl py-2 text-sm text-ink-faint"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
