"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import { computeSettlement, totalAfterRemoving } from "@/lib/settle";
import { useStoredParticipant } from "@/lib/useStoredParticipant";
import { useTicketSync } from "@/lib/useTicketSync";
import { money, parseMoney } from "@/lib/format";
import { EV, track, trackOnce } from "@/lib/track";
import { olvidar, recordar } from "@/lib/misDivis";
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
import TicketUploader from "./TicketUploader";
import { Avatar, Progress, Sheet } from "./ui";
import { useT } from "@/lib/i18n";

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
  const t = useT();
  const [tab, setTab] = useState<"comanda" | "cuentas">("comanda");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showingLog, setShowingLog] = useState(false);
  const [adding, setAdding] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [viewing, setViewing] = useState(false);
  const [guiding, setGuiding] = useState(false);
  const [uploadingAnother, setUploadingAnother] = useState(false);
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);

  // Abrir una mesa es el primer momento medible: por el enlace del grupo,
  // por el QR del bar o tecleando el código.
  useEffect(() => {
    trackOnce("mesa", EV.abreMesa);
  }, []);

  // null = decide la app (abierto si no te has unido); true/false = lo has decidido tú.
  const [joinOverride, setJoinOverride] = useState<boolean | null>(null);

  const { state, setServer, beginClaim, settleClaim } = useTicketSync(code, initial);
  const settlement = useMemo(() => computeSettlement(state), [state]);

  const { known, participantId: storedId, store } = useStoredParticipant(code);
  const meId = storedId && state.participants.some((p) => p.id === storedId) ? storedId : null;
  const showJoin = joinOverride ?? (known && !meId);

  // `color` va obligatorio, como en `Participant`: el toast siempre se rellena
  // desde uno de la mesa, así que nunca falta. Declararlo opcional no cubría
  // ningún caso real y en cambio rompía la compilación contra `Avatar`, que lo
  // pide siempre — y con ella el despliegue entero.
  const [newFriend, setNewFriend] = useState<
    { id: string; name: string; avatar?: string; color: string; key: number } | null
  >(null);
  const prevCount = useRef(initial.participants.length);

  useEffect(() => {
    if (state.participants.length > prevCount.current) {
      const added = state.participants.slice(prevCount.current);
      const latest = added[added.length - 1];
      if (latest && latest.id !== meId) {
        setNewFriend({ ...latest, key: Date.now() });
        const timer = setTimeout(() => setNewFriend(null), 3500);
        prevCount.current = state.participants.length;
        return () => clearTimeout(timer);
      }
    }
    prevCount.current = state.participants.length;
  }, [state.participants, meId]);

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
        setError(data.error ?? t.comanda.errorGuardar);
        return null;
      }
      setServer(data);
      return data;
    } catch {
      setError(t.comanda.sinConexion);
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
  async function addPerson(name: string, avatar?: string): Promise<string | null> {
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${code}/participants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, avatar }),
      });
      const data = (await response.json()) as TicketState & { error?: string };
      if (!response.ok) {
        setError(data.error ?? t.comanda.errorApuntar);
        return null;
      }
      setServer(data);
      return response.headers.get("x-participant-id");
    } catch {
      setError(t.comanda.sinConexion);
      return null;
    }
  }

  async function join(name: string, avatar?: string) {
    const participantId = await addPerson(name, avatar);
    if (!participantId) return;
    track(EV.seApunta, { con_avatar: Boolean(avatar) });
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
    trackOnce("plato", EV.marcaPlato);
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
  /**
   * Separa unas cuantas unidades de una línea a una línea propia y devuelve su
   * ficha, para que la hoja del ÷ siga con ella.
   *
   * Es lo que permite «una carne entre cinco y la otra entre dos»: el reparto
   * vive en la línea, así que dos repartos piden dos líneas.
   */
  async function splitUnits(itemId: string, qty: number): Promise<boolean> {
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${code}/items/${itemId}/split`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ qty }),
      });
      const data = (await response.json()) as TicketState & { error?: string };
      if (!response.ok) {
        setError(data.error ?? t.comanda.errorSeparar);
        return false;
      }
      setServer(data);
      const nuevo = response.headers.get("x-item-id");
      // La hoja se queda con la línea nueva: se acaba de separar justo para
      // repartirla, y buscarla a mano en la comanda sería absurdo.
      if (nuevo) setEditing(nuevo);
      return true;
    } catch {
      setError(t.comanda.sinConexion);
      return false;
    }
  }

  const setSplitInto = (itemId: string, into: number) =>
    send(`/items/${itemId}`, { method: "PATCH", body: JSON.stringify({ splitInto: into }) });

  /* ----------------------------------------------------------------- vista */

  const myBalance = settlement.byParticipant.find((b) => b.participantId === meId) ?? null;

  /*
    Deja apuntada esta comanda en el móvil, con el saldo ya calculado.

    Se guarda desde aquí y no desde la portada porque éste es el único momento
    en que el dato es fresco y no cuesta nada: el reparto ya está hecho en
    memoria. La portada se limita a leerlo, y así sigue cargando sin pedirle
    nada al servidor.

    Y sólo si la comanda es tuya de verdad: haber marcado algo, o haber puesto
    el dinero. Unirse y mirar no cuenta, o la lista se llenaría de mesas en las
    que sólo asomaste la cabeza. Quien pagó entra aunque no haya marcado nada
    suyo todavía: es el que más falta le hace volver, para ver quién le debe.
  */
  const esMia = Boolean(myBalance && (myBalance.itemsCents > 0 || myBalance.paidCents > 0));
  const aQuien = meId
    ? (settlement.transactions ?? []).find((t) => t.fromId === meId)?.toId
    : undefined;
  const huella = [
    code,
    meId ?? "",
    myBalance?.owesCents ?? 0,
    myBalance?.settled ?? false,
    state.ticket.place ?? "",
    state.participants.map((p) => p.id).join(","),
    aQuien ?? "",
    esMia,
  ].join("|");

  useEffect(() => {
    if (!meId || !myBalance) return;
    // Si sueltas lo que habías marcado, se cae de la lista igual que entró:
    // la regla vale en los dos sentidos o acabaría habiendo mesas fantasma.
    if (!esMia) {
      olvidar(code);
      return;
    }
    recordar({
      code,
      place: state.ticket.place,
      at: new Date().toISOString(),
      currency: state.ticket.currency,
      cents: myBalance.owesCents,
      aQuien: settlement.byParticipant.find((p) => p.participantId === aQuien)?.name ?? null,
      saldado: myBalance.settled,
      gente: state.participants.map((p) => ({
        name: p.name,
        color: p.color,
        avatar: p.avatar,
      })),
    });
    // Se apunta cuando cambia algo que la lista enseña, no en cada repintado:
    // `huella` resume justo eso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [huella]);

  const progress =
    settlement.grandTotalCents > 0 ? settlement.assignedCents / settlement.grandTotalCents : 0;
  const editingItem = state.items.find((i) => i.id === editing) ?? null;
  const removingItem = state.items.find((i) => i.id === removing) ?? null;
  const left = settlement.unassignedCents;

  const receipts = state.receipts || [];
  const hasLegacyItems = state.items.some(i => !i.receiptId) || (state.ticket.totalCents - receipts.reduce((a, r) => a + r.totalCents, 0)) > 0;

  // Si no hay `activeReceiptId` seleccionado, por defecto seleccionamos el primero disponible
  let currentReceiptId = activeReceiptId;
  if (currentReceiptId === null) {
    if (hasLegacyItems) {
      currentReceiptId = null;
    } else if (receipts.length > 0) {
      currentReceiptId = receipts[0].id;
    }
  }

  const currentItems = state.items.filter(i =>
    (currentReceiptId === null && !i.receiptId) ||
    i.receiptId === currentReceiptId
  );

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
              {state.ticket.place ?? t.comanda.volverComanda}
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
                  avatar={person.avatar}
                  color={person.color}
                  size={22}
                />
              ))}
              {state.participants.length > 3 && (
                <span className="tnum grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-line bg-paper text-[0.6rem] font-bold text-ink-faint">
                  +{state.participants.length - 3}
                </span>
              )}
            </span>
            <span className="text-xs font-bold text-amber">{t.comanda.compartir}</span>
          </button>

          {/* La ayuda vive al lado de compartir porque es el mismo momento: te
              acaban de pasar un enlace, entras y no sabes qué se espera de ti. */}
          <button
            type="button"
            onClick={() => setGuiding(true)}
            aria-label={t.comanda.comoFunciona}
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

        {/* Pestañas de recibos */}
        {tab === "comanda" && (
          <div className="flex gap-2 overflow-x-auto px-3 py-2 hide-scrollbar border-t border-line/50">
            {hasLegacyItems && (
              <button
                type="button"
                onClick={() => setActiveReceiptId(null)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors ${currentReceiptId === null
                    ? "bg-amber text-paper"
                    : "bg-paper-2 border border-line text-ink-soft hover:border-amber hover:text-amber"
                  }`}
              >
                {state.ticket.place || t.comanda.ticketOriginal}
              </button>
            )}
            {receipts.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveReceiptId(r.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors ${currentReceiptId === r.id
                    ? "bg-amber text-paper"
                    : "bg-paper-2 border border-line text-ink-soft hover:border-amber hover:text-amber"
                  }`}
              >
                {r.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUploadingAnother(true)}
              className="shrink-0 rounded-full border border-dashed border-line bg-paper px-3 py-1 text-xs font-bold text-ink-faint transition-colors hover:border-amber hover:text-amber active:bg-paper-2"
            >
              {t.comanda.anadir}
            </button>
          </div>
        )}
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
                  ? t.comanda.todoRepartido
                  : meId
                    ? `${t.comanda.faltan} ${money(left, state.ticket.currency)}`
                    : t.comanda.tocaLoQueHasComido}
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
                    {t.comanda.cambios} {state.events.length}
                  </button>
                )}
                {/* A mitad de reparto siempre sale «¿qué ponía el ticket?». */}
                <button
                  type="button"
                  onClick={() => setViewing(true)}
                  className="stamp rounded-lg border border-line px-2 py-1 text-ink-faint transition-colors hover:border-amber hover:text-amber active:bg-paper-2"
                >
                  {t.comanda.verTicket}
                </button>
              </span>
            </div>

            {/* dos columnas de burbujas */}
            <div className="grid grid-cols-2 gap-2.5">
              {currentItems.map((item) => (
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
                {t.comanda.faltaAlgo}
              </button>
            </div>
          </div>
        ) : (
          <AccountsPanel
            state={state}
            settlement={settlement}
            meId={meId}
            onSetPayer={async (participantId, receiptId) => {
              // Si se vuelve a tocar la persona que ya ha pagado ese receipt, se quita (null)
              let finalParticipantId: string | null = participantId;
              if (receiptId) {
                const r = state.receipts.find((r) => r.id === receiptId);
                if (r?.payerId === participantId) finalParticipantId = null;
              } else {
                if (state.ticket.payerId === participantId || (!state.ticket.payerId && state.participants.find((p) => p.id === participantId)?.isPayer)) {
                  finalParticipantId = null;
                }
              }
              await send("/payers", {
                method: "PATCH",
                body: JSON.stringify({ participantId: finalParticipantId, receiptId }),
              });
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
            <p className="stamp text-ink-faint">{meId ? t.comanda.loTuyo : t.comanda.sinRepartir}</p>
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
              onClick={() => {
                if (tab === "comanda") trackOnce("cuentas", EV.veCuentas);
                setTab(tab === "comanda" ? "cuentas" : "comanda");
              }}
              className="shrink-0 rounded-xl bg-amber px-4 py-2.5 text-sm font-bold text-paper active:scale-95 transition-transform"
            >
              {tab === "comanda" ? t.comanda.cuentas : t.comanda.volverComanda}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setJoinOverride(true)}
              className="shrink-0 rounded-xl bg-amber px-4 py-2.5 text-sm font-bold text-paper"
            >
              {t.comanda.unirme}
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
          onSplitUnits={(qty) => splitUnits(editingItem.id, qty)}
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
          onConfirm={(newQty) => {
            setRemoving(null);
            if (newQty === 0) {
              // Con firma: quien quita una línea deja su nombre en el historial.
              void send(`/items/${removingItem.id}?by=${meId ?? ""}`, { method: "DELETE" });
            } else {
              void send(`/items/${removingItem.id}?by=${meId ?? ""}`, {
                method: "PATCH",
                body: JSON.stringify({ qty: newQty })
              });
            }
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
          onUpdateAvatar={(participantId, avatar) =>
            void patchParticipant(participantId, { avatar })
          }
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
              body: JSON.stringify({ name, qty, price, by: meId, receiptId: currentReceiptId }),
            });
            setAdding(false);
          }}
        />
      )}

      {uploadingAnother && (
        <Sheet onClose={() => setUploadingAnother(false)}>
          <h2 className="mb-4 text-xl font-bold tracking-tight">{t.subir.otroTicket}</h2>
          <TicketUploader
            targetCode={code}
            onSuccess={() => {
              setUploadingAnother(false);
              // Podríamos forzar un fetch de estado, pero la subscripción de Firebase 
              // lo actualizará automáticamente, así que la UI se renderizará sola.
            }}
          />
        </Sheet>
      )}

      {showJoin && (
        <JoinSheet people={state.participants} onJoin={join} onClose={() => setJoinOverride(false)} />
      )}

      {/* Toast Animado: Alguien se ha unido */}
      {newFriend && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center">
          <div 
            key={newFriend.key}
            className="pointer-events-auto flex w-max items-center gap-3 rounded-full border border-amber/40 bg-paper-2/95 px-5 py-2.5 shadow-[0_12px_36px_rgba(232,176,75,0.15)] backdrop-blur-md"
            style={{
              animation: "toast-slide-down 3.5s cubic-bezier(0.16, 1, 0.3, 1) forwards"
            }}
          >
            <Avatar name={newFriend.name} avatar={newFriend.avatar} color={newFriend.color} size={36} />
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight text-ink">{newFriend.name} {t.comanda.seHaUnido}</span>
              <span className="text-xs font-semibold text-amber">{t.comanda.aLaCuenta} {state.ticket.place || t.comanda.ticketOriginal}</span>
            </div>
            <div className="ml-2 h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_12px_var(--color-mint)]" />
            <style>{`
              @keyframes toast-slide-down {
                0% { transform: translateY(-150px); opacity: 0; }
                10% { transform: translateY(0); opacity: 1; }
                90% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(-150px); opacity: 0; }
              }
            `}</style>
          </div>
        </div>
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
  onJoin: (name: string, avatar?: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [busy, setBusy] = useState(false);
  const emojis = ["🐶", "🐱", "🦊", "🐼", "🐯", "🦁", "🐰", "🐸"];

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">{t.entrar.titulo}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t.entrar.entradilla}</p>

      {people.length > 0 && (
        <>
          <p className="stamp mt-4 text-ink-faint">{t.entrar.tocaTuNombre}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {people.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => void onJoin(person.name)}
                className="flex items-center gap-2 rounded-xl border-2 border-line py-2.5 pl-2.5 pr-3.5 transition-colors hover:border-amber active:bg-paper-3"
              >
                <Avatar name={person.name} avatar={person.avatar} color={person.color} size={24} />
                <span className="max-w-32 truncate text-sm font-semibold">{person.name}</span>
              </button>
            ))}
          </div>

          <div className="rule my-4" />
          <p className="stamp text-ink-faint">{t.entrar.noEstas}</p>
        </>
      )}

      <p className="stamp mt-4 text-ink-faint">Elige tu foto de perfil</p>
      <form
        className={`flex flex-col gap-4 ${people.length > 0 ? "mt-2" : "mt-4"}`}
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          await onJoin(name.trim(), avatar || undefined);
          setBusy(false);
        }}
      >
        <div className="flex gap-2">
          <input
            autoFocus={people.length === 0}
            value={name}
            onChange={(event) => setName(event.target.value)}
            // Un nombre de ejemplo cantaba raro desde que la lista de arriba
            // lleva nombres de verdad: parecía que te sugería llamarte Álex.
            placeholder={t.entrar.tuNombre}
            maxLength={40}
            className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-3 focus:border-amber focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="shrink-0 rounded-xl bg-amber px-5 font-bold text-paper disabled:opacity-40"
          >
            {t.entrar.entrar}
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setAvatar(avatar === emoji ? "" : emoji)}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 text-xl transition-all ${avatar === emoji ? "border-amber bg-amber/10 scale-110" : "border-transparent bg-paper-3 hover:bg-paper-4"
                }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </form>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-xl py-2 text-sm text-ink-faint"
      >
        {t.entrar.soloMirando}
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
  const t = useT();
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">{t.comanda.faltaAlgo}</h2>
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
          {t.comanda.anadir}
        </button>
      </form>
    </Sheet>
  );
}
