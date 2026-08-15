"use client";

import { money } from "@/lib/format";
import type { Pago, Participant, ParticipantBalance, Settlement, TicketState } from "@/lib/types";
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
  /** Abre la hoja de pagar a alguien con el importe ya calculado. */
  onPagar: (toId: string, cents: number) => void;
  /** «Sí, me ha llegado» o «todavía no», que lo dice quien cobra. */
  onResolver: (fromId: string, ok: boolean) => void;
  /** Abre la hoja de poner Revolut o Bizum. */
  onPonerCobro: () => void;
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
  onPagar,
  onResolver,
  onPonerCobro,
}: Props) {
  const t = useT();
  const { currency } = state.ticket;
  const people = settlement.byParticipant;
  const porId = new Map(state.participants.map((p) => [p.id, p]));
  const yo = meId ? porId.get(meId) : null;
  const miSaldo = people.find((p) => p.participantId === meId) ?? null;
  // Lo que me han dicho que me han pagado y todavía no he confirmado.
  const porConfirmar = state.pagos.filter((p) => p.toId === meId && p.estado === "dice");
  
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

      {/*
        Lo que hay que responder, arriba del todo.

        Que alguien diga que te ha pagado es lo único de esta pantalla que pide
        algo de ti en ese momento; escondido en su fila se quedaría sin
        contestar, y el que pagó se quedaría sin saber si le han devuelto.
      */}
      {porConfirmar.map((pago) => {
        const quien = porId.get(pago.fromId);
        if (!quien) return null;
        return (
          <section
            key={pago.fromId}
            className="rounded-2xl border border-mint/40 bg-mint/[0.08] p-4"
          >
            <div className="flex items-center gap-3">
              <Avatar name={quien.name} avatar={quien.avatar} color={quien.color} size={34} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">
                  {rellena(t.cobro.diceQuePago, { name: quien.name })}
                </p>
                <p className="tnum text-lg font-bold leading-tight">
                  {money(pago.cents, currency)}{" "}
                  <span className="text-xs font-normal text-ink-faint">{comoLoMando(pago.via, t)}</span>
                </p>
              </div>
            </div>
            <p className="mt-2 text-sm text-ink-soft">{t.cobro.teHaLlegado}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => onResolver(pago.fromId, true)}
                className="flex-1 rounded-xl bg-mint py-2.5 text-sm font-bold text-paper transition-transform active:scale-[0.98]"
              >
                {t.cobro.siLlego}
              </button>
              {/*
                Decir que no vuelve a dejarlo pendiente y no se lo cuenta a
                nadie más. Puede ser verdad y estar el dinero de camino —una
                transferencia tarda hasta un día— y anunciarle a ocho personas
                que fulano no ha pagado, por diez euros y pudiendo ser mentira,
                hace más daño que bien.
              */}
              <button
                type="button"
                onClick={() => onResolver(pago.fromId, false)}
                className="flex-1 rounded-xl border border-line bg-paper py-2.5 text-sm font-semibold text-ink-soft transition-colors active:bg-paper-3"
              >
                {t.cobro.noLlego}
              </button>
            </div>
          </section>
        );
      })}

      {/*
        Si te deben dinero y no has dicho cómo cobrarlo, nadie puede pagarte de
        un toque. Se ofrece aquí y no antes: al crear la comanda todavía no le
        debe nada a nadie, y un formulario en ese momento sólo estorba.
      */}
      {yo && miSaldo && miSaldo.owesCents < 0 && !yo.revolut && !yo.bizum && (
        <button
          type="button"
          onClick={onPonerCobro}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-amber/40 bg-amber/[0.08] px-4 py-3 text-left transition-colors active:bg-amber/15"
        >
          <span>
            <span className="text-sm font-bold">{t.cobro.faltaTitulo}</span>
            <span className="mt-0.5 block text-xs text-ink-soft">{t.cobro.faltaAviso}</span>
          </span>
          <span className="shrink-0 rounded-lg bg-amber px-3 py-1.5 text-xs font-bold text-paper">
            {t.cobro.ponerlo}
          </span>
        </button>
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
                  porId={porId}
                  pagos={state.pagos}
                  onPagar={onPagar}
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

/** Por dónde dice que lo ha mandado, para que quien cobra sepa dónde mirar. */
function comoLoMando(via: Pago["via"], t: ReturnType<typeof useT>): string {
  if (via === "revolut") return t.cobro.porRevolut;
  if (via === "bizum") return t.cobro.porBizum;
  return t.cobro.enMano;
}

/** El número grande: lo único que hay que leer al llegar a esta pantalla. */
function Headline({
  currency,
  people,
  totalCents,
  isMultiPayer,
  unassignedCents,
}: {
  currency: string;
  people: ParticipantBalance[];
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
  porId,
  pagos,
  onPagar,
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
  porId: Map<string, Participant>;
  pagos: Pago[];
  onPagar: (toId: string, cents: number) => void;
  divider: boolean;
  first: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  // owesCents > 0: debe poner dinero
  // owesCents < 0: se le debe dinero
  const mustPay = person.owesCents > 0;
  const isOwed = person.owesCents < 0;
  const misDeudas = transactions.filter((txn) => txn.fromId === person.participantId);
  const puedePagarEnLaApp =
    isMe &&
    mustPay &&
    misDeudas.some((txn) => {
      const cobra = porId.get(txn.toId);
      return Boolean(cobra?.revolut || cobra?.bizum);
    });

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
            {misDeudas
              .map(txn => `${money(txn.cents, currency)} ${t.pasos.a} ${allPeople.find(p => p.participantId === txn.toId)?.name}`)
              .join(" • ")}
          </div>
        )}

        {/*
          El botón de pagar, sólo en tu propia fila y sólo si el otro ha dicho
          cómo quiere cobrar. Uno por deuda: con dos tickets puedes deberle a
          dos personas distintas y cada una cobra por su lado.
        */}
        {isMe && !person.settled && mustPay && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {misDeudas.map((txn) => {
              const cobra = porId.get(txn.toId);
              if (!cobra || (!cobra.revolut && !cobra.bizum)) return null;
              const dicho = pagos.find(
                (p) => p.fromId === person.participantId && p.toId === txn.toId,
              );
              if (dicho?.estado === "ok") return null;
              if (dicho) {
                return (
                  <span key={txn.toId} className="stamp text-mint">
                    {rellena(t.cobro.esperando, { name: cobra.name })}
                  </span>
                );
              }
              return (
                <button
                  key={txn.toId}
                  type="button"
                  onClick={() => onPagar(txn.toId, txn.cents)}
                  className="rounded-lg bg-amber px-3 py-1.5 text-xs font-bold text-paper transition-transform active:scale-95"
                >
                  {t.cobro.pagar} {money(txn.cents, currency)}
                  {misDeudas.length > 1 ? ` ${t.pasos.a} ${cobra.name}` : ""}
                </button>
              );
            })}
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
      ) : /*
           Con el botón de pagar arriba sobra el «He pagado» de aquí: son dos
           formas de decir lo mismo pegadas, y la de arriba lleva además el
           efectivo dentro. Se queda para las filas de los demás, que es como
           quien cobra marca a mano a quien le dio el dinero en la mesa.
         */
      puedePagarEnLaApp && !person.settled ? null : (
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
