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
import RemoveItemSheet from "./RemoveItemSheet";
import HistorySheet from "./HistorySheet";
import Logo from "./Logo";
import TicketSheet from "./TicketSheet";
import TableSheet from "./TableSheet";
import GuideSheet from "./GuideSheet";
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
  const [removing, setRemoving] = useState<string | null>(null);
  const [showingLog, setShowingLog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [guiding, setGuiding] = useState(false);
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

  /**
   * Apunta a alguien a la mesa y devuelve su ficha.
   *
   * Devolverla importa: quien apunta a Sofía desde el reparto de un plato
   * quiere darle su parte en el mismo gesto, y para eso hace falta el id que
   * acaba de nacer. No es hacerse pasar por ella —la ficha no es tuya—, sólo
   * guardarle el sitio hasta que entre por el enlace y toque su nombre.
   */
  async function addPerson(name: string): Promise<string | null> {
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${code}/participants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await response.json()) as TicketState & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "No se ha podido apuntar a nadie más.");
        return null;
      }
      setServer(data);
      return response.headers.get("x-participant-id");
    } catch {
      setError("Sin conexión. Los cambios no se están guardando.");
      return null;
    }
  }

  async function join(name: string) {
    const participantId = await addPerson(name);
    if (!participantId) return;
    store(participantId);
    setJoinOverride(null);
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

  // `meId` viaja con todo lo que mueve dinero: es lo que firma el historial.
  const patchTicket = (body: Record<string, unknown>) =>
    send("", { method: "PATCH", body: JSON.stringify({ ...body, by: meId }) });

  const patchParticipant = (participantId: string, body: Record<string, unknown>) =>
    send(`/participants/${participantId}`, { method: "PATCH", body: JSON.stringify(body) });

  /**
   * Cambia el reparto de una línea sin tocar quién la lleva.
   *
   * Hace falta para quien todavía no se ha unido: puede decir que la paella va
   * entre cuatro y repartirla entre los de la mesa aunque él no coja parte.
   * Por el camino de los claims eso no se podía, porque siempre arrastraba una
   * parte para quien pulsaba.
   */
  const setSplitInto = (itemId: string, into: number) =>
    send(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ splitInto: into }) });

  /* ----------------------------------------------------------------- vista */

  const myBalance = settlement.byParticipant.find((b) => b.participantId === meId) ?? null;
  const progress =
    settlement.grandTotalCents > 0 ? settlement.assignedCents / settlement.grandTotalCents : 0;
  const editingItem = state.items.find((i) => i.id === editing) ?? null;
  const removingItem = state.items.find((i) => i.id === removing) ?? null;
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

          {/* La ayuda vive al lado de compartir porque es el mismo momento: te
              acaban de pasar un enlace, entras y no sabes qué se espera de ti. */}
          <button
            type="button"
            onClick={() => setGuiding(true)}
            aria-label="Cómo funciona"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-faint transition-colors hover:border-amber hover:text-amber active:bg-paper-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M12 11v5.5" />
              <circle cx="12" cy="7.6" r="0.6" fill="currentColor" />
            </svg>
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
              <span className="flex shrink-0 items-center gap-1.5">
                {/*
                  Sólo cuando hay algo que contar. Si nadie ha tocado nada, un
                  «Historial (0)» permanente sería ruido; en cuanto alguien
                  quita una línea, aparece aquí y en color, que es justo el
                  momento en que la mesa quiere saber quién ha sido.
                */}
                {state.events.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowingLog(true)}
                    className="stamp rounded-lg border border-clay/40 bg-clay/10 px-2 py-1 text-clay transition-colors active:bg-clay/20"
                  >
                    Cambios {state.events.length}
                  </button>
                )}
                {/* A mitad de reparto siempre sale «¿qué ponía el ticket?». */}
                <button
                  type="button"
                  onClick={() => setViewing(true)}
                  className="stamp rounded-lg border border-line px-2 py-1 text-ink-faint transition-colors hover:border-amber hover:text-amber active:bg-paper-2"
                >
                  Ver ticket
                </button>
              </span>
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
                  onRemove={() => setRemoving(item.id)}
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
            onOpenLog={() => setShowingLog(true)}
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
          meId={meId}
          onClose={() => setEditing(null)}
          // Aquí la hoja se queda abierta: se marca a varios de una sentada.
          onSetShares={(participantId, shares, into) =>
            claim(editingItem.id, shares, into, participantId)
          }
          onAddPerson={addPerson}
          onPick={(into) => {
            // Ya no cierra la hoja: elegir el número es sólo la primera mitad,
            // y cerrar aquí era lo que dejaba a la gente sin llegar nunca al
            // «¿con quién?». Al elegir «entre N» te apuntas de una, que es lo
            // que quiere el 99 %; si aún no te has unido sólo se parte la línea.
            if (meId) claim(editingItem.id, 1, into);
            else void setSplitInto(editingItem.id, into);
          }}
          onUndoSplit={() =>
            void setSplitInto(editingItem.id, Math.max(1, Math.round(editingItem.qty || 1)))
          }
        />
      )}

      {removingItem && (
        <RemoveItemSheet
          item={removingItem}
          breakdown={settlement.byItem[removingItem.id]}
          currency={state.ticket.currency}
          ticketTotalCents={state.ticket.totalCents}
          totalAfterCents={totalAfterRemoving(
            state.ticket.totalCents,
            state.items,
            removingItem.id,
          )}
          onClose={() => setRemoving(null)}
          onConfirm={() => {
            setRemoving(null);
            // Con firma: quien quita una línea deja su nombre en el historial.
            void send(`/items/${removingItem.id}?by=${meId ?? ""}`, { method: "DELETE" });
          }}
        />
      )}

      {showingLog && (
        <HistorySheet
          events={state.events}
          participants={state.participants}
          currency={state.ticket.currency}
          meId={meId}
          onClose={() => setShowingLog(false)}
        />
      )}

      {viewing && (
        <TicketSheet state={state} shareUrl={shareUrl} qrSvg={qrSvg} onClose={() => setViewing(false)} />
      )}

      {guiding && <GuideSheet onClose={() => setGuiding(false)} />}

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
            await send("/items", {
              method: "POST",
              body: JSON.stringify({ name, qty, price, by: meId }),
            });
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
 * Primero los nombres que ya están apuntados, y sólo debajo el hueco para
 * escribir. Va en ese orden porque desde que se puede apuntar a alguien al
 * repartir un plato, lo normal es que tu nombre ya esté ahí: tocarlo es un
 * gesto y hereda todo lo que te habían marcado mientras no mirabas. El teclado
 * sólo salta solo cuando la lista está vacía y escribir es la única salida.
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

      {people.length > 0 && (
        <>
          <p className="stamp mt-4 text-ink-faint">Toca tu nombre si ya estás en la lista</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => void onJoin(person.name)}
                className="flex items-center gap-2 rounded-xl border-2 border-line py-2.5 pl-2.5 pr-3.5 transition-colors hover:border-amber active:bg-paper-3"
              >
                <Avatar name={person.name} color={person.color} size={24} />
                <span className="max-w-32 truncate text-sm font-semibold">{person.name}</span>
              </button>
            ))}
          </div>

          <div className="rule my-4" />
          <p className="stamp text-ink-faint">¿No estás? Escríbelo</p>
        </>
      )}

      <form
        className={`flex gap-2 ${people.length > 0 ? "mt-2" : "mt-4"}`}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          await onJoin(name.trim());
          setBusy(false);
        }}
      >
        <input
          autoFocus={people.length === 0}
          value={name}
          onChange={(event) => setName(event.target.value)}
          // Un nombre de ejemplo cantaba raro desde que la lista de arriba
          // lleva nombres de verdad: parecía que te sugería llamarte Álex.
          placeholder="Tu nombre"
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
