"use client";

import { money } from "@/lib/format";
import type { Pago, ParticipantBalance, Settlement, TicketState } from "@/lib/types";
import { useT, rellena } from "@/lib/i18n";
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Avatar } from "./ui";

interface Props {
  state: TicketState;
  settlement: Settlement;
  meId: string | null;
  onSetPayer: (participantId: string | null, receiptId: string | null) => void;
  onSetSettled: (participantId: string, settled: boolean) => void;
  onSetTotal: (cents: number) => void;
  onOpenLog: () => void;
  onPagar: (toId: string, cents: number) => void;
  onResolver: (fromId: string, ok: boolean) => void;
  onPonerCobro: () => void;
  /** Los tickets a los que nadie ha dicho todavía quién los pagó. */
  ticketsSinPagador: { id: string | null; label: string | null }[];
  onDecirPagador: (receiptId: string | null) => void;
}

export default function AccountsPanel({
  state,
  settlement,
  meId,
  onSetSettled,
  onPagar,
  onResolver,
  ticketsSinPagador,
  onDecirPagador,
}: Props) {
  const t = useT();
  const { currency } = state.ticket;
  const people = settlement.byParticipant;
  const porId = new Map(state.participants.map((p) => [p.id, p]));
  const yo = meId ? porId.get(meId) : null;
  const miSaldo = people.find((p) => p.participantId === meId) ?? null;
  const porConfirmar = state.pagos.filter((p) => p.toId === meId && p.estado === "dice");

  const isMultiPayer = new Set(
    (state.receipts || []).map(r => r.payerId).concat(state.ticket.payerId).filter(Boolean)
  ).size > 1;

  // Estados del usuario
  const soyPagador = (miSaldo?.paidCents ?? 0) > 0;
  const deboDinero = (miSaldo?.owesCents ?? 0) > 0 && !miSaldo?.settled;
  const estoyEnPaz = miSaldo && miSaldo.owesCents === 0 && miSaldo.paidCents === 0;
  
  // Si soy un observador sin saldo
  const soyObservador = !miSaldo;

  // Separar personas para el pagador
  const faltanPorPagar = people.filter(p => p.owesCents > 0 && !p.settled);
  const yaHanPagado = people.filter(p => p.owesCents > 0 && p.settled);

  const isCompleted =
    state.items.length > 0 &&
    settlement.unassignedCents === 0 &&
    faltanPorPagar.length === 0 &&
    people.some((p) => p.paidCents > 0) &&
    // Sin saber quién puso cada ticket no hay nada que celebrar: los números
    // de arriba todavía no son los buenos.
    ticketsSinPagador.length === 0;

  const prevCompleted = useRef(false);
  useEffect(() => {
    if (isCompleted && !prevCompleted.current) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#e8b04b", "#5ec5c0", "#e0705f"],
        disableForReducedMotion: true
      });
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    }
    prevCompleted.current = isCompleted;
  }, [isCompleted]);

  return (
    <div className="space-y-4 pb-40">
      {state.ticket.closed && !isCompleted && (
        <div className="rounded-2xl border border-mint/40 bg-mint/[0.08] p-4 text-center">
          <p className="text-lg font-bold text-mint tracking-tight">{t.cuentas.mesaCerrada}</p>
          <p className="text-sm text-ink-soft mt-1">{t.cuentas.mesaCerradaAviso}</p>
        </div>
      )}

      {/*
        Mientras quede un ticket sin pagador, todo lo de abajo está mal.

        Lo que costó ese papel se le cobra a quien se lo comió pero no se le
        abona a nadie, así que aparece una deuda sin acreedor: la fila te dice
        que debes treinta cuando en realidad debes diez. Y no se nota, porque
        la flecha de «quién paga a quién» sí sale bien. Por eso el aviso va
        arriba del todo y en rojo, no escondido.
      */}
      {ticketsSinPagador.length > 0 && (
        <button
          type="button"
          onClick={() => onDecirPagador(ticketsSinPagador[0].id)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-clay/40 bg-clay/[0.08] px-4 py-3 text-left transition-colors active:bg-clay/15"
        >
          <span className="text-sm leading-relaxed text-clay">
            {ticketsSinPagador.length === 1
              ? rellena(t.cuentas.faltaPagadorUno, {
                  que: ticketsSinPagador[0].label || t.pagadorTicket.esteTicket,
                })
              : rellena(t.cuentas.faltaPagadorVarios, { n: ticketsSinPagador.length })}
          </span>
          <span className="shrink-0 rounded-lg bg-clay px-3 py-1.5 text-xs font-bold text-paper">
            {t.cuentas.decirlo}
          </span>
        </button>
      )}

      {isCompleted && (
        <div className="rounded-2xl border border-amber/40 bg-amber/[0.08] p-5 text-center shadow-lg shadow-amber/5">
          <p className="text-2xl font-bold text-amber tracking-tight">{t.cuentas.diviCompletado}</p>
          <p className="text-sm text-ink-soft mt-1">{t.cuentas.diviCompletadoAviso}</p>
        </div>
      )}

      {/* Si NADIE ha pagado, mostramos el titular global para que alguien se asigne */}
      {(!people.some(p => p.paidCents > 0) || soyObservador) && (
        <Headline
          currency={currency}
          people={people}
          totalCents={settlement.grandTotalCents}
          isMultiPayer={isMultiPayer}
          unassignedCents={settlement.unassignedCents}
        />
      )}

      {/* --- SECCIÓN 1: PAGOS POR CONFIRMAR --- */}
      {porConfirmar.map((pago) => {
        const quien = porId.get(pago.fromId);
        if (!quien) return null;
        return (
          <section key={pago.fromId} className="rounded-2xl border border-mint/40 bg-mint/[0.08] p-4">
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

      {/* --- SECCIÓN 2: DEUDORES (SOLO VEN SUS DEUDAS Y BOTÓN DE PAGAR) --- */}
      {yo && deboDinero && (
        <section className="space-y-3">
          {settlement.transactions
            .filter((txn) => txn.fromId === meId)
            .map((txn) => {
              const cobra = porId.get(txn.toId);
              if (!cobra) return null;
              const dicho = state.pagos.find((p) => p.fromId === meId && p.toId === txn.toId);
              if (dicho?.estado === "ok") return null;
              const esperando = dicho?.estado === "dice";

              return (
                <div key={txn.toId} className="relative mt-8 flex flex-col items-center gap-5 rounded-[2rem] border border-amber/20 bg-gradient-to-b from-amber/[0.08] to-transparent px-6 pb-8 pt-12 text-center shadow-[0_8px_30px_-12px_rgba(232,176,75,0.15)]">
                  <div className="absolute -top-7 rounded-full border-[6px] border-paper bg-paper shadow-sm">
                    <Avatar name={cobra.name} avatar={cobra.avatar} color={cobra.color} size={54} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold tracking-wide text-ink-soft uppercase">
                      {rellena(t.cuentas.debesAName, { name: cobra.name })}
                    </p>
                    <p className="tnum text-5xl font-extrabold tracking-tighter text-amber drop-shadow-sm">
                      {money(txn.cents, currency)}
                    </p>
                  </div>
                  
                  {esperando ? (
                    <div className="flex w-full max-w-[280px] items-center justify-center gap-2 rounded-2xl bg-mint/10 px-4 py-3 text-sm font-semibold text-mint">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                      {rellena(t.cobro.esperando, { name: cobra.name })}
                    </div>
                  ) : (
                    /*
                      El botón sale siempre, tenga el otro puesto Revolut o no.

                      Sin él, a quien no había dicho cómo cobrar no se le podía
                      pagar de ninguna manera: ni siquiera marcar que se lo
                      habías dado en mano. Debiendo a dos y habiendo puesto sólo
                      uno su Revolut, la mesa se quedaba a medias sin que se
                      pudiera hacer nada. La hoja ya se encarga de ofrecer lo
                      que haya: Revolut, Bizum o el efectivo, que siempre está.
                    */
                    <div className="flex w-full max-w-[280px] flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => onPagar(txn.toId, txn.cents)}
                        className="w-full rounded-2xl bg-amber px-6 py-4 text-[17px] font-extrabold text-paper transition-all active:scale-[0.98] shadow-[0_4px_20px_-6px_rgba(232,176,75,0.4)]"
                      >
                        {t.cuentas.pagarAhora}
                      </button>
                      {!cobra.revolut && !cobra.bizum && (
                        <p className="text-xs leading-relaxed text-ink-faint">
                          {rellena(t.cobro.sinMetodo, { name: cobra.name })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </section>
      )}

      {/* --- SECCIÓN 3: ESTOY EN PAZ (NI DEBO NI ME DEBEN) --- */}
      {yo && estoyEnPaz && !soyPagador && (
        <section className="rounded-2xl border border-mint/30 bg-mint/10 p-5 text-center">
          <p className="tnum mt-1 text-2xl font-bold leading-none tracking-tight text-mint">
            {t.cuentas.enPaz}
          </p>
          <p className="mt-2 text-sm text-ink-soft">{t.cuentas.enPazAviso}</p>
        </section>
      )}

      {/* --- SECCIÓN 4: PAGADORES (VEN EL TOTAL Y LA LISTA DE DEUDORES Y PAGADOS) --- */}
      {soyPagador && (
        <div className="space-y-4">
          <Headline
            currency={currency}
            people={people}
            totalCents={settlement.grandTotalCents}
            isMultiPayer={isMultiPayer}
            unassignedCents={settlement.unassignedCents}
            meId={meId}
          />
          
          {(faltanPorPagar.length > 0 || yaHanPagado.length > 0) && (
            <section className="overflow-hidden rounded-2xl border border-line bg-paper-2">
              {faltanPorPagar.length > 0 && (
                <>
                  <div className="bg-paper-3 px-4 py-2 text-xs font-bold text-ink-soft uppercase tracking-wider">
                    {t.cuentas.faltanPorPagarte}
                  </div>
                  <ul>
                    {faltanPorPagar.map((person, index) => (
                      <PersonRow
                        key={person.participantId}
                        person={person}
                        currency={currency}
                        isMe={person.participantId === meId}
                        first={index === 0}
                        soyPagador={true}
                        onToggle={() => onSetSettled(person.participantId, !person.settled)}
                      />
                    ))}
                  </ul>
                </>
              )}
              
              {yaHanPagado.length > 0 && (
                <>
                  <div className="bg-paper-3 px-4 py-2 text-xs font-bold text-ink-soft uppercase tracking-wider border-t border-line/60">
                    {t.cuentas.yaTeHanPagado}
                  </div>
                  <ul>
                    {yaHanPagado.map((person, index) => (
                      <PersonRow
                        key={person.participantId}
                        person={person}
                        currency={currency}
                        isMe={person.participantId === meId}
                        first={index === 0}
                        soyPagador={true}
                        onToggle={() => onSetSettled(person.participantId, !person.settled)}
                      />
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </div>
      )}


    </div>
  );
}

function comoLoMando(via: Pago["via"], t: ReturnType<typeof useT>): string {
  if (via === "revolut") return t.cobro.porRevolut;
  if (via === "bizum") return t.cobro.porBizum;
  return t.cobro.enMano;
}

function Headline({
  currency,
  people,
  totalCents,
  isMultiPayer,
  unassignedCents,
  meId,
}: {
  currency: string;
  people: ParticipantBalance[];
  totalCents: number;
  isMultiPayer: boolean;
  unassignedCents: number;
  meId?: string | null;
}) {
  const t = useT();
  const anyPayer = people.some(p => p.paidCents > 0);
  
  const debtors = people.filter(p => p.owesCents > 0);
  const settledCount = debtors.filter(p => p.settled).length;
  const totalDebtors = debtors.length;

  const remainingToPayers = debtors.reduce((acc, p) => {
    if (!p.settled) return acc + p.owesCents;
    return acc;
  }, 0);

  if (!anyPayer) {
    return (
      <Card
        label={t.cuentas.totalMesa}
        value={money(totalCents, currency)}
        hint={t.cuentas.sinPagador}
      />
    );
  }

  if (remainingToPayers <= 0) {
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
  const isFirstPayerMe = meId && firstPayer?.participantId === meId;

  return (
    <Card
      label={isMultiPayer || !firstPayer ? t.cuentas.faltaSaldar : isFirstPayerMe ? t.cuentas.faltaDevolverAmi : rellena(t.cuentas.faltaDevolver, { name: firstPayer.name })}
      value={money(remainingToPayers, currency)}
      hint={
        unassignedCents > 0 
          ? rellena(t.cuentas.sinAsignar, { dinero: money(unassignedCents, currency) })
          : rellena(t.cuentas.yaHanSaldado, { n: settledCount, total: totalDebtors })
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
  first,
  soyPagador,
  onToggle,
}: {
  person: ParticipantBalance;
  currency: string;
  isMe: boolean;
  first: boolean;
  soyPagador?: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  const isOwed = person.owesCents < 0;

  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 ${first ? "" : "border-t border-line/60"} ${
        person.settled ? "opacity-60" : ""
      }`}
    >
      <Avatar name={person.name} avatar={person.avatar} color={person.color} size={30} />

      <div className="min-w-0 flex-1 font-medium py-1">
        <div className="truncate">
          {person.name}
          {isMe && <span className="ml-1.5 text-xs text-amber">{t.mesa.tu}</span>}
        </div>
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
            ? soyPagador ? t.cuentas.yaMeHaPagado : t.cuentas.pagado
            : soyPagador ? t.cuentas.meHaPagado : t.cuentas.haPagado}
        </button>
      )}
    </li>
  );
}
