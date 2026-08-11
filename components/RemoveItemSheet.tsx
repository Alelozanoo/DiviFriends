import { useState } from "react";
import { money } from "@/lib/format";
import type { Item, ItemBreakdown } from "@/lib/types";
import { Sheet } from "./ui";

/**
 * Confirmación para quitar una línea o reducir su cantidad.
 */
export default function RemoveItemSheet({
  item,
  breakdown,
  currency,
  ticketTotalCents,
  totalAfterCents,
  onConfirm,
  onClose,
}: {
  item: Item;
  breakdown: ItemBreakdown;
  currency: string;
  ticketTotalCents: number;
  /** Con qué total se queda el ticket si se quita toda la línea. */
  totalAfterCents: number;
  onConfirm: (newQty: number) => void;
  onClose: () => void;
}) {
  const personas = breakdown.shares.length;
  const [qty, setQty] = useState(item.qty);

  const removingAll = qty === 0;
  
  // Calculate new total based on how many units are removed
  const unitsRemoved = item.qty - qty;
  const diffCents = Math.round(item.unitCents * unitsRemoved);
  const currentTotalAfter = ticketTotalCents - diffCents;

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">
        ¿Quitar <span className="text-clay">{item.name}</span>?
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {removingAll ? (
          <>
            Desaparece de la comanda
            {personas > 0 &&
              (personas === 1
                ? " y quien la tenía marcada deja de pagarla"
                : ` y las ${personas} personas que la tenían marcada dejan de pagarla`)}
            .
          </>
        ) : (
          <>
            La cantidad bajará a {qty}.
          </>
        )}
        {" "}
        {currentTotalAfter === ticketTotalCents ? (
          "El total del ticket no cambia."
        ) : (
          <>
            El total baja a{" "}
            <span className="tnum font-bold text-ink">{money(currentTotalAfter, currency)}</span>.
          </>
        )}
      </p>

      {item.qty > 1 && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-line bg-paper-2 p-2">
          <span className="pl-2 text-sm font-semibold text-ink-soft">Cantidad</span>
          <div className="flex items-center gap-4 pr-1">
            <button
              type="button"
              onClick={() => setQty(Math.max(0, qty - 1))}
              className="grid h-10 w-10 place-items-center rounded-lg bg-paper font-bold text-ink-soft shadow-sm active:scale-95"
            >
              −
            </button>
            <span className="tnum min-w-[1.5rem] text-center text-lg font-bold">{qty}</span>
            <button
              type="button"
              onClick={() => setQty(Math.min(item.qty, qty + 1))}
              disabled={qty === item.qty}
              className="grid h-10 w-10 place-items-center rounded-lg bg-paper font-bold text-ink-soft shadow-sm active:scale-95 disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* Que se sepa antes de pulsar, no después: es media razón de que exista
          el historial. Quitar algo aquí no es un gesto anónimo. */}
      <p className="mt-5 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs leading-relaxed text-ink-faint">
        Queda anotado en el historial de la mesa, con tu nombre y la hora.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(qty)}
          disabled={qty === item.qty}
          className="flex-1 rounded-xl bg-clay py-3 text-sm font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {removingAll ? "Sí, quitar" : "Reducir cantidad"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-ink-soft"
        >
          Dejarla
        </button>
      </div>
    </Sheet>
  );
}
