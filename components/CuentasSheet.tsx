"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { money } from "@/lib/format";
import { useT, rellena } from "@/lib/i18n";
import type { Pago, ParticipantBalance, Settlement, TicketState } from "@/lib/types";
import { Avatar, CerrarHoja, Sheet } from "./ui";

interface Props {
  state: TicketState;
  settlement: Settlement;
  meId: string | null;
  onSetSettled: (participantId: string, settled: boolean) => void;
  onPagar: (toId: string, cents: number) => void;
  onResolver: (fromId: string, ok: boolean) => void;
  /** Los tickets a los que nadie ha dicho todavía quién los pagó. */
  ticketsSinPagador: { id: string | null; label: string | null }[];
  onDecirPagador: (receiptId: string | null) => void;
  onClose: () => void;
}

/**
 * Las cuentas de la mesa, en una hoja.
 *
 * Era una pestaña, y tener dos pantallas obligaba a decidir en cuál estabas
 * antes de poder hacer nada: el botón de abajo cambiaba de significado y a
 * veces llevaba a pagar y a veces a cambiar de pestaña. Ahora la comanda es la
 * pantalla y esto es lo que se abre encima cuando quieres saber cómo va.
 *
 * Una fila por persona con su saldo, y el botón de pagar donde tiene sentido:
 * al lado de quien te toca pagar, no en un sitio aparte. Debiéndole a dos, son
 * dos filas con dos botones, que es exactamente lo que hay que hacer.
 */
export default function CuentasSheet({
  state,
  settlement,
  meId,
  onSetSettled,
  onPagar,
  onResolver,
  ticketsSinPagador,
  onDecirPagador,
  onClose,
}: Props) {
  const t = useT();
  const { currency } = state.ticket;
  const people = settlement.byParticipant;
  const porId = new Map(state.participants.map((p) => [p.id, p]));
  const miSaldo = people.find((p) => p.participantId === meId) ?? null;
  const porConfirmar = state.pagos.filter((p) => p.toId === meId && p.estado === "dice");

  /* A quién le debo y cuánto, ya neteado: si en la misma mesa yo le debo a Ana
     y Ana me debe a mí, aquí sólo queda la diferencia. */
  const debo = new Map(
    settlement.transactions.filter((tx) => tx.fromId === meId).map((tx) => [tx.toId, tx.cents]),
  );
  const soyPagador = (miSaldo?.paidCents ?? 0) > 0;

  const faltanPorPagar = people.filter((p) => p.owesCents > 0 && !p.settled);
  const isCompleted =
    state.items.length > 0 &&
    settlement.unassignedCents === 0 &&
    faltanPorPagar.length === 0 &&
    people.some((p) => p.paidCents > 0) &&
    // Sin saber quién puso cada ticket no hay nada que celebrar: los números
    // todavía no son los buenos.
    ticketsSinPagador.length === 0;

  const prevCompleted = useRef(false);
  useEffect(() => {
    if (isCompleted && !prevCompleted.current) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#e8b04b", "#5ec5c0", "#e0705f"],
        disableForReducedMotion: true,
      });
      navigator.vibrate?.([100, 50, 100]);
    }
    prevCompleted.current = isCompleted;
  }, [isCompleted]);

  return (
    <Sheet
      onClose={onClose}
      titulo={t.comanda.cuentas}
      sub={
        <>
          {state.ticket.place ? `${state.ticket.place} · ` : ""}
          <span className="tnum tracking-[0.12em]">{state.ticket.id}</span>
        </>
      }
    >
      <div className="mt-4 grid gap-3">
        {/*
          Mientras quede un ticket sin pagador, todo lo de abajo está mal: lo
          que costó ese papel se le cobra a quien se lo comió pero no se le
          abona a nadie, así que sale una deuda sin acreedor. Por eso va arriba
          del todo y en rojo, no escondido al final.
        */}
        {ticketsSinPagador.length > 0 && (
          <button
            type="button"
            onClick={() => onDecirPagador(ticketsSinPagador[0].id)}
            className="flex w-full items-center justify-between gap-3 rounded-bloque border border-clay/40 bg-clay/[0.08] px-4 py-3.5 text-left transition-colors active:bg-clay/15"
          >
            <span className="text-[13px] leading-relaxed text-clay">
              {ticketsSinPagador.length === 1
                ? rellena(t.cuentas.faltaPagadorUno, {
                    que: ticketsSinPagador[0].label || t.pagadorTicket.esteTicket,
                  })
                : rellena(t.cuentas.faltaPagadorVarios, { n: ticketsSinPagador.length })}
            </span>
            <span className="shrink-0 rounded-lg bg-clay px-3 py-2 text-[13px] font-bold text-paper">
              {t.cuentas.decirlo}
            </span>
          </button>
        )}

        {state.ticket.closed && !isCompleted && (
          <div className="rounded-bloque border border-mint/40 bg-mint/[0.08] px-4 py-3.5">
            <p className="text-[15px] font-bold text-mint">{t.cuentas.mesaCerrada}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              {t.cuentas.mesaCerradaAviso}
            </p>
          </div>
        )}

        {isCompleted ? (
          <div className="rounded-bloque border border-amber/40 bg-amber/[0.08] px-4 py-4 text-center">
            <p className="text-[21px] font-bold tracking-[-0.025em] text-amber">
              {t.cuentas.diviCompletado}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              {t.cuentas.diviCompletadoAviso}
            </p>
          </div>
        ) : (
          <Titular
            currency={currency}
            people={people}
            meId={meId}
            totalCents={settlement.grandTotalCents}
            unassignedCents={settlement.unassignedCents}
            receipts={state.receipts}
            payerId={state.ticket.payerId}
          />
        )}

        {/* Lo que alguien dice haber enviado y todavía no has confirmado. */}
        {porConfirmar.map((pago) => {
          const quien = porId.get(pago.fromId);
          if (!quien) return null;
          return (
            <section
              key={pago.fromId}
              className="rounded-bloque border border-mint/40 bg-mint/[0.08] px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <Avatar name={quien.name} avatar={quien.avatar} color={quien.color} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold leading-tight">
                    {rellena(t.cobro.diceQuePago, { name: quien.name })}
                  </p>
                  <p className="tnum text-[17px] font-bold leading-tight">
                    {money(pago.cents, currency)}{" "}
                    <span className="text-[13px] font-normal text-ink-faint">
                      {comoLoMando(pago.via, t)}
                    </span>
                  </p>
                </div>
              </div>
              <p className="mt-2.5 text-[13px] text-ink-soft">{t.cobro.teHaLlegado}</p>
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  onClick={() => onResolver(pago.fromId, true)}
                  className="min-h-[46px] flex-1 rounded-xl bg-mint text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
                >
                  {t.cobro.siLlego}
                </button>
                <button
                  type="button"
                  onClick={() => onResolver(pago.fromId, false)}
                  className="min-h-[46px] flex-1 rounded-xl border border-line text-[15px] font-semibold text-ink-soft transition-colors active:bg-paper-3"
                >
                  {t.cobro.noLlego}
                </button>
              </div>
            </section>
          );
        })}

        {/* ------------------------------------------------------ el reparto */}
        <ul className="grid list-none">
          {people.map((person) => (
            <Fila
              key={person.participantId}
              person={person}
              currency={currency}
              esYo={person.participantId === meId}
              /* Lo que le debo a esta persona, si es que le debo algo. */
              leDebo={debo.get(person.participantId) ?? null}
              yaDicho={Boolean(
                state.pagos.find(
                  (p) =>
                    p.fromId === meId && p.toId === person.participantId && p.estado === "dice",
                ),
              )}
              puedoSaldarle={soyPagador && person.owesCents > 0 && person.participantId !== meId}
              onPagar={() => onPagar(person.participantId, debo.get(person.participantId) ?? 0)}
              onToggle={() => onSetSettled(person.participantId, !person.settled)}
            />
          ))}

          {settlement.unassignedCents > 0 && (
            <li className="flex items-center gap-3 border-b border-line-soft py-3 last:border-b-0">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-[1.5px] border-dashed border-clay text-[13px] font-bold text-clay"
              >
                ?
              </span>
              <span className="min-w-0 flex-1 text-[15px] font-medium text-clay">
                {t.comanda.sinRepartir}
              </span>
              <span className="tnum shrink-0 text-[17px] font-bold text-clay">
                {money(settlement.unassignedCents, currency)}
              </span>
            </li>
          )}
        </ul>

        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3.5">
          <span className="stamp text-ink-faint">{t.cuentas.totalDelTicket}</span>
          <span className="tnum text-[21px] font-bold">
            {money(settlement.grandTotalCents, currency)}
          </span>
        </div>

        <CerrarHoja onClick={onClose}>{t.mesa.cerrar}</CerrarHoja>
      </div>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */

function Fila({
  person,
  currency,
  esYo,
  leDebo,
  yaDicho,
  puedoSaldarle,
  onPagar,
  onToggle,
}: {
  person: ParticipantBalance;
  currency: string;
  esYo: boolean;
  leDebo: number | null;
  yaDicho: boolean;
  puedoSaldarle: boolean;
  onPagar: () => void;
  onToggle: () => void;
}) {
  const t = useT();
  const leDeben = person.owesCents < 0;

  /*
    La cifra de la fila es siempre la de la acción que tiene al lado.

    Salía el balance global de la persona: junto a Marta ponía 38,36 € —lo que
    le debe la mesa entera— y al lado un «Pagar ahora» que en realidad enviaba
    17,76 €, que es lo que le debes tú. Dos números distintos a un centímetro
    uno del otro, y el que se lee es el grande. El total de Marta sigue estando
    donde toca, en el titular de arriba.
  */
  const importe = leDebo != null ? leDebo : Math.abs(person.owesCents);
  const pie = leDebo != null ? t.cuentas.leDebes : puedoSaldarle ? t.cuentas.teDebe : null;

  return (
    <li
      className={`flex items-center gap-3 border-b border-line-soft py-3 last:border-b-0 ${
        person.settled && !esYo ? "opacity-60" : ""
      }`}
    >
      <Avatar name={person.name} avatar={person.avatar} color={person.color} size={32} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">
          {person.name}
          {esYo && <span className="ml-1.5 text-[13px] font-semibold text-amber">{t.mesa.tu}</span>}
        </span>
    {pie && <span className="text-[12px] mt-1 block text-ink-faint">{pie}</span>}
      </span>
      <span
        className={`tnum shrink-0 text-[17px] font-bold ${
          leDebo != null ? "text-amber" : leDeben ? "text-mint" : esYo ? "text-amber" : "text-ink"
        }`}
      >
        {money(importe, currency)}
      </span>

      {/*
        La acción, al lado de la persona a la que va dirigida. El botón de pagar
        sale siempre que le debas algo, tenga el otro puesto su Revolut o no: la
        hoja de pagar ya ofrece lo que haya, y el efectivo siempre está.
      */}
      {leDebo != null && !yaDicho ? (
        <button
          type="button"
          onClick={onPagar}
          className="min-h-10 shrink-0 rounded-xl bg-amber px-3.5 text-[13px] font-bold text-paper transition-transform active:scale-[0.97]"
        >
          {t.cuentas.pagarAhora}
        </button>
      ) : leDebo != null && yaDicho ? (
    <span className="text-[12px] shrink-0 text-mint">{t.cobro.esperandoCorto}</span>
      ) : puedoSaldarle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={person.settled}
          className={`min-h-10 shrink-0 rounded-xl px-3.5 text-[13px] font-semibold transition-colors ${
            person.settled
              ? "text-mint"
              : "border border-line text-ink-soft active:bg-paper-3"
          }`}
        >
          {person.settled ? t.cuentas.yaMeHaPagado : t.cuentas.meHaPagado}
        </button>
      ) : leDeben ? (
        /* En tu propia fila no: el titular de arriba ya dice «falta que te
           paguen», y repetirlo al lado de tu nombre sólo añade ruido. */
    esYo ? null : <span className="text-[12px] shrink-0 text-mint">{t.cuentas.seLeDebe}</span>
      ) : person.owesCents === 0 ? (
    <span className="text-[12px] shrink-0 text-ink-faint">{t.cuentas.noDebeNada}</span>
      ) : person.settled ? (
    <span className="text-[12px] shrink-0 text-mint">{t.cuentas.pagado}</span>
      ) : null}
    </li>
  );
}

/** La cifra que resume la mesa: qué falta y para quién. */
function Titular({
  currency,
  people,
  meId,
  totalCents,
  unassignedCents,
  receipts,
  payerId,
}: {
  currency: string;
  people: ParticipantBalance[];
  meId: string | null;
  totalCents: number;
  unassignedCents: number;
  receipts: TicketState["receipts"];
  payerId: string | null;
}) {
  const t = useT();
  const deudores = people.filter((p) => p.owesCents > 0);
  const saldados = deudores.filter((p) => p.settled).length;
  const falta = deudores.reduce((acc, p) => (p.settled ? acc : acc + p.owesCents), 0);

  if (!people.some((p) => p.paidCents > 0)) {
    return (
      <Bloque
        label={t.cuentas.totalMesa}
        value={money(totalCents, currency)}
        hint={t.cuentas.sinPagador}
      />
    );
  }

  /*
    Que nadie deba nada no quiere decir que la cuenta esté hecha.

    Con media carta sin coger, los que no han cogido nada deben cero y aquí
    salía un «Todo cuadrado» en verde con la mesa a medias —y con la fila roja
    de «sin repartir» tres centímetros más abajo, contradiciéndolo—. Lo que
    falta no es que alguien pague: es que alguien diga de quién es lo que
    queda.
  */
  if (unassignedCents > 0) {
    return (
      <Bloque
        tono="aviso"
        label={t.comanda.sinRepartir}
        value={money(unassignedCents, currency)}
        hint={t.cuentas.sinRepartirAviso}
      />
    );
  }

  if (falta <= 0) {
    return (
      <Bloque
        tono="bien"
        label={t.comanda.cuentas}
        value={t.cuentas.todoCuadrado}
        hint={t.cuentas.todosSaldados}
      />
    );
  }

  const variosPagadores =
    new Set(
      (receipts || [])
        .map((r) => r.payerId)
        .concat(payerId)
        .filter(Boolean),
    ).size > 1;
  const primerPagador = people.find((p) => p.owesCents < 0);
  const pagoYo = meId && primerPagador?.participantId === meId;

  return (
    <Bloque
      label={
        variosPagadores || !primerPagador
          ? t.cuentas.faltaSaldar
          : pagoYo
            ? t.cuentas.faltaDevolverAmi
            : rellena(t.cuentas.faltaDevolver, { name: primerPagador.name })
      }
      value={money(falta, currency)}
      hint={rellena(t.cuentas.yaHanSaldado, { n: saldados, total: deudores.length })}
    />
  );
}

function Bloque({
  label,
  value,
  hint,
  tono = "normal",
}: {
  label: string;
  value: string;
  hint: string;
  tono?: "normal" | "bien" | "aviso";
}) {
  return (
    <section
      className={`rounded-bloque border px-4 py-4 ${
        tono === "bien"
          ? "border-mint/30 bg-mint/[0.08]"
          : tono === "aviso"
            ? "border-clay/40 bg-clay/[0.08]"
            : "border-line-soft bg-paper"
      }`}
    >
      <p className="stamp text-ink-faint">{label}</p>
      <p
        className={`tnum mt-2 text-[24px] font-bold leading-none tracking-[-0.02em] ${
          tono === "bien" ? "text-mint" : "text-ink"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{hint}</p>
    </section>
  );
}

function comoLoMando(via: Pago["via"], t: ReturnType<typeof useT>): string {
  if (via === "revolut") return t.cobro.porRevolut;
  if (via === "bizum") return t.cobro.porBizum;
  return t.cobro.enMano;
}
