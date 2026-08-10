"use client";

import { money } from "@/lib/format";
import type { Item, ItemBreakdown } from "@/lib/types";
import { Sheet } from "./ui";

/**
 * La confirmación de quitar una línea, ahora detrás de la ✕ de la burbuja.
 *
 * Vivía al final de la hoja del ÷, escondida bajo una raya, y para borrar una
 * línea mal leída había que entrar antes a «dividir». Ahora se llega de un
 * toque, y por eso la confirmación importa más que nunca: es lo único de la
 * comanda que no tiene vuelta atrás y encima le baja el total a todo el mundo.
 *
 * Dice de antemano las dos cosas que van a pasar —quién deja de pagarla y en
 * cuánto se queda el total—, y avisa de que va firmado.
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
  /** Con qué total se queda el ticket si se quita esta línea. */
  totalAfterCents: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const personas = breakdown.shares.length;

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">
        ¿Quitar <span className="text-clay">{item.name}</span>?
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Desaparece de la comanda
        {personas > 0 &&
          (personas === 1
            ? " y quien la tenía marcada deja de pagarla"
            : ` y las ${personas} personas que la tenían marcada dejan de pagarla`)}
        .{" "}
        {totalAfterCents === ticketTotalCents ? (
          "El total del ticket no cambia."
        ) : (
          <>
            El total baja a{" "}
            <span className="tnum font-bold text-ink">{money(totalAfterCents, currency)}</span>.
          </>
        )}
      </p>

      {/* Que se sepa antes de pulsar, no después: es media razón de que exista
          el historial. Quitar algo aquí no es un gesto anónimo. */}
      <p className="mt-3 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-xs leading-relaxed text-ink-faint">
        Queda anotado en el historial de la mesa, con tu nombre y la hora.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 rounded-xl bg-clay py-3 text-sm font-bold text-paper transition-transform active:scale-[0.98]"
        >
          Sí, quitar
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
