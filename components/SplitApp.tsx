"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { computeSettlement } from "@/lib/settle";
import { useStoredParticipant } from "@/lib/useStoredParticipant";
import { useTicketSync } from "@/lib/useTicketSync";
import { money, parseMoney } from "@/lib/format";
import type { TicketState } from "@/lib/types";
import AccountsPanel from "./AccountsPanel";
import ItemBubble from "./ItemBubble";
import SplitSheet from "./SplitSheet";
import { Avatar, Progress } from "./ui";

export default function SplitApp({ initial }: { initial: TicketState }) {
  const code = initial.ticket.id;
  const [tab, setTab] = useState<"comanda" | "cuentas">("comanda");
  const [error, setError] = useState<string | null>(null);
  const [splitting, setSplitting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // null = decide la app (abierto si no te has unido); true/false = lo has decidido tú.
  const [joinOverride, setJoinOverride] = useState<boolean | null>(null);

  const { state, setServer, beginClaim, settleClaim } = useTicketSync(code, initial);
  const settlement = useMemo(() => computeSettlement(state), [state]);

  const { known, participantId: storedId, store } = useStoredParticipant(code);
  const meId = storedId && state.participants.some((p) => p.id === storedId) ? storedId : null;
  const showJoin = joinOverride ?? (known && !meId);

  /* -------------------------------------------------------------- acciones */

  async function send(path: string, init: RequestInit): Promise<TicketState | null> {
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${code}${path}`, {
        ...init,
        headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      });
      const data = (await response.json()) as TicketState & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se ha podido guardar el cambio.");
        return null;
      }
      setServer(data);
      return data;
    } catch {
      setError("Sin conexión. Los cambios no se están guardando.");
      return null;
    }
  }

  async function join(name: string) {
    const response = await fetch(`/api/tickets/${code}/participants`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      setError("No se ha podido entrar en la mesa.");
      return;
    }
    setServer((await response.json()) as TicketState);
    const participantId = response.headers.get("x-participant-id");
    if (participantId) {
      store(participantId);
      setJoinOverride(null);
    }
  }

  /** Un toque: te lo quedas o lo sueltas. Se pinta antes de salir la petición. */
  function claim(itemId: string, shares: number, splitInto?: number) {
    if (!meId) {
      setJoinOverride(true);
      return;
    }
    navigator.vibrate?.(8);
    const token = beginClaim(itemId, meId, shares, splitInto);
    void send("/claims", {
      method: "POST",
      body: JSON.stringify({ itemId, participantId: meId, shares, splitInto }),
    }).then((confirmed) => settleClaim(token, confirmed ?? undefined));
  }

  function toggle(itemId: string) {
    const breakdown = settlement.byItem[itemId];
    const mine = breakdown.shares.find((s) => s.participantId === meId);
    claim(itemId, mine ? 0 : 1);
  }

  const patchTicket = (body: Record<string, unknown>) =>
    send("", { method: "PATCH", body: JSON.stringify(body) });

  const patchParticipant = (participantId: string, body: Record<string, unknown>) =>
    send(`/participants/${participantId}`, { method: "PATCH", body: JSON.stringify(body) });

  /* ----------------------------------------------------------------- vista */

  const myBalance = settlement.byParticipant.find((b) => b.participantId === meId) ?? null;
  const progress =
    settlement.grandTotalCents > 0 ? settlement.assignedCents / settlement.grandTotalCents : 0;
  const splittingItem = state.items.find((i) => i.id === splitting) ?? null;
  const left = settlement.unassignedCents;

  return (
    <div className="flex min-h-full flex-col">
      {/* ------------------------------------------------------------ cabecera */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
          <Link href="/" aria-label="DiviFriends" className="shrink-0">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber text-paper">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 8h12M6 3.5 2.5 8 6 12.5M10 3.5 13.5 8 10 12.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">
              {state.ticket.place ?? "Comanda"}
            </p>
            <p className="stamp text-ink-faint">
              {state.ticket.tableLabel ? `${state.ticket.tableLabel} · ` : ""}
              {code}
            </p>
          </div>
          <div className="flex shrink-0 -space-x-1.5">
            {state.participants.slice(0, 5).map((person) => (
              <Avatar
                key={person.id}
                name={person.name}
                color={person.color}
                size={26}
                dimmed={person.id !== meId}
              />
            ))}
          </div>
        </div>
        <Progress value={progress} />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-3">
        {error && (
          <p role="alert" className="mb-3 rounded-xl border border-clay/40 bg-clay/10 px-3 py-2.5 text-sm text-clay">
            {error}
          </p>
        )}

        {tab === "comanda" ? (
          <div className="pb-36">
            <p className="stamp mb-2.5 px-1 text-ink-faint">
              {left > 0
                ? `Toca lo que has comido · faltan ${money(left, state.ticket.currency)}`
                : "Todo repartido"}
            </p>

            {/* dos columnas de burbujas */}
            <div className="grid grid-cols-2 gap-2.5">
              {state.items.map((item) => (
                <ItemBubble
                  key={item.id}
                  item={item}
                  breakdown={settlement.byItem[item.id]}
                  participants={state.participants}
                  meId={meId}
                  currency={state.ticket.currency}
                  onToggle={() => toggle(item.id)}
                  onSetShares={(shares) => claim(item.id, shares)}
                  onOpenSplit={() => setSplitting(item.id)}
                />
              ))}

              <button
                type="button"
                onClick={() => setAdding(true)}
                className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-sm font-semibold text-ink-faint transition-colors active:bg-paper-2"
              >
                <span className="text-xl leading-none">+</span>
                Falta algo
              </button>
            </div>
          </div>
        ) : (
          <AccountsPanel
            state={state}
            settlement={settlement}
            meId={meId}
            onSetPayer={(participantId) => {
              const person = state.participants.find((p) => p.id === participantId);
              void patchParticipant(participantId, {
                isPayer: !person?.isPayer,
                ...(person?.isPayer || person?.paidCents
                  ? {}
                  : { paidCents: settlement.grandTotalCents }),
              });
            }}
            onSetPaid={(participantId, cents) => void patchParticipant(participantId, { paidCents: cents })}
            onSetTip={(cents) => void patchTicket({ tipCents: cents })}
            onSetTotal={(cents) => void patchTicket({ totalCents: cents })}
            onRemoveParticipant={(participantId) =>
              void send(`/participants/${participantId}`, { method: "DELETE" })
            }
          />
        )}
      </main>

      {/* ---------------------------------------------------------- barra fija */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="stamp text-ink-faint">{meId ? "Lo tuyo" : "Sin repartir"}</p>
            <p className="tnum text-2xl font-bold leading-tight">
              {money(
                meId ? (myBalance?.owesCents ?? 0) : settlement.unassignedCents,
                state.ticket.currency,
              )}
            </p>
          </div>
          {meId ? (
            <button
              type="button"
              onClick={() => setTab(tab === "comanda" ? "cuentas" : "comanda")}
              className="shrink-0 rounded-xl bg-amber px-4 py-2.5 text-sm font-bold text-paper active:scale-95 transition-transform"
            >
              {tab === "comanda" ? "Cuentas" : "Comanda"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setJoinOverride(true)}
              className="shrink-0 rounded-xl bg-amber px-4 py-2.5 text-sm font-bold text-paper"
            >
              Unirme
            </button>
          )}
        </div>
      </div>

      {splittingItem && (
        <SplitSheet
          item={splittingItem}
          breakdown={settlement.byItem[splittingItem.id]}
          currency={state.ticket.currency}
          onClose={() => setSplitting(null)}
          onPick={(into) => {
            setSplitting(null);
            // Al elegir «entre N» te apuntas de una: es lo que quiere el 99 %.
            claim(splittingItem.id, 1, into);
          }}
        />
      )}

      {adding && (
        <AddItemSheet
          onClose={() => setAdding(false)}
          onAdd={async (name, qty, price) => {
            await send("/items", { method: "POST", body: JSON.stringify({ name, qty, price }) });
            setAdding(false);
          }}
        />
      )}

      {showJoin && (
        <JoinSheet
          existing={state.participants.map((p) => p.name)}
          onJoin={join}
          onClose={() => setJoinOverride(false)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="rise w-full max-w-md rounded-t-3xl border-t border-line bg-paper-2 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function JoinSheet({
  existing,
  onJoin,
  onClose,
}: {
  existing: string[];
  onJoin: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">¿Cómo te llamas?</h2>
      <p className="mt-1 text-sm text-ink-soft">Para que la mesa sepa qué platos son tuyos.</p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          await onJoin(name.trim());
          setBusy(false);
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Álex"
          maxLength={40}
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-3 focus:border-amber focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="shrink-0 rounded-xl bg-amber px-5 font-bold text-paper disabled:opacity-40"
        >
          Entrar
        </button>
      </form>

      {existing.length > 0 && (
        <div className="mt-4">
          <p className="stamp text-ink-faint">Ya en la mesa · toca si eres tú</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {existing.map((existingName) => (
              <button
                key={existingName}
                type="button"
                onClick={() => void onJoin(existingName)}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft active:bg-paper-3"
              >
                {existingName}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-xl py-2 text-sm text-ink-faint"
      >
        Sólo estoy mirando
      </button>
    </Sheet>
  );
}

function AddItemSheet({
  onAdd,
  onClose,
}: {
  onAdd: (name: string, qty: number, price: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">Falta algo en la comanda</h2>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || parseMoney(price) <= 0) return;
          await onAdd(name.trim(), Math.max(1, Number(qty) || 1), price);
        }}
      >
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Otra caña"
          className="w-full rounded-xl border border-line bg-paper px-4 py-3 focus:border-amber focus:outline-none"
        />
        <div className="flex gap-2">
          <input
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            inputMode="numeric"
            aria-label="Cantidad"
            className="tnum w-20 rounded-xl border border-line bg-paper px-3 py-3 text-center focus:border-amber focus:outline-none"
          />
          <input
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            inputMode="decimal"
            placeholder="2,50"
            aria-label="Precio por unidad"
            className="tnum min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-3 text-right focus:border-amber focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim() || parseMoney(price) <= 0}
          className="w-full rounded-xl bg-amber py-3 font-bold text-paper disabled:opacity-40"
        >
          Añadir
        </button>
      </form>
    </Sheet>
  );
}
