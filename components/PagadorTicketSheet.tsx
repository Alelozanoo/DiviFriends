"use client";

import { useState } from "react";
import { useT, rellena } from "@/lib/i18n";
import type { Participant } from "@/lib/types";
import { Avatar, Sheet } from "./ui";

/**
 * Quién puso el dinero de **este** ticket.
 *
 * Una comanda puede llevar tres papeles y tres pagadores distintos, así que la
 * pregunta es por papel y no por mesa. Las cuentas siguen siendo una sola —se
 * netea todo y sale el mínimo de transferencias—, pero el dato de entrada hay
 * que pedirlo ticket a ticket o no hay forma de cuadrarlo.
 *
 * Y hay que pedirlo: sin pagador, lo que costó ese ticket se le cobra a quien
 * se lo comió pero no se le abona a nadie, y aparece una deuda sin acreedor.
 * La pantalla sigue enseñando números, sólo que están mal.
 *
 * «Lo pagué yo» va primero y grande porque quien acaba de fotografiar el
 * ticket casi siempre es quien lo tenía en la mano.
 */
export function PagadorTicketSheet({
  etiqueta,
  participants,
  meId,
  payerId,
  onElegir,
  onClose,
}: {
  /** El nombre del ticket, para que se vea cuál de los tres se está diciendo. */
  etiqueta: string | null;
  participants: Participant[];
  meId: string | null;
  payerId: string | null;
  onElegir: (participantId: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const otros = participants.filter((p) => p.id !== meId);

  function elige(participantId: string) {
    if (busy) return;
    setBusy(true);
    onElegir(participantId);
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-[21px] font-bold leading-tight tracking-[-0.025em]">
        {rellena(t.pagadorTicket.titulo, { que: etiqueta || t.pagadorTicket.esteTicket })}
      </h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{t.pagadorTicket.aviso}</p>

      {meId && (
        <button
          type="button"
          disabled={busy}
          onClick={() => elige(meId)}
          className="mt-5 w-full min-h-[52px] rounded-xl bg-amber text-[15px] font-bold transition-transform active:scale-[0.98] disabled:opacity-50"
          style={{ color: "var(--paper-2)" }}
        >
          {t.pagadorTicket.loPagueYo}
        </button>
      )}

      {otros.length > 0 && (
        <>
     <p className="text-[12px] mt-5 text-ink-faint">{t.pagadorTicket.fueOtro}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {otros.map((person) => (
              <button
                key={person.id}
                type="button"
                disabled={busy}
                onClick={() => elige(person.id)}
                aria-pressed={payerId === person.id}
                className={`flex items-center gap-2 rounded-xl border-2 py-2 pl-2 pr-3.5 text-[15px] font-semibold transition-colors disabled:opacity-50 ${
                  payerId === person.id
                    ? "border-amber bg-amber/15 text-amber"
                    : "border-line text-ink-soft active:bg-paper-3"
                }`}
              >
                <Avatar name={person.name} avatar={person.avatar} color={person.color} size={24} />
                <span className="max-w-32 truncate">{person.name}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Se puede saltar, pero no en silencio: la pestaña del ticket se queda
          marcada y la pantalla de cuentas avisa mientras falte alguno. */}
      <button
        type="button"
        onClick={onClose}
        className="mt-5 w-full rounded-xl py-2.5 text-[15px] text-ink-faint"
      >
        {t.pagadorTicket.ahoraNo}
      </button>
    </Sheet>
  );
}
