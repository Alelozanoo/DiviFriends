"use client";

import { money } from "@/lib/format";
import type { ParticipantBalance, Settlement, TicketState } from "@/lib/types";
import MoneyInput from "./MoneyInput";
import { Avatar } from "./ui";

interface Props {
  state: TicketState;
  settlement: Settlement;
  meId: string | null;
  onSetPayer: (participantId: string) => void;
  onSetSettled: (participantId: string, settled: boolean) => void;
  onSetTotal: (cents: number) => void;
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
}: Props) {
  const { currency } = state.ticket;
  const people = settlement.byParticipant;
  const payer = people.find((p) => p.isPayer) ?? null;
  const pending = people.filter((p) => !p.settled);

  return (
    <div className="space-y-4 pb-40">
      <Headline
        currency={currency}
        payer={payer}
        people={people}
        pendingCents={settlement.pendingCents}
        totalCents={settlement.grandTotalCents}
      />

      {settlement.unassignedCents !== 0 && (
        <p className="rounded-xl border border-clay/30 bg-clay/10 px-4 py-3 text-sm text-clay">
          {settlement.unassignedCents > 0
            ? `Ojo: quedan ${money(settlement.unassignedCents, currency)} sin dueño. Vuelve a la comanda y repártelos, o las cuentas de abajo se quedan cortas.`
            : `Ojo: hay ${money(-settlement.unassignedCents, currency)} repartidos de más. Revisa el total o las cantidades.`}
        </p>
      )}

      {/* --------------------------------------------------------- quién pagó */}
      <section className="rounded-2xl border border-line bg-paper-2 p-4">
        <h3 className="font-bold tracking-tight">¿Quién ha pagado la cuenta?</h3>
        {people.length === 0 ? (
          <p className="mt-2 text-sm text-ink-faint">Todavía no hay nadie en la mesa.</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {people.map((person) => (
              <button
                key={person.participantId}
                type="button"
                onClick={() => onSetPayer(person.participantId)}
                aria-pressed={person.isPayer}
                className={`flex items-center gap-2 rounded-xl border-2 py-1.5 pl-1.5 pr-3 text-sm font-semibold transition-colors ${
                  person.isPayer
                    ? "border-amber bg-amber/15 text-amber"
                    : "border-line text-ink-soft active:bg-paper-3"
                }`}
              >
                <Avatar name={person.name} color={person.color} size={24} />
                <span className="max-w-28 truncate">{person.name}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------ quién le debe */}
      {people.length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-line bg-paper-2">
          <ul>
            {people.map((person, index) => (
              <PersonRow
                key={person.participantId}
                person={person}
                currency={currency}
                isMe={person.participantId === meId}
                /* La raya separa lo pendiente de lo cobrado sin necesidad de
                   dos listas ni de un título encima de cada una. */
                divider={index > 0 && person.settled && !people[index - 1].settled}
                first={index === 0}
                onToggle={() => onSetSettled(person.participantId, !person.settled)}
              />
            ))}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------- total */}
      <div className="flex items-center justify-between gap-3 px-1">
        <span className="stamp text-ink-faint">Total del ticket</span>
        <MoneyInput
          cents={state.ticket.totalCents}
          onCommit={onSetTotal}
          ariaLabel="Total del ticket"
          className="w-28"
        />
      </div>

      {settlement.extrasCents !== 0 && (
        <p className="px-1 text-xs leading-relaxed text-ink-faint">
          {money(Math.abs(settlement.extrasCents), currency)}{" "}
          {settlement.extrasCents > 0 ? "de servicio o impuestos" : "de descuento"} entre la suma de
          los platos y el total. Se reparte entre todos en proporción a lo que ha tomado cada uno.
        </p>
      )}

      {/* Sólo a quien cobra: al resto no le sirve de nada y añade ruido. */}
      {pending.length > 0 && payer?.participantId === meId && (
        <p className="px-1 text-xs text-ink-faint">
          Cuando alguien te dé su parte, toca «Ha pagado» en su fila.
        </p>
      )}
    </div>
  );
}

/** El número grande: lo único que hay que leer al llegar a esta pantalla. */
function Headline({
  currency,
  payer,
  people,
  pendingCents,
  totalCents,
}: {
  currency: string;
  payer: ParticipantBalance | null;
  people: ParticipantBalance[];
  pendingCents: number;
  totalCents: number;
}) {
  const settledCount = people.filter((p) => p.settled).length;

  if (!payer) {
    return (
      <Card
        label="Total de la mesa"
        value={money(totalCents, currency)}
        hint="Marca abajo quién puso la tarjeta y aparecerá lo que le debe cada uno."
      />
    );
  }

  if (pendingCents === 0) {
    return (
      <Card
        tone="good"
        label="Cuentas"
        value="Todo pagado"
        hint={`${payer.name} ya ha cobrado los ${money(totalCents, currency)}.`}
      />
    );
  }

  return (
    <Card
      label={`Falta por devolverle a ${payer.name}`}
      value={money(pendingCents, currency)}
      hint={`${settledCount} de ${people.length} ya han pagado · ${money(totalCents, currency)} en total`}
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

/**
 * Una persona y su parte. El botón de la derecha es la única acción, y dice
 * siempre lo que va a pasar al tocarlo, no el estado en el que estás.
 */
function PersonRow({
  person,
  currency,
  isMe,
  divider,
  first,
  onToggle,
}: {
  person: ParticipantBalance;
  currency: string;
  isMe: boolean;
  divider: boolean;
  first: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={`flex items-center gap-3 px-4 py-3 ${first ? "" : "border-t border-line/60"} ${
        divider ? "border-t-2 border-t-line" : ""
      } ${person.settled ? "opacity-60" : ""}`}
    >
      <Avatar name={person.name} color={person.color} size={30} />

      <span className="min-w-0 flex-1 truncate font-medium">
        {person.name}
        {isMe && <span className="ml-1.5 text-xs text-amber">(tú)</span>}
      </span>

      <span className="tnum shrink-0 font-bold">{money(person.owesCents, currency)}</span>

      {person.isPayer ? (
        <span className="stamp shrink-0 text-ink-faint">Puso la cuenta</span>
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
          {person.settled ? "Pagado ✓" : isMe ? "He pagado" : "Ha pagado"}
        </button>
      )}
    </li>
  );
}
