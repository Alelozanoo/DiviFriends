"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { computeSettlement } from "@/lib/settle";
import { useStoredParticipant } from "@/lib/useStoredParticipant";
import { useTicketSync } from "@/lib/useTicketSync";
import { money, parseMoney } from "@/lib/format";
import type { TicketState } from "@/lib/types";
import AccountsPanel from "./AccountsPanel";
import ItemCard from "./ItemCard";
import { Avatar, Progress } from "./ui";

export default function SplitApp({ initial }: { initial: TicketState }) {
  const code = initial.ticket.id;
  const [tab, setTab] = useState<"comanda" | "cuentas">("comanda");
  const [error, setError] = useState<string | null>(null);
  const [showSettled, setShowSettled] = useState(false);
  // null = decide la app (abierto si no te has unido); true/false = lo has decidido tú.
  const [joinOverride, setJoinOverride] = useState<boolean | null>(null);

  // Escucha Firestore en directo; lo que marcas se pinta al instante encima.
  const { state, setServer, beginClaim, settleClaim } = useTicketSync(code, initial);

  const settlement = useMemo(() => computeSettlement(state), [state]);

  /* ------------------------------------------------------------ identidad */

  const { known, participantId: storedId, store } = useStoredParticipant(code);
  // Si te han quitado de la mesa desde otro móvil, dejas de ser "tú" sin más.
  const meId = storedId && state.participants.some((p) => p.id === storedId) ? storedId : null;
  const showJoin = joinOverride ?? (known && !meId);

  /* -------------------------------------------------------------- acciones */

  /**
   * Toda escritura pasa por la API: el navegador no escribe en Firestore, así
   * la validación vive donde nadie puede saltársela. Devuelve el estado ya
   * recalculado, que se aplica sin esperar al `onSnapshot`.
   */
  async function send(path: string, init: RequestInit): Promise<TicketState | null> {
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${code}${path}`, {
        ...init,
        headers: { "content-type": "application/json", ...(init.headers ?? {}) },
      });
      const data = (await response.json()) as TicketState & { error?: string };
      if (!response.ok) {
        // La escucha en directo devolverá la pantalla a la verdad del servidor.
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

  function claim(itemId: string, units: number) {
    if (!meId) {
      setJoinOverride(true);
      return;
    }
    // Se pinta ya y se mantiene encima hasta que el servidor confirma, para que
    // una actualización de otro móvil no borre tu pulsación a media transición.
    const token = beginClaim(itemId, meId, units);
    void send("/claims", {
      method: "POST",
      body: JSON.stringify({ itemId, participantId: meId, units }),
    }).then((confirmed) => settleClaim(token, confirmed ?? undefined));
  }

  const patchItem = (itemId: string, body: Record<string, unknown>) =>
    send(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify(body) });

  const patchTicket = (body: Record<string, unknown>) =>
    send("", { method: "PATCH", body: JSON.stringify(body) });

  const patchParticipant = (participantId: string, body: Record<string, unknown>) =>
    send(`/participants/${participantId}`, { method: "PATCH", body: JSON.stringify(body) });

  /* ----------------------------------------------------------------- vista */

  const me = state.participants.find((p) => p.id === meId) ?? null;
  const myBalance = settlement.byParticipant.find((b) => b.participantId === meId) ?? null;

  const pending = state.items.filter((i) => !settlement.byItem[i.id].settled);
  const done = state.items.filter((i) => settlement.byItem[i.id].settled);
  const progress =
    settlement.grandTotalCents > 0 ? settlement.assignedCents / settlement.grandTotalCents : 0;

  return (
    <div className="flex min-h-full flex-col">
      <Header ticket={state.ticket} participants={state.participants} meId={meId} />

      <nav className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl gap-1 px-4 py-2">
          {(["comanda", "cuentas"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition-colors ${
                tab === key ? "bg-paper-3 text-ink" : "text-ink-faint hover:text-ink-soft"
              }`}
            >
              {key === "comanda" ? "Comanda" : "Cuentas"}
              {key === "comanda" && pending.length > 0 && (
                <span className="tnum ml-2 rounded-full bg-amber px-1.5 py-0.5 text-[0.65rem] text-paper">
                  {pending.length}
                </span>
              )}
            </button>
          ))}
        </div>
        <Progress value={progress} />
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        {error && (
          <p role="alert" className="mb-4 rounded-xl border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay">
            {error}
          </p>
        )}

        {tab === "comanda" ? (
          <div className="space-y-6 pb-40">
            {pending.length === 0 ? (
              <div className="rounded-2xl border border-mint/30 bg-mint/10 px-5 py-8 text-center">
                <p className="text-lg font-bold text-mint">Comanda repartida</p>
                <p className="mt-1 text-sm text-ink-soft">
                  Pásate a «Cuentas» para ver quién le debe cuánto a quién.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {pending.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    breakdown={settlement.byItem[item.id]}
                    participants={state.participants}
                    meId={meId}
                    currency={state.ticket.currency}
                    onClaim={(units) => claim(item.id, units)}
                    onToggleShared={() =>
                      void patchItem(item.id, {
                        splitMode: item.splitMode === "shared" ? "units" : "shared",
                      })
                    }
                    onDelete={() => void send(`/items/${item.id}`, { method: "DELETE" })}
                  />
                ))}
              </ul>
            )}

            {done.length > 0 && (
              <section>
                <button
                  type="button"
                  onClick={() => setShowSettled((v) => !v)}
                  className="stamp flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-ink-faint transition-colors hover:text-ink-soft"
                >
                  <span>Ya repartido · {done.length}</span>
                  <span aria-hidden>{showSettled ? "−" : "+"}</span>
                </button>
                {showSettled && (
                  <ul className="mt-3 space-y-3">
                    {done.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        breakdown={settlement.byItem[item.id]}
                        participants={state.participants}
                        meId={meId}
                        currency={state.ticket.currency}
                        onClaim={(units) => claim(item.id, units)}
                        onToggleShared={() =>
                          void patchItem(item.id, {
                            splitMode: item.splitMode === "shared" ? "units" : "shared",
                          })
                        }
                        onDelete={() => void send(`/items/${item.id}`, { method: "DELETE" })}
                      />
                    ))}
                  </ul>
                )}
              </section>
            )}

            <AddItem
              currency={state.ticket.currency}
              onAdd={(name, qty, price) =>
                send("/items", { method: "POST", body: JSON.stringify({ name, qty, price }) })
              }
            />
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
                // Quien paga la cuenta suele adelantar el total entero.
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

      {/* --------------------------------------------------------- barra fija */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="stamp text-ink-faint">{me ? "Lo tuyo" : "Sin asignar"}</p>
            <p className="tnum text-2xl font-bold leading-tight">
              {me
                ? money(myBalance?.owesCents ?? 0, state.ticket.currency)
                : money(settlement.unassignedCents, state.ticket.currency)}
            </p>
          </div>
          {me ? (
            <button
              type="button"
              onClick={() => setTab(tab === "comanda" ? "cuentas" : "comanda")}
              className="rounded-xl bg-amber px-5 py-3 font-semibold text-paper transition-colors hover:bg-ink"
            >
              {tab === "comanda" ? "Ver cuentas" : "Volver"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setJoinOverride(true)}
              className="rounded-xl bg-amber px-5 py-3 font-semibold text-paper transition-colors hover:bg-ink"
            >
              Unirme
            </button>
          )}
        </div>
      </div>

      {showJoin && (
        <JoinDialog
          existing={state.participants.map((p) => p.name)}
          onJoin={join}
          onClose={() => setJoinOverride(false)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Header({
  ticket,
  participants,
  meId,
}: {
  ticket: TicketState["ticket"];
  participants: TicketState["participants"];
  meId: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    const data = { title: "Repartir la cuenta", text: `Comanda ${ticket.id}`, url };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* el usuario canceló: caemos al portapapeles */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="border-b border-line bg-paper-2/40">
      <div className="mx-auto max-w-3xl px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link href="/" className="stamp text-ink-faint hover:text-amber">
              DiviFriends
            </Link>
            <h1 className="mt-1 truncate text-xl font-bold tracking-tight">
              {ticket.place ?? "Comanda"}
            </h1>
            <p className="stamp mt-1 text-ink-faint">
              {ticket.tableLabel ? `${ticket.tableLabel} · ` : ""}
              {ticket.id}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/t/${ticket.id}/qr`}
              className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-amber hover:text-amber"
            >
              QR
            </Link>
            <button
              type="button"
              onClick={share}
              className="rounded-xl border border-line px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:border-amber hover:text-amber"
            >
              {copied ? "¡Copiado!" : "Compartir"}
            </button>
          </div>
        </div>

        {participants.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {participants.map((person) => (
              <Avatar
                key={person.id}
                name={person.name}
                color={person.color}
                size={28}
                dimmed={person.id !== meId}
              />
            ))}
            <span className="stamp ml-1 text-ink-faint">
              {participants.length} en la mesa
            </span>
          </div>
        )}
      </div>
    </header>
  );
}

function JoinDialog({
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
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6">
      <div className="rise w-full max-w-md rounded-t-3xl border border-line bg-paper-2 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl sm:pb-6">
        <h2 className="text-2xl font-bold tracking-tight">¿Cómo te llamas?</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Sólo para que el resto de la mesa sepa qué platos son tuyos.
        </p>

        <form
          className="mt-5 flex gap-2"
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
            className="shrink-0 rounded-xl bg-amber px-5 font-semibold text-paper transition-colors hover:bg-ink disabled:opacity-40"
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
                  className="rounded-lg border border-line px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-amber hover:text-amber"
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
          className="mt-5 w-full rounded-xl py-2 text-sm text-ink-faint transition-colors hover:text-ink-soft"
        >
          Sólo estoy mirando
        </button>
      </div>
    </div>
  );
}

function AddItem({
  currency,
  onAdd,
}: {
  currency: string;
  onAdd: (name: string, qty: number, price: string) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-line py-4 text-sm font-semibold text-ink-faint transition-colors hover:border-amber hover:text-amber"
      >
        + Falta algo en la comanda
      </button>
    );
  }

  return (
    <form
      className="space-y-3 rounded-2xl border border-line bg-paper-2 p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!name.trim()) return;
        await onAdd(name.trim(), Math.max(1, Number(qty) || 1), price);
        setName("");
        setQty("1");
        setPrice("");
        setOpen(false);
      }}
    >
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Otra caña"
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-3 focus:border-amber focus:outline-none"
        />
        <input
          value={qty}
          onChange={(event) => setQty(event.target.value)}
          inputMode="numeric"
          aria-label="Cantidad"
          className="tnum w-16 rounded-xl border border-line bg-paper px-3 py-3 text-center focus:border-amber focus:outline-none"
        />
        <input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          inputMode="decimal"
          placeholder="2,50"
          aria-label={`Precio por unidad en ${currency}`}
          className="tnum w-24 rounded-xl border border-line bg-paper px-3 py-3 text-right focus:border-amber focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={!name.trim() || parseMoney(price) <= 0}
          className="flex-1 rounded-xl bg-amber py-3 font-semibold text-paper transition-colors hover:bg-ink disabled:opacity-40"
        >
          Añadir
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-line px-5 text-sm text-ink-soft"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
