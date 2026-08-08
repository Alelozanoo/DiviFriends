"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { computeSettlement, totalAfterRemoving } from "@/lib/settle";
import { useStoredParticipant } from "@/lib/useStoredParticipant";
import { useTicketSync } from "@/lib/useTicketSync";
import { money, parseMoney } from "@/lib/format";
import type { Participant, TicketState } from "@/lib/types";
import AccountsPanel from "./AccountsPanel";
import ItemBubble from "./ItemBubble";
import ItemSheet from "./ItemSheet";
import Logo from "./Logo";
import TicketSheet from "./TicketSheet";
import TableSheet from "./TableSheet";
import { Avatar, Progress, Sheet } from "./ui";

export default function SplitApp({
  initial,
  shareUrl,
  qrSvg,
}: {
  initial: TicketState;
  shareUrl: string;
  qrSvg: string;
}) {
  const code = initial.ticket.id;
  const [tab, setTab] = useState<"comanda" | "cuentas">("comanda");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [viewing, setViewing] = useState(false);
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

  /** Apunta a alguien a la mesa sin hacerse pasar por él: la ficha no es tuya. */
  async function addPerson(name: string) {
    await send("/participants", { method: "POST", body: JSON.stringify({ name }) });
  }

  /**
   * Un toque: se lo queda o lo suelta. Se pinta antes de salir la petición.
   * Sin `forId` es lo tuyo; con él marcas lo que ha tomado otro, que es como
   * funciona la mesa en la que sólo uno tiene la app abierta.
   */
  function claim(itemId: string, shares: number, splitInto?: number, forId?: string) {
    const target = forId ?? meId;
    if (!target) {
      setJoinOverride(true);
      return;
    }
    navigator.vibrate?.(8);
    const token = beginClaim(itemId, target, shares, splitInto);
    void send("/claims", {
      method: "POST",
      body: JSON.stringify({ itemId, participantId: target, shares, splitInto }),
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
  const editingItem = state.items.find((i) => i.id === editing) ?? null;
  const left = settlement.unassignedCents;

  return (
    <div className="flex min-h-full flex-col">
      {/* ------------------------------------------------------------ cabecera */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
          <Link href="/" aria-label="DiviFriends" className="shrink-0">
            <Logo size={64} className="h-8 w-8" />
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
          {/*
            Quién está en la mesa y, en el mismo gesto, cómo meter a los demás.
            Las caras solas no decían qué pasaba al tocarlas: quien entra por
            primera vez no adivina que ahí está el QR. La palabra lo dice y las
            caras siguen contando quién hay, que es lo que gustaba de esto.
          */}
          <button
            type="button"
            onClick={() => setSharing(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-paper-2 py-1 pl-1.5 pr-2.5 transition-transform active:scale-95"
          >
            <span className="flex items-center -space-x-1.5">
              {state.participants.slice(0, 3).map((person) => (
                <Avatar
                  key={person.id}
                  name={person.name}
                  color={person.color}
                  size={22}
                  dimmed={person.id !== meId}
                />
              ))}
              {state.participants.length > 3 && (
                <span className="tnum grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-line bg-paper text-[0.6rem] font-bold text-ink-faint">
                  +{state.participants.length - 3}
                </span>
              )}
            </span>
            <span className="text-xs font-bold text-amber">Compartir</span>
          </button>
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
            <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
              {/*
                Las dos cosas juntas no caben en 390 px. La instrucción sólo
                sirve la primera vez, así que en cuanto estás dentro deja sitio
                a lo único que cambia: cuánto queda por repartir.
              */}
              <p className="stamp min-w-0 truncate text-ink-faint">
                {left <= 0
                  ? "Todo repartido"
                  : meId
                    ? `Faltan ${money(left, state.ticket.currency)}`
                    : "Toca lo que has comido"}
              </p>
              {/* A mitad de reparto siempre sale «¿qué ponía el ticket?». */}
              <button
                type="button"
                onClick={() => setViewing(true)}
                className="stamp shrink-0 rounded-lg border border-line px-2 py-1 text-ink-faint transition-colors hover:border-amber hover:text-amber active:bg-paper-2"
              >
                Ver ticket
              </button>
            </div>

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
                  onOpenOptions={() => setEditing(item.id)}
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
              // Volver a tocar al pagador lo quita: si te equivocas de persona
              // no hace falta buscar otra manera de deshacerlo.
              void patchParticipant(participantId, { isPayer: !person?.isPayer });
            }}
            onSetSettled={(participantId, settled) =>
              void patchParticipant(participantId, { settled })
            }
            onSetTotal={(cents) => void patchTicket({ totalCents: cents })}
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

      {editingItem && (
        <ItemSheet
          item={editingItem}
          breakdown={settlement.byItem[editingItem.id]}
          participants={state.participants}
          currency={state.ticket.currency}
          ticketTotalCents={state.ticket.totalCents}
          totalAfterCents={totalAfterRemoving(
            state.ticket.totalCents,
            state.items,
            editingItem.id,
          )}
          onClose={() => setEditing(null)}
          // Aquí la hoja se queda abierta: se marca a varios de una sentada.
          onSetShares={(participantId, shares) =>
            claim(editingItem.id, shares, undefined, participantId)
          }
          onPick={(into) => {
            setEditing(null);
            // Al elegir «entre N» te apuntas de una: es lo que quiere el 99 %.
            claim(editingItem.id, 1, into);
          }}
          onRemove={() => {
            setEditing(null);
            void send(`/items/${editingItem.id}`, { method: "DELETE" });
          }}
        />
      )}

      {viewing && <TicketSheet state={state} onClose={() => setViewing(false)} />}

      {sharing && (
        <TableSheet
          code={code}
          url={shareUrl}
          qrSvg={qrSvg}
          participants={state.participants}
          meId={meId}
          onAdd={addPerson}
          onRemove={(participantId) =>
            void send(`/participants/${participantId}`, { method: "DELETE" })
          }
          onClose={() => setSharing(false)}
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
        <JoinSheet people={state.participants} onJoin={join} onClose={() => setJoinOverride(false)} />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Lo primero que ve quien entra por el QR o por el enlace.
 *
 * Arriba el nombre a mano, y debajo los que ya están apuntados: cuando alguien
 * de la mesa te ha metido antes de que llegaras, sólo tienes que tocarte a ti
 * mismo y heredas todo lo que ya te habían marcado.
 */
function JoinSheet({
  people,
  onJoin,
  onClose,
}: {
  people: Participant[];
  onJoin: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">¿Quién eres?</h2>
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

      {people.length > 0 && (
        <div className="mt-5">
          <p className="stamp text-ink-faint">O toca tu nombre si ya te han apuntado</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => void onJoin(person.name)}
                className="flex items-center gap-2 rounded-xl border-2 border-line py-2 pl-2 pr-3 transition-colors hover:border-amber active:bg-paper-3"
              >
                <Avatar name={person.name} color={person.color} size={22} />
                <span className="max-w-32 truncate text-sm font-semibold">{person.name}</span>
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
