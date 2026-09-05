"use client";

import { useT, rellena } from "@/lib/i18n";
import { Avatar, Sheet } from "./ui";
import type { ParticipantBalance, Receipt, Ticket } from "@/lib/types";

/**
 * Quién ha pagado cada ticket, y quién puede decirlo.
 *
 * Una mesa puede llevar tres papeles y tres pagadores distintos —uno paga la
 * comida y otro las copas—, así que se enseñan todos, cada uno con el suyo.
 * Lo que cambia de un ticket a otro es lo que puedes tocar, y sigue la regla
 * del servidor (`setPayer`, lib/store.ts):
 *
 *   - Sin pagador: «lo pagué yo» lo dice cualquiera sentado. Señalar a otra
 *     persona pide cuenta.
 *   - Con pagador: lo cambia el propio pagador, o alguien con cuenta. A los
 *     demás se les enseña quién fue y por qué no pueden tocarlo.
 *
 * Quien ni siquiera está sentado ve una sola cosa: unirse.
 */
export function CambiarPagadorSheet({
  ticket,
  receipts,
  people,
  meId,
  conCuenta,
  payerOriginal,
  onUnirme,
  onSetPayer,
  onClose,
}: {
  ticket: Ticket;
  receipts: Receipt[];
  people: ParticipantBalance[];
  meId: string | null;
  conCuenta: boolean;
  /** El pagador del ticket original, mirado por las dos vías (payerId e isPayer). */
  payerOriginal: string | null;
  onUnirme: () => void;
  onSetPayer: (participantId: string, receiptId: string | null) => void;
  onClose: () => void;
}) {
  const t = useT();

  // El ticket original más los recibos, cada uno con quien lo puso.
  const enLaMesa = [
    { id: null, label: ticket.place ?? t.comanda.ticketOriginal, payerId: payerOriginal },
    ...receipts.map((r) => ({ id: r.id, label: r.label, payerId: r.payerId ?? null })),
  ];
  // Con varios papeles en la mesa hay que decir de cuál se habla, aunque a mí
  // sólo me toque uno: «la cuenta» a secas ya no identifica nada.
  const variosEnLaMesa = enLaMesa.length > 1;
  const yo = meId ? people.find((p) => p.participantId === meId) ?? null : null;

  const elige = (participantId: string, receiptId: string | null) => {
    onSetPayer(participantId, receiptId);
    onClose();
  };

  const Persona = ({
    person,
    marcado,
    receiptId,
    apagado = false,
  }: {
    person: ParticipantBalance;
    marcado: boolean;
    receiptId: string | null;
    apagado?: boolean;
  }) => (
    <button
      type="button"
      disabled={apagado}
      onClick={() => elige(person.participantId, receiptId)}
      aria-pressed={marcado}
      className={`flex items-center gap-2 rounded-xl border-2 py-2 pl-2 pr-4 text-[15px] font-semibold transition-colors disabled:opacity-100 ${
        marcado ? "border-amber bg-amber/15 text-amber" : "border-line text-ink-soft active:bg-paper-3"
      }`}
    >
      <Avatar name={person.name} avatar={person.avatar} color={person.color} size={24} />
      <span className="max-w-28 truncate">{person.name}</span>
    </button>
  );

  return (
    <Sheet onClose={onClose} cierre>
      <h2 className="mb-6 pr-10 text-[21px] font-bold leading-tight tracking-[-0.025em]">{t.menu.cambiarPagador}</h2>

      {!meId ? (
        <div className="grid gap-3">
          <p className="text-[15px] leading-relaxed text-ink-soft">{t.cuentas.unetePrimero}</p>
          <button
            type="button"
            onClick={() => {
              onClose();
              onUnirme();
            }}
            className="min-h-[48px] w-full rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
          >
            {t.comanda.unirme}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {enLaMesa.map((tkt, index) => {
            const soyElPagador = tkt.payerId !== null && tkt.payerId === meId;
            const puedoSenalar = soyElPagador || conCuenta;
            const pagador = tkt.payerId ? people.find((p) => p.participantId === tkt.payerId) ?? null : null;
            return (
              <div key={tkt.id ?? "original"} className={index > 0 ? "border-t border-line/60 pt-6" : ""}>
                <h3 className="mb-3 font-semibold text-ink-soft">
                  {rellena(t.cuentas.quienHaPagado, { que: variosEnLaMesa ? tkt.label : t.cuentas.laCuenta })}
                </h3>
                {people.length === 0 ? (
                  <p className="text-[15px] text-ink-faint">{t.cuentas.nadieEnLaMesa}</p>
                ) : puedoSenalar ? (
                  /* Todos, y el que ya lo es marcado: tocarlo otra vez lo quita. */
                  <div className="flex flex-wrap gap-2">
                    {people.map((person) => (
                      <Persona
                        key={person.participantId}
                        person={person}
                        marcado={tkt.payerId === person.participantId}
                        receiptId={tkt.id}
                      />
                    ))}
                  </div>
                ) : pagador ? (
                  /* Ya lo pagó otro y no tengo cuenta: se ve quién, y por qué no se toca. */
                  <div className="grid gap-2.5">
                    <div className="flex flex-wrap gap-2">
                      <Persona person={pagador} marcado receiptId={tkt.id} apagado />
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-ink-faint">{t.cuentas.cambiarConCuenta}</p>
                  </div>
                ) : (
                  /* Sin pagador y sin cuenta: sólo «lo pagué yo». */
                  <div className="grid gap-2.5">
                    {yo && (
                      <button
                        type="button"
                        onClick={() => elige(yo.participantId, tkt.id)}
                        className="min-h-[48px] w-full rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
                      >
                        {t.pagadorTicket.loPagueYo}
                      </button>
                    )}
                    <p className="text-[12.5px] leading-relaxed text-ink-faint">{t.cuentas.senalarConCuenta}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Sheet>
  );
}
