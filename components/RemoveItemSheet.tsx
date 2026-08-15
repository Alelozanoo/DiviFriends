import { useState } from "react";
import { money } from "@/lib/format";
import type { Item, ItemBreakdown } from "@/lib/types";
import { useT, rellena } from "@/lib/i18n";
import { Sheet } from "./ui";

/**
 * Confirmación para quitar una línea entera o bajarle la cantidad.
 *
 * Con una sola unidad no hay contador que enseñar —no hay nada que bajar— así
 * que la hoja arranca ya en «eliminar». Antes arrancaba en 1 y el botón sólo
 * se activaba al cambiar la cantidad: sin contador no había forma de cambiarla,
 * y un plato suelto no se podía borrar de ninguna manera.
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
  const t = useT();
  const personas = breakdown.shares.length;
  // Varias unidades: se empieza sin tocar nada y se decide con el contador.
  // Una sola: lo único que se puede hacer es quitarla, así que ya está elegido.
  const [qty, setQty] = useState(item.qty > 1 ? item.qty : 0);

  const removingAll = qty === 0;
  /** Todavía no se ha tocado el contador: no hay nada que prometer. */
  const sinTocar = qty === item.qty;

  /*
    Con qué total se queda el ticket.

    Quitar la línea entera trae su cuenta ya hecha desde fuera, que es la buena:
    nunca baja el total por debajo de lo que suman las demás líneas. Para una
    reducción se calcula por el precio unitario porque es exactamente lo que
    hace el servidor al recalcular la línea, y así lo prometido coincide con lo
    que pasa.
  */
  const currentTotalAfter = removingAll
    ? totalAfterCents
    : ticketTotalCents - Math.round(item.unitCents * (item.qty - qty));

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">
        {t.quitar.titulo} <span className="text-clay">{item.name}</span>?
      </h2>

      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        {sinTocar ? (
          // Nada elegido todavía: se dice lo que se puede hacer, y ni una
          // palabra del total. Antes cantaba «la cantidad bajará a 3» con el
          // contador puesto en 3, que no significa nada.
          <>{t.quitar.sinTocar}</>
        ) : (
          <>
            {removingAll ? (
              <>
                {t.quitar.desaparece}
                {personas > 0 &&
                  (personas === 1
                    ? ` ${t.quitar.yQuienLaTenia}`
                    : ` ${rellena(t.quitar.yLasPersonas, { n: personas })}`)}
                .
              </>
            ) : (
              <>{rellena(t.quitar.seQuedaEn, { n: qty })}</>
            )}{" "}
            {currentTotalAfter === ticketTotalCents ? (
              t.quitar.totalNoCambia
            ) : (
              <>
                {t.quitar.totalBaja}{" "}
                <span className="tnum font-bold text-ink">
                  {money(currentTotalAfter, currency)}
                </span>
                .
              </>
            )}
          </>
        )}
      </p>

      {item.qty > 1 && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-line bg-paper-2 p-2">
          <span className="pl-2 text-sm font-semibold text-ink-soft">{t.quitar.cantidad}</span>
          <div className="flex items-center gap-4 pr-1">
            <button
              type="button"
              onClick={() => setQty(Math.max(0, qty - 1))}
              disabled={qty === 0}
              className="grid h-10 w-10 place-items-center rounded-lg bg-paper font-bold text-ink-soft shadow-sm active:scale-95 disabled:opacity-50"
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
        {t.quitar.anotado}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onConfirm(qty)}
          disabled={qty === item.qty}
          className="flex-1 rounded-xl bg-clay py-3 text-sm font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {removingAll ? t.quitar.eliminar : rellena(t.quitar.dejarloEn, { n: qty })}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-ink-soft"
        >
          {t.quitar.dejarla}
        </button>
      </div>
    </Sheet>
  );
}
