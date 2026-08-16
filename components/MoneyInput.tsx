"use client";

import { useState } from "react";
import { parseMoney } from "@/lib/format";

/**
 * Entrada de importe que respeta lo que el usuario escribe mientras escribe
 * («12,», «12,5») y sólo convierte a céntimos al confirmar.
 */
export default function MoneyInput({
  cents,
  onCommit,
  ariaLabel,
  className = "",
  disabled,
}: {
  cents: number;
  onCommit: (cents: number) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(() => centsToDraft(cents));
  const [editing, setEditing] = useState(false);
  const [lastSeen, setLastSeen] = useState(cents);

  // Mientras no lo estés tocando, refleja el valor real: otro móvil pudo
  // cambiarlo. Ajuste durante el render, no en un efecto, para no encadenar
  // un repintado extra en cada sondeo.
  if (cents !== lastSeen) {
    setLastSeen(cents);
    if (!editing) setDraft(centsToDraft(cents));
  }

  function commit() {
    setEditing(false);
    const next = parseMoney(draft);
    setDraft(centsToDraft(next));
    if (next !== cents) onCommit(next);
  }

  return (
    <input
      disabled={disabled}
      inputMode="decimal"
      aria-label={ariaLabel}
      value={draft}
      onFocus={(event) => {
        setEditing(true);
        event.currentTarget.select();
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className={`tnum rounded-lg border border-line bg-paper px-3 py-2 text-right focus:border-amber focus:outline-none ${className}`}
    />
  );
}

function centsToDraft(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
