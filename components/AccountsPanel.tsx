"use client";

import { money } from "@/lib/format";
import type { ParticipantBalance, Settlement, TicketState } from "@/lib/types";
import { useT, rellena } from "@/lib/i18n";
import MoneyInput from "./MoneyInput";
import { Avatar } from "./ui";

interface Props {
  state: TicketState;
  settlement: Settlement;
  meId: string | null;
  onSetPayer: (participantId: string | null, receiptId: string | null) => void;
  onSetSettled: (participantId: string, settled: boolean) => void;
  onSetTotal: (cents: number) => void;
  onOpenLog: () => void;
}

/**
 * La segunda mitad de la app: ya has marcado lo tuyo, ahora toca pagar.
 *
 * Responde a dos preguntas y a nada más — cuánto falta, y quién falta. Todo lo
 * que no sirviera para eso se ha ido: la propina, el desglose en tabla de cinco
 * columnas y el reparto de deudas cruzadas estilo Tricount. Con un solo pagador
 * ese cálculo siempre daba lo mismo («todos le pagan a quien puso la tarjeta»),
 * así que era un párrafo para decir algo que ya se sabía.
 */
export default function AccountsPanel({
  state,
  settlement,
  meId,
  onSetPayer,
  onSetSettled,
  onSetTotal,
  onOpenLog,
}: Props) {
  const t = useT();
  const { currency } = state.ticket;
  const people = settlement.byParticipant;
  
  // Normalizar los tickets para la UI
  const hasLegacyItems = state.items.some(i => !i.receiptId);
  const allTickets: { id: string | null; label: string; payerId: string | null; totalCents: number }[] = [];
  
  if (hasLegacyItems || state.receipts.length === 0) {
    // Buscar pagador legacy si no tiene payerId explícito
    const legacyPayer = state.participants.find((p) => p.isPayer)?.id ?? null;
    allTickets.push({
      id: null,
      label: state.ticket.place || t.comanda.ticketOriginal,
      totalCents: state.ticket.totalCents,
      payerId: state.ticket.payerId ?? legacyPayer,
    });
  }
  
  for (const r of state.receipts || []) {
    allTickets.push({
      id: r.id,
      label: r.label,
      totalCents: r.totalCents,
      payerId: r.payerId,
    });
  }

  const pending = people.filter((p) => !p.settled);
  const changeCount = state.events.length;
  
  // Hay múltiples pagadores si hay gente distinta que haya pagado
  const payers = new Set(allTickets.map(t => t.payerId).filter(Boolean));
  const isMultiPayer = payers.size > 1;

  return (
    <div className="space-y-4 pb-40">
      <Headline
        currency={currency}
        people={people}
        pendingCents={settlement.pendingCents}
        totalCents={settlement.grandTotalCents}
        isMultiPayer={isMultiPayer}
        unassignedCents={settlement.unassignedCents}
      />

      {settlement.unassignedCents !== 0 && (
        <p className="rounded-xl border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {settlement.unassignedCents > 0
            ? rellena(t.cuentas.ojoSinDueno, { dinero: money(settlement.unassignedCents, currency) })
            : rellena(t.cuentas.ojoDeMas, { dinero: money(-settlement.unassignedCents, currency) })}
        </p>
      )}

      {/* --------------------------------------------------------- quién pagó */}
      <section className="rounded-2xl border border-line bg-paper-2 p-4">
        {allTickets.map((ticket, index) => (
          <div key={ticket.id ?? "legacy"} className={index > 0 ? "mt-6 border-t border-line/60 pt-6" : ""}>
            <h3 className="font-bold tracking-tight">
              {rellena(t.cuentas.quienHaPagado, { que: allTickets.length > 1 ? ticket.label : t.cuentas.laCuenta })}
            </h3>
            {people.length === 0 ? (
              <p className="mt-2 text-sm text-ink-faint">{t.cuentas.nadieEnLaMesa}</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {people.map((person) => {
                  const isPayer = ticket.payerId === person.participantId;
                  return (
                    <button
                      key={person.participantId}
                      type="button"
                      onClick={() => onSetPayer(person.participantId, ticket.id)}
                      aria-pressed={isPayer}
                      className={`flex items-center gap-2 rounded-xl border-2 py-1.5 pl-1.5 pr-3 text-sm font-semibold transition-colors ${
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
      </section>

      {/* ------------------------------------------------------ quién le debe */}
      {people.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-line bg-paper-2">
          <ul>
            {people.map((person, index) => {
              // Si hay un solo pagador y no es esta persona, le pasamos su nombre para que el botón lo indique
              const firstPayer = people.find(p => p.owesCents < 0);
              const payeeName = (!isMultiPayer && firstPayer && firstPayer.participantId !== person.participantId) 
                ? firstPayer.name 
                : null;

              return (
                <PersonRow
                  key={person.participantId}
                  person={person}
                  currency={currency}
                  isMe={person.participantId === meId}
                  payeeName={payeeName}
                  transactions={settlement.transactions}
                  allPeople={people}
                  /* La raya separa lo pendiente de lo cobrado sin necesidad de
                     dos listas ni de un título encima de cada una. */
                  divider={index > 0 && person.settled && !people[index - 1].settled}
                  first={index === 0}
                  onToggle={() => onSetSettled(person.participantId, !person.settled)}
                />
              );
            })}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------- total */}
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="stamp text-ink-faint">{t.cuentas.totalDelTicket}</span>
        <MoneyInput
          cents={state.ticket.totalCents}
          onCommit={onSetTotal}
          ariaLabel={t.cuentas.totalDelTicket}
          className="w-28"
        />
      </div>

      {settlement.extrasCents !== 0 && (
        <p className="px-1 text-xs leading-relaxed text-ink-faint">
          {rellena(t.cuentas.extrasNota, {
            dinero: money(Math.abs(settlement.extrasCents), currency),
            que: settlement.extrasCents > 0 ? t.cuentas.extras : t.cuentas.descuento
          })}
        </p>
      )}

      {/*
        La puerta fija al historial. Aquí y no en la comanda porque ésta es la
        pantalla en la que se miran los números con lupa, y la pregunta que
        trae a alguien hasta aquí —«esto no me cuadra»— tiene su respuesta
        muchas veces en algo que alguien quitó.
      */}
      <button
        type="button"
        onClick={onOpenLog}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-line bg-paper-2 px-4 py-3 text-left transition-colors active:bg-paper-3"
      >
        <span>
          <span className="text-sm font-semibold">{t.cuentas.historial}</span>
          <span className="mt-0.5 block text-xs text-ink-faint">
            {changeCount === 0
              ? t.cuentas.sinCambios
              : changeCount === 1 ? t.cuentas.unCambio : rellena(t.cuentas.nCambios, { n: changeCount })}
          </span>
        </span>
        <span aria-hidden className="shrink-0 text-ink-faint">
          →
        </span>
      </button>

      {/* Sólo si hay alguien que deba dinero y yo no debo, sugerimos cobrar */}
      {pending.length > 0 && (people.find(p => p.participantId === meId)?.owesCents ?? 0) <= 0 && (
        <p className="px-1 text-xs text-ink-faint">
          {t.cuentas.avisoCobrar}
        </p>
      )}
    </div>
  );
}

/** El número grande: lo único que hay que leer al llegar a esta pantalla. */
function Headline({
  currency,
  people,
  pendingCents,
  totalCents,
  isMultiPayer,
  unassignedCents,
}: {
  currency: string;
  people: ParticipantBalance[];
  pendingCents: number;
  totalCents: number;
  isMultiPayer: boolean;
  unassignedCents: number;
}) {
  const t = useT();
  const settledCount = people.filter((p) => p.settled).length;
  const anyPayer = people.some(p => p.paidCents > 0);
  
  // Total que se le debe a la gente que ha pagado de más
  const owedToPayers = people.reduce((a, p) => p.owesCents < 0 ? a + Math.abs(p.owesCents) : a, 0);

  if (!anyPayer) {
    return (
      <Card
        label={t.cuentas.totalMesa}
        value={money(totalCents, currency)}
        hint={t.cuentas.marcaPagador}
      />
    );
  }

  if (owedToPayers <= 0) {
    return (
      <Card
        tone="good"
        label={t.comanda.cuentas}
        value={t.cuentas.todoCuadrado}
        hint={t.cuentas.todosSaldados}
      />
    );
  }

  const firstPayer = people.find(p => p.owesCents < 0);

  return (
    <Card
      label={isMultiPayer || !firstPayer ? t.cuentas.faltaSaldar : rellena(t.cuentas.faltaDevolver, { name: firstPayer.name })}
      value={money(owedToPayers, currency)}
      hint={
        unassignedCents > 0 
          ? rellena(t.cuentas.sinAsignar, { dinero: money(unassignedCents, currency) })
          : rellena(t.cuentas.yaHanSaldado, { n: settledCount, total: people.length })
      }
    />
  );
}

function Card({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "good";
}) {
  return (
    <section
      className={`rounded-2xl border p-5 ${
        tone === "good" ? "border-mint/30 bg-mint/10" : "border-line bg-paper-2"
      }`}
    >
      <p className="stamp text-ink-faint">{label}</p>
      <p
        className={`tnum mt-1 text-4xl font-bold leading-none tracking-tight ${
          tone === "good" ? "text-mint" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-sm text-ink-soft">{hint}</p>
    </section>
  );
}

function PersonRow({
  person,
  currency,
  isMe,
  payeeName,
  transactions,
  allPeople,
  divider,
  first,
  onToggle,
}: {
  person: ParticipantBalance;
  currency: string;
  isMe: boolean;
  payeeName: string | null;
  transactions: import("@/lib/types").Transaction[];
  allPeople: ParticipantBalance[];
  divider: boolean;
  first: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  // owesCents > 0: debe poner dinero
  // owesCents < 0: se le debe dinero
  const mustPay = person.owesCents > 0;
  const isOwed = person.owesCents < 0;
  
  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 ${first ? "" : "border-t border-line/60"} ${
        divider ? "border-t-2 border-t-line" : ""
      } ${person.settled ? "opacity-60" : ""}`}
    >
      <Avatar name={person.name} avatar={person.avatar} color={person.color} size={30} />

      <div className="min-w-0 flex-1 font-medium py-1">
        <div className="truncate">
          {person.name}
          {isMe && <span className="ml-1.5 text-xs text-amber">{t.mesa.tu}</span>}
        </div>
        
        {!person.settled && mustPay && (
          <div className="mt-0.5 text-xs font-normal text-ink-soft leading-tight">
            {transactions
              .filter(t => t.fromId === person.participantId)
              .map(txn => `${money(txn.cents, currency)} ${t.pasos.a} ${allPeople.find(p => p.participantId === txn.toId)?.name}`)
              .join(" • ")}
          </div>
        )}
        
        {!person.settled && isOwed && (
          <div className="mt-0.5 text-xs font-normal text-ink-soft leading-tight">
            {transactions
              .filter(t => t.toId === person.participantId)
              .map(txn => `${t.cuentas.recibe} ${money(txn.cents, currency)} ${t.cuentas.de} ${allPeople.find(p => p.participantId === txn.fromId)?.name}`)
              .join(" • ")}
          </div>
        )}
      </div>

      <span className={`tnum shrink-0 font-bold ${isOwed ? "text-mint" : "text-ink"}`}>
        {money(Math.abs(person.owesCents), currency)}
      </span>

      {isOwed ? (
        <span className="stamp shrink-0 text-mint">{t.cuentas.seLeDebe}</span>
      ) : person.owesCents === 0 && person.paidCents === 0 ? (
         <span className="stamp shrink-0 text-ink-faint">{t.cuentas.noDebeNada}</span>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={person.settled}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
            person.settled
              ? "text-mint"
              : isMe
                ? "bg-amber text-paper"
                : "border border-line text-ink-soft active:bg-paper-3"
          }`}
        >
          {person.settled 
            ? t.cuentas.pagado
            : isMe 
              ? (payeeName ? `${t.cuentas.hePagado} ${t.pasos.a} ${payeeName}` : t.cuentas.hePagado) 
              : (payeeName ? `${t.cuentas.haPagado} ${t.pasos.a} ${payeeName}` : t.cuentas.haPagado)}
        </button>
      )}
    </li>
  );
}
