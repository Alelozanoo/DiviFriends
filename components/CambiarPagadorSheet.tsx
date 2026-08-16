"use client";

import { useT, rellena } from "@/lib/i18n";
import { Avatar, Sheet } from "./ui";
import type { ParticipantBalance, Receipt, Ticket } from "@/lib/types";

/**
 * Pasarle a otro un ticket que pusiste tú.
 *
 * Sólo salen los tuyos. Una mesa puede llevar tres papeles y tres pagadores
 * distintos —uno paga la comida y otro las copas—, así que enseñarlos todos
 * daba a entender que aquí manda uno solo sobre el dinero de los demás. Y el
 * caso de verdad es siempre el mismo: «esto lo puse yo y me he equivocado».
 *
 * Asignar pagador a un ticket que no tiene no se hace aquí, sino desde su
 * propia pestaña, que es donde se ve de cuál se está hablando.
 */
export function CambiarPagadorSheet({
  ticket,
  receipts,
  people,
  meId,
  onSetPayer,
  onClose,
}: {
  ticket: Ticket;
  receipts: Receipt[];
  people: ParticipantBalance[];
  meId: string | null;
  onSetPayer: (participantId: string, receiptId: string | null) => void;
  onClose: () => void;
}) {
  const t = useT();

  // El ticket original más los recibos, y de todos ellos sólo los que puse yo.
  const enLaMesa = [
    { id: null, label: ticket.place ?? t.comanda.ticketOriginal, payerId: ticket.payerId },
    ...receipts.map((r) => ({ id: r.id, label: r.label, payerId: r.payerId })),
  ];
  const mios = enLaMesa.filter((tkt) => tkt.payerId && tkt.payerId === meId);
  // Con varios papeles en la mesa hay que decir de cuál se habla, aunque a mí
  // sólo me toque uno: «la cuenta» a secas ya no identifica nada.
  const variosEnLaMesa = enLaMesa.length > 1;

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-[21px] font-bold leading-tight tracking-[-0.025em] mb-6">{t.menu.cambiarPagador}</h2>

      <div className="flex flex-col gap-6">
        {mios.map((tkt, index) => (
          <div key={tkt.id ?? "legacy"} className={index > 0 ? "border-t border-line/60 pt-6" : ""}>
            <h3 className="font-semibold text-ink-soft mb-3">
              {rellena(t.cuentas.quienHaPagado, { que: variosEnLaMesa ? tkt.label : t.cuentas.laCuenta })}
            </h3>
            {people.length === 0 ? (
              <p className="text-[15px] text-ink-faint">{t.cuentas.nadieEnLaMesa}</p>
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
                      className={`flex items-center gap-2 rounded-xl border-2 py-2 pl-2 pr-4 text-[15px] font-semibold transition-colors ${
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
        className="mt-8 w-full min-h-[46px] rounded-xl border border-line text-[15px] font-semibold text-ink transition-colors active:bg-paper-3"
      >
        {t.perfil.cancelar}
      </button>
    </Sheet>
  );
}
