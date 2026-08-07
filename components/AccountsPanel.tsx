"use client";

import { money } from "@/lib/format";
import type { Settlement, TicketState } from "@/lib/types";
import MoneyInput from "./MoneyInput";
import { Avatar, Stat } from "./ui";

interface Props {
  state: TicketState;
  settlement: Settlement;
  meId: string | null;
  onSetPayer: (participantId: string) => void;
  onSetPaid: (participantId: string, cents: number) => void;
  onSetTip: (cents: number) => void;
  onSetTotal: (cents: number) => void;
  onRemoveParticipant: (participantId: string) => void;
}

export default function AccountsPanel({
  state,
  settlement,
  meId,
  onSetPayer,
  onSetPaid,
  onSetTip,
  onSetTotal,
  onRemoveParticipant,
}: Props) {
  const { currency } = state.ticket;
  const payer = state.participants.find((p) => p.isPayer) ?? null;

  return (
    <div className="space-y-6 pb-40">
      {/* ------------------------------------------------------------ estado */}
      <Alerts settlement={settlement} currency={currency} hasPayer={Boolean(payer)} />

      {/* ------------------------------------------------------------- cifras */}
      <section className="rounded-2xl border border-line bg-paper-2 p-5">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <Stat label="Total ticket" value={money(settlement.grandTotalCents, currency)} />
          <Stat label="Repartido" value={money(settlement.assignedCents, currency)} tone="good" />
          <Stat
            label="Sin asignar"
            value={money(settlement.unassignedCents, currency)}
            tone={settlement.unassignedCents === 0 ? "good" : "warn"}
          />
          <Stat label="Pagado" value={money(settlement.paidCents, currency)} />
        </div>

        <div className="rule my-5" />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-soft">Total impreso en el ticket</span>
            <MoneyInput
              cents={state.ticket.totalCents}
              onCommit={onSetTotal}
              ariaLabel="Total del ticket"
              className="w-28"
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-ink-soft">Propina</span>
            <div className="flex items-center gap-1.5">
              {[0, 0.05, 0.1].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => onSetTip(Math.round(state.ticket.totalCents * pct))}
                  className="rounded-lg border border-line px-2.5 py-2 text-xs font-semibold text-ink-soft transition-colors hover:border-amber hover:text-amber"
                >
                  {pct === 0 ? "sin" : `${pct * 100}%`}
                </button>
              ))}
              <MoneyInput
                cents={state.ticket.tipCents}
                onCommit={onSetTip}
                ariaLabel="Propina"
                className="w-24"
              />
            </div>
          </div>
        </div>

        {settlement.extrasCents !== 0 && (
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            Hay {money(Math.abs(settlement.extrasCents), currency)}{" "}
            {settlement.extrasCents > 0 ? "de diferencia" : "de descuento"} entre la suma de los
            platos y el total del ticket (servicio, impuestos…). Se reparte entre todos en
            proporción a lo que ha consumido cada uno.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------ quién pagó */}
      <section className="rounded-2xl border border-line bg-paper-2 p-5">
        <h3 className="text-lg font-bold tracking-tight">Quién ha pagado</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Marca a quien puso la tarjeta. Si pagasteis entre varios, apunta cuánto puso cada uno.
        </p>

        {state.participants.length === 0 ? (
          <p className="mt-4 text-sm text-ink-faint">Todavía no hay nadie en la mesa.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {state.participants.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-center gap-3 rounded-xl bg-paper px-3 py-2.5"
              >
                <Avatar name={person.name} color={person.color} size={30} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {person.name}
                  {person.id === meId && <span className="ml-1.5 text-xs text-amber">(tú)</span>}
                </span>

                <button
                  type="button"
                  onClick={() => onSetPayer(person.id)}
                  aria-pressed={person.isPayer}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    person.isPayer
                      ? "bg-amber text-paper"
                      : "border border-line text-ink-soft hover:border-amber hover:text-amber"
                  }`}
                >
                  {person.isPayer ? "Pagó ✓" : "Pagó él/ella"}
                </button>

                <MoneyInput
                  cents={person.paidCents}
                  onCommit={(cents) => onSetPaid(person.id, cents)}
                  ariaLabel={`Cuánto puso ${person.name}`}
                  className="w-24"
                />

                <button
                  type="button"
                  onClick={() => onRemoveParticipant(person.id)}
                  aria-label={`Quitar a ${person.name}`}
                  className="rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors hover:text-clay"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* --------------------------------------------------------- por persona */}
      <section className="rounded-2xl border border-line bg-paper-2 p-5">
        <h3 className="text-lg font-bold tracking-tight">Lo que le toca a cada uno</h3>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="stamp text-left text-ink-faint">
                <th className="pb-2 font-normal">Comensal</th>
                <th className="pb-2 text-right font-normal">Platos</th>
                <th className="pb-2 text-right font-normal">Extras</th>
                <th className="pb-2 text-right font-normal">Debe</th>
                <th className="pb-2 text-right font-normal">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {settlement.byParticipant.map((row) => (
                <tr key={row.participantId} className="border-t border-line/60">
                  <td className="py-2.5">
                    <span className="flex items-center gap-2">
                      <Avatar name={row.name} color={row.color} size={22} />
                      <span className="truncate">{row.name}</span>
                    </span>
                  </td>
                  <td className="tnum py-2.5 text-right text-ink-soft">
                    {money(row.itemsCents, currency)}
                  </td>
                  <td className="tnum py-2.5 text-right text-ink-soft">
                    {money(row.extrasCents, currency)}
                  </td>
                  <td className="tnum py-2.5 text-right font-bold">
                    {money(row.owesCents, currency)}
                  </td>
                  <td
                    className={`tnum py-2.5 text-right font-semibold ${
                      row.balanceCents === 0
                        ? "text-ink-faint"
                        : row.balanceCents > 0
                          ? "text-mint"
                          : "text-clay"
                    }`}
                  >
                    {row.balanceCents > 0 ? "+" : ""}
                    {money(row.balanceCents, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink-faint">
          Saldo positivo = ha puesto de más y le deben. Negativo = tiene que pagar.
        </p>
      </section>

      {/* ------------------------------------------------------- liquidación */}
      <section className="rounded-2xl border border-amber/30 bg-amber/5 p-5">
        <h3 className="text-lg font-bold tracking-tight">Para quedar en paz</h3>
        {settlement.transfers.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">
            {settlement.paidCents === 0
              ? "Cuando marques quién pagó, aquí saldrá quién le debe cuánto."
              : "Nadie debe nada a nadie. Cuenta saldada."}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {settlement.transfers.map((transfer, i) => (
              <li
                key={`${transfer.fromId}-${transfer.toId}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-xl bg-paper px-4 py-3"
              >
                <span className="font-semibold">{transfer.fromName}</span>
                <span className="text-ink-faint">→</span>
                <span className="font-semibold">{transfer.toName}</span>
                <span className="tnum ml-auto text-lg font-bold text-amber">
                  {money(transfer.cents, currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Alerts({
  settlement,
  currency,
  hasPayer,
}: {
  settlement: Settlement;
  currency: string;
  hasPayer: boolean;
}) {
  const alerts: { tone: "good" | "warn" | "info"; text: string }[] = [];

  if (settlement.unassignedCents > 0) {
    alerts.push({
      tone: "warn",
      text: `Quedan ${money(settlement.unassignedCents, currency)} sin dueño. Alguien tiene que marcar lo que falta.`,
    });
  } else if (settlement.unassignedCents < 0) {
    alerts.push({
      tone: "warn",
      text: `Hay ${money(-settlement.unassignedCents, currency)} asignados de más. Revisa las cantidades.`,
    });
  } else if (settlement.byParticipant.length > 0) {
    alerts.push({ tone: "good", text: "Toda la comanda está repartida." });
  }

  if (settlement.overpaidCents > 0) {
    alerts.push({
      tone: "warn",
      text: `Se ha pagado ${money(settlement.overpaidCents, currency)} de más respecto al total.`,
    });
  } else if (settlement.overpaidCents < 0 && settlement.paidCents > 0) {
    alerts.push({
      tone: "warn",
      text: `Faltan ${money(-settlement.overpaidCents, currency)} por pagar al bar.`,
    });
  } else if (!hasPayer) {
    alerts.push({ tone: "info", text: "Marca abajo quién ha pagado la cuenta." });
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert, i) => (
        <li
          key={i}
          className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${
            alert.tone === "good"
              ? "border-mint/30 bg-mint/10 text-mint"
              : alert.tone === "warn"
                ? "border-clay/30 bg-clay/10 text-clay"
                : "border-line bg-paper-2 text-ink-soft"
          }`}
        >
          <span aria-hidden className="mt-px">
            {alert.tone === "good" ? "✓" : alert.tone === "warn" ? "!" : "·"}
          </span>
          <span>{alert.text}</span>
        </li>
      ))}
    </ul>
  );
}
