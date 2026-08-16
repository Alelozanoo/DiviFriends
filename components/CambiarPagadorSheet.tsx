"use client";

import { useT, rellena } from "@/lib/i18n";
import { Avatar, Sheet } from "./ui";
import type { ParticipantBalance, Receipt, Ticket } from "@/lib/types";

export function CambiarPagadorSheet({
  ticket,
  receipts,
  people,
  onSetPayer,
  onClose,
}: {
  ticket: Ticket;
  receipts: Receipt[];
  people: ParticipantBalance[];
  onSetPayer: (participantId: string, receiptId: string | null) => void;
  onClose: () => void;
}) {
  const t = useT();

  // Compatibilidad: el ticket original más todos los recibos extras
  const allTickets = [
    { id: null, label: ticket.tableLabel ?? t.cuentas.laCuenta, payerId: ticket.payerId },
    ...receipts.map(r => ({ id: r.id, label: r.label, payerId: r.payerId }))
  ];

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight mb-6">{t.menu.cambiarPagador}</h2>
      
      <div className="flex flex-col gap-6">
        {allTickets.map((tkt, index) => (
          <div key={tkt.id ?? "legacy"} className={index > 0 ? "border-t border-line/60 pt-6" : ""}>
            <h3 className="font-semibold text-ink-soft mb-3">
              {rellena(t.cuentas.quienHaPagado, { que: allTickets.length > 1 ? tkt.label : t.cuentas.laCuenta })}
            </h3>
            {people.length === 0 ? (
              <p className="text-sm text-ink-faint">{t.cuentas.nadieEnLaMesa}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {people.map((person) => {
                  const isPayer = tkt.payerId === person.participantId;
                  return (
                    <button
                      key={person.participantId}
                      type="button"
                      onClick={() => {
                        onSetPayer(person.participantId, tkt.id);
                        onClose();
                      }}
                      aria-pressed={isPayer}
                      className={`flex items-center gap-2 rounded-xl border-2 py-2 pl-2 pr-4 text-sm font-semibold transition-colors ${
                        isPayer
                          ? "border-amber bg-amber/15 text-amber"
                          : "border-line text-ink-soft active:bg-paper-3"
                      }`}
                    >
                      <Avatar name={person.name} avatar={person.avatar} color={person.color} size={24} />
                      <span className="max-w-28 truncate">{person.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
      
      <button
        type="button"
        onClick={onClose}
        className="mt-8 w-full rounded-xl border border-line py-3 text-sm font-semibold text-ink-soft transition-colors active:bg-paper-3"
      >
        {t.perfil.cancelar}
      </button>
    </Sheet>
  );
}
