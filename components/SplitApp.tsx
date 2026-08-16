"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useRef } from "react";
import confetti from "canvas-confetti";
import { computeSettlement, totalAfterRemoving } from "@/lib/settle";
import { useStoredParticipant } from "@/lib/useStoredParticipant";
import { useTicketSync } from "@/lib/useTicketSync";
import { useGlobalProfile } from "@/lib/useGlobalProfile";
import { processImageToAvatarBase64 } from "@/lib/avatarUpload";
import { money, parseMoney } from "@/lib/format";
import { EV, track, trackOnce } from "@/lib/track";
import { olvidar, recordar } from "@/lib/misDivis";
import type { Participant, TicketState, Via } from "@/lib/types";
import AccountsPanel from "./AccountsPanel";
import { CobroSheet, PagadorSheet } from "./CobroSheet";
import PagarSheet from "./PagarSheet";
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
import { HeaderMenuSheet } from "./HeaderMenuSheet";
import { CambiarPagadorSheet } from "./CambiarPagadorSheet";
import { EditNameSheet } from "./EditNameSheet";
import { PagadorTicketSheet } from "./PagadorTicketSheet";
import { useT, useLang, rellena } from "@/lib/i18n";
import { inicio } from "@/lib/i18n/config";

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
  const lang = useLang();
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
  // A quién le voy a pagar y cuánto, mientras la hoja está abierta.
  const [pagandoA, setPagandoA] = useState<{ id: string; cents: number } | null>(null);
  const [cobrando, setCobrando] = useState(false);
  const [preguntandoPagador, setPreguntandoPagador] = useState(false);
  // Qué ticket está esperando que alguien diga quién lo pagó. `receiptId` a
  // null es el ticket original, que no vive en `receipts` sino en el propio doc.
  const [preguntandoTicket, setPreguntandoTicket] = useState<{ receiptId: string | null } | null>(null);

  // Abrir una mesa es el primer momento medible: por el enlace del grupo,
  // por el QR del bar o tecleando el código.
  useEffect(() => {
    trackOnce("mesa", EV.abreMesa);
  }, []);

  // null = decide la app (abierto si no te has unido); true/false = lo has decidido tú.
  const [joinOverride, setJoinOverride] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cambiarPagadorOpen, setCambiarPagadorOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [showStatusPopup, setShowStatusPopup] = useState(false);

  const { state, setServer, beginClaim, settleClaim } = useTicketSync(code, initial);
  const settlement = useMemo(() => computeSettlement(state), [state]);

  const { known, participantId: storedId, store } = useStoredParticipant(code);
  const { profile: globalProfile, saveProfile } = useGlobalProfile();
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

  async function addPerson(name: string, avatar?: string, bizum?: string, revolut?: string): Promise<string | null> {
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${code}/participants`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, avatar, bizum, revolut }),
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

  async function join(name: string, avatar?: string, bizum?: string, revolut?: string) {
    const participantId = await addPerson(name, avatar, bizum, revolut);
    if (!participantId) return;
    track(EV.seApunta, { con_avatar: Boolean(avatar) });
    store(participantId);
    setJoinOverride(null);
    if (!hayPagador) setPreguntandoPagador(true);
  }

  /* -------------------------------------------------------------- cobrar */

  const declararPago = (toId: string, cents: number, via: Via) =>
    send("/pagos", {
      method: "POST",
      body: JSON.stringify({ fromId: meId, toId, cents, via }),
    });

  const resolverPago = (fromId: string, ok: boolean) =>
    send("/pagos", { method: "PATCH", body: JSON.stringify({ fromId, toId: meId, ok }) });

  const guardarCobro = (datos: { revolut: string | null; bizum: string | null }) =>
    meId ? patchParticipant(meId, datos) : Promise.resolve(null);

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

  const patchTicket = (body: Record<string, unknown>) =>
    send("", { method: "PATCH", body: JSON.stringify({ ...body, by: meId }) });

  const patchParticipant = (participantId: string, body: Record<string, unknown>) =>
    send(`/participants/${participantId}`, { method: "PATCH", body: JSON.stringify(body) });

  const removeParticipant = (participantId: string) =>
    send(`/participants/${participantId}`, { method: "DELETE" });

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

  const hayPagador = Boolean(
    state.ticket.payerId ||
      state.participants.some((p) => p.isPayer) ||
      (state.receipts ?? []).some((r) => r.payerId),
  );
  const yo = meId ? state.participants.find((p) => p.id === meId) ?? null : null;

  /*
    ¿Puse yo el dinero?

    Hay que mirarlo por las tres vías, igual que `hayPagador`. Preguntarlo sólo
    por `isPayer` no valía: en cuanto se marca a alguien con `payerId` —que es
    el camino de ahora— el servidor pone ese `isPayer` a false en todos, así
    que la respuesta era siempre «no». Por eso al que pagaba no le salían en el
    menú ni «configurar cómo cobrar» ni «cerrar la mesa».
  */
  /** Quién puso el dinero de un ticket concreto, sea el original o un recibo. */
  const pagadorDelTicket = (receiptId: string | null): string | null =>
    receiptId
      ? ((state.receipts ?? []).find((r) => r.id === receiptId)?.payerId ?? null)
      : (state.ticket.payerId ?? state.participants.find((p) => p.isPayer)?.id ?? null);

  const soyElPagador = Boolean(
    meId &&
      (state.ticket.payerId === meId ||
        yo?.isPayer ||
        (state.receipts ?? []).some((r) => r.payerId === meId)),
  );


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

  /*
    Los tickets a los que todavía nadie les ha puesto pagador.

    Se puede saltar la pregunta, pero no en silencio: mientras quede alguno,
    su pestaña va marcada y la pantalla de cuentas avisa. Sin eso los números
    salen mal y encima con toda la pinta de estar bien.
  */
  const ticketsSinPagador = [
    ...(hasLegacyItems ? [{ id: null as string | null, label: state.ticket.place }] : []),
    ...receipts.map((r) => ({ id: r.id as string | null, label: r.label })),
  ].filter((tk) => !pagadorDelTicket(tk.id));

  let currentReceiptId = activeReceiptId;
  if (currentReceiptId === null) {
    if (hasLegacyItems) {
      currentReceiptId = null;
    } else if (receipts.length > 0) {
      currentReceiptId = receipts[0].id;
    }
  }

  const currentItems = state.items
    .filter(i =>
      (currentReceiptId === null && !i.receiptId) ||
      i.receiptId === currentReceiptId
    )
    .sort((a, b) => {
      const aFull = settlement.byItem[a.id]?.freeShares === 0;
      const bFull = settlement.byItem[b.id]?.freeShares === 0;
      if (aFull && !bFull) return 1;
      if (!aFull && bFull) return -1;
      return 0;
    });

  return (
    <div className="flex min-h-full flex-col">
      {/* ------------------------------------------------------------ cabecera */}
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-3 py-2.5">
          <Link href={inicio(lang)} aria-label="DiviFriends" className="shrink-0">
            <Logo size={64} className="h-8 w-8" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold leading-tight">
              Divi<span className="text-amber">Friends</span>
            </p>
            <p className="stamp text-ink-faint tracking-wider">
              {code}
            </p>
          </div>
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



          <button
            type="button"
            onClick={() => setShowingLog(true)}
            aria-label={t.comanda.historialTitulo}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-faint transition-colors hover:border-amber hover:text-amber active:bg-paper-2 ml-0.5 relative"
          >
            {state.events.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber px-1 text-[9px] font-bold text-paper">
                {state.events.length}
              </span>
            )}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t.comanda.opciones}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink-faint transition-colors hover:border-amber hover:text-amber active:bg-paper-2 ml-0.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="12" cy="5" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" />
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
                    ? "bg-amber"
                    : "bg-paper-2 border border-line text-ink-soft hover:border-amber hover:text-amber"
                  }`}
                style={currentReceiptId === null ? { color: "var(--paper)" } : undefined}
              >
                {state.ticket.place || t.comanda.ticketOriginal}
                {!pagadorDelTicket(null) && <Sinpagador />}
              </button>
            )}
            {receipts.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveReceiptId(r.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors ${currentReceiptId === r.id
                    ? "bg-amber"
                    : "bg-paper-2 border border-line text-ink-soft hover:border-amber hover:text-amber"
                  }`}
                style={currentReceiptId === r.id ? { color: "var(--paper)" } : undefined}
              >
                {r.label}
                {!pagadorDelTicket(r.id) && <Sinpagador />}
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
              <p className="stamp min-w-0 truncate text-ink-faint">
                {left <= 0
                  ? t.comanda.todoRepartido
                  : meId
                    ? `${t.comanda.faltan} ${money(left, state.ticket.currency)}`
                    : t.comanda.tocaLoQueHasComido}
              </p>
              <span className="flex shrink-0 items-center gap-1.5">
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
                body: JSON.stringify({ participantId: finalParticipantId, receiptId, by: meId }),
              });
            }}
            onSetSettled={(participantId, settled) =>
              void patchParticipant(participantId, { settled })
            }
            onSetTotal={(cents) => void patchTicket({ totalCents: cents })}
            onOpenLog={() => setShowingLog(true)}
            onPagar={(toId, cents) => setPagandoA({ id: toId, cents })}
            onResolver={(fromId, ok) => void resolverPago(fromId, ok)}
            onPonerCobro={() => setCobrando(true)}
            ticketsSinPagador={ticketsSinPagador}
            onDecirPagador={(receiptId) => setPreguntandoTicket({ receiptId })}
          />
        )}
      </main>

      {/* ---------------------------------------------------------- barra fija */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-paper-2/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="stamp text-ink-faint">{meId ? t.comanda.loTuyo : t.comanda.sinRepartir}</p>
            <p className="tnum text-2xl font-bold leading-tight">
              {/*
                Lo que te has tomado tú, y nada más.

                Antes salía el saldo, y al que puso la tarjeta le aparecía en
                negativo: iba marcando sus tres platos y la cifra bajaba, que es
                justo lo contrario de lo que está haciendo. El saldo tiene su
                sitio en Cuentas; aquí abajo, mientras se reparte, la pregunta
                es «¿cuánto llevo?» y esa es la misma para todos.

                Al resto no le cambia nada: quien no ha adelantado dinero tiene
                el saldo igual a lo suyo, así que la cifra es la de siempre.
              */}
              {money(
                meId
                  ? (myBalance ? myBalance.itemsCents + myBalance.extrasCents : 0)
                  : settlement.unassignedCents,
                state.ticket.currency,
              )}
            </p>
          </div>
          {meId ? (() => {
            const misDeudas = settlement.transactions.filter((tx) => tx.fromId === meId);
            const deboAUnaPersona = misDeudas.length === 1;
            const soyAcreedor = settlement.transactions.some((tx) => tx.toId === meId);
            const isPureDebtor = deboAUnaPersona && !soyAcreedor;
            const debidoTotal = misDeudas.reduce((a, tx) => a + tx.cents, 0);

            const isSettled = myBalance?.settled;
            const showTodoPagado = isSettled && !soyAcreedor && !soyElPagador;

            /*
              Lo primero de todo: si el ticket que estás mirando no tiene
              pagador, no hay nada que calcular todavía. La pregunta va por
              papel porque tres tickets pueden llevar tres pagadores, y sin ese
              dato lo que costó se le cobra a quien se lo comió sin abonárselo
              a nadie: sale una deuda sin acreedor y los números mienten.
            */
            const faltaPagadorAqui = tab === "comanda" && !pagadorDelTicket(currentReceiptId);

            /*
              Lo que dice el botón, por orden de urgencia. Fuera del JSX porque
              encadenado allí eran seis ternarios anidados y ya no se leía cuál
              ganaba a cuál.
            */
            const etiqueta = (() => {
              if (tab !== "comanda") return t.comanda.volverComanda;
              if (faltaPagadorAqui) return t.comanda.quienPagoEste;
              if (showTodoPagado) return t.comanda.todoPagadoBoton;
              if (isPureDebtor) return t.cuentas.pagarAhora;
              // Debiéndole a dos, el botón lleva a la lista y dice cuánto sale
              // en total: «Cuentas» a secas no contaba que había dos pagos.
              if (misDeudas.length > 1) {
                return rellena(t.comanda.pagarTotal, {
                  dinero: money(debidoTotal, state.ticket.currency),
                });
              }
              if (!soyElPagador && (myBalance?.owesCents ?? 0) === 0) return t.comanda.seleccionaAlgo;
              return t.comanda.cuentas;
            })();

            return (
              <button
                type="button"
                onClick={() => {
                  if (faltaPagadorAqui) {
                    setPreguntandoTicket({ receiptId: currentReceiptId });
                  } else if (showTodoPagado && tab === "comanda") {
                    const faltanPorPagar = settlement.byParticipant.filter(p => p.owesCents > 0 && !p.settled);
                    const isCompleted = state.items.length > 0 && settlement.unassignedCents === 0 && faltanPorPagar.length === 0 && settlement.byParticipant.some(p => p.paidCents > 0);
                    if (isCompleted) {
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
                    setShowStatusPopup(true);
                  } else if (isPureDebtor && tab === "comanda") {
                    const deuda = misDeudas[0];
                    setPagandoA({ id: deuda.toId, cents: deuda.cents });
                  } else if (!soyElPagador && (myBalance?.owesCents ?? 0) === 0 && tab === "comanda") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  } else {
                    if (tab === "comanda") trackOnce("cuentas", EV.veCuentas);
                    setTab(tab === "comanda" ? "cuentas" : "comanda");
                  }
                }}
                className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-bold active:scale-95 transition-transform ${
                  showTodoPagado && tab === "comanda"
                    ? "bg-[#3b82f6]/10 text-[#3b82f6] border border-[#3b82f6]/20"
                    : "bg-amber"
                }`}
                style={showTodoPagado && tab === "comanda" ? {} : { color: "var(--paper-2)" }}
              >
                {etiqueta}
              </button>
            );
          })() : (
            <button
              type="button"
              onClick={() => setJoinOverride(true)}
              className="shrink-0 rounded-xl bg-amber px-4 py-2.5 text-sm font-bold"
              style={{ color: "var(--paper-2)" }}
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
          onSetShares={(participantId, shares, into) =>
            claim(editingItem.id, shares, into, participantId)
          }
          onAddPerson={addPerson}
          onSplitUnits={(qty) => splitUnits(editingItem.id, qty)}
          onPick={(into) => {
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
          payerId={state.ticket.payerId}
          meId={meId}
          onUpdateAvatar={(participantId, avatar) =>
            void patchParticipant(participantId, { avatar })
          }
          onRemove={(participantId) =>
            void removeParticipant(participantId)
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
            onSuccess={(receiptId) => {
              setUploadingAnother(false);
              /*
                Se abre el ticket que se acaba de subir y se pregunta ahí mismo
                quién lo pagó. Ahora y no luego: quien acaba de hacerle la foto
                tiene el papel en la mano y sabe la respuesta; media hora
                después, en la pantalla de cuentas, ya no se acuerda nadie.
              */
              if (receiptId) {
                setActiveReceiptId(receiptId);
                setPreguntandoTicket({ receiptId });
              }
            }}
          />
        </Sheet>
      )}

      {showJoin && (
        <JoinSheet 
          people={state.participants} 
          globalProfile={globalProfile}
          onJoin={join} 
          onSaveProfile={saveProfile}
          onClose={() => setJoinOverride(false)} 
        />
      )}

      {preguntandoPagador && meId && (
        <PagadorSheet
          revolut={yo?.revolut || globalProfile?.revolut}
          bizum={yo?.bizum || globalProfile?.bizum}
          onPagueYo={() =>
            send("/payers", {
              method: "PATCH",
              body: JSON.stringify({ participantId: meId, receiptId: null, by: meId }),
            })
          }
          onSave={guardarCobro}
          onClose={() => setPreguntandoPagador(false)}
        />
      )}

      {cobrando && yo && (
        <CobroSheet
          revolut={yo.revolut || globalProfile?.revolut}
          bizum={yo.bizum || globalProfile?.bizum}
          onSave={async (datos) => {
            await guardarCobro(datos);
            saveProfile({ 
              revolut: datos.revolut || undefined, 
              bizum: datos.bizum || undefined 
            });
          }}
          onClose={() => setCobrando(false)}
        />
      )}

      {pagandoA && (
        <PagarSheet
          a={state.participants.find((p) => p.id === pagandoA.id)!}
          cents={pagandoA.cents}
          currency={state.ticket.currency}
          place={state.ticket.place}
          onEnviado={(via) => declararPago(pagandoA.id, pagandoA.cents, via)}
          onClose={() => setPagandoA(null)}
        />
      )}

      {menuOpen && (
        <HeaderMenuSheet
          showPayerOptions={soyElPagador}
          ticketClosed={state.ticket.closed ?? false}
          onClose={() => setMenuOpen(false)}
          onComoFunciona={() => setGuiding(true)}
          onChangeName={() => {
            if (!yo) {
              setJoinOverride(true);
            } else {
              setEditNameOpen(true);
            }
          }}
          onLeave={() => {
            if (yo) {
              void removeParticipant(yo.id);
              store(null);
            }
          }}
          onChangePayer={
            (!state.ticket.closed) ? () => setCambiarPagadorOpen(true) : null
          }
          onRemovePayer={
            (!state.ticket.closed && soyElPagador) ? async () => {
              await send("/payers", {
                method: "PATCH",
                body: JSON.stringify({ participantId: null, receiptId: null, by: meId }),
              });
            } : null
          }
          onConfigPayment={
            (!state.ticket.closed && soyElPagador) ? () => setCobrando(true) : null
          }
          onCloseTicket={
            (!state.ticket.closed && soyElPagador) ? () => patchTicket({ closed: true }) : null
          }
        />
      )}

      {preguntandoTicket && (
        <PagadorTicketSheet
          etiqueta={
            preguntandoTicket.receiptId
              ? (receipts.find((r) => r.id === preguntandoTicket.receiptId)?.label ?? null)
              : state.ticket.place
          }
          participants={state.participants}
          meId={meId}
          payerId={pagadorDelTicket(preguntandoTicket.receiptId)}
          onElegir={(participantId) => {
            void send("/payers", {
              method: "PATCH",
              body: JSON.stringify({
                participantId,
                receiptId: preguntandoTicket.receiptId,
                by: meId,
              }),
            });
          }}
          onClose={() => setPreguntandoTicket(null)}
        />
      )}

      {cambiarPagadorOpen && (
        <CambiarPagadorSheet
          ticket={state.ticket}
          receipts={state.receipts || []}
          people={settlement.byParticipant}
          onSetPayer={async (participantId, receiptId) => {
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
              body: JSON.stringify({ participantId: finalParticipantId, receiptId, by: meId }),
            });
          }}
          onClose={() => setCambiarPagadorOpen(false)}
        />
      )}

      {showStatusPopup && (
        <Sheet onClose={() => setShowStatusPopup(false)}>
          {(() => {
            const faltanPorPagar = settlement.byParticipant.filter(p => p.owesCents > 0 && !p.settled);
            const isCompleted = state.items.length > 0 && settlement.unassignedCents === 0 && faltanPorPagar.length === 0 && settlement.byParticipant.some(p => p.paidCents > 0);

            return (
              <div className="text-center py-6 px-2">
                {isCompleted ? (
                  <>
                    <p className="text-6xl mb-5">🎉</p>
                    <h2 className="text-2xl font-bold text-amber mb-3 tracking-tight">{t.estado.completadoTitulo}</h2>
                    <p className="text-ink-soft mb-8 leading-relaxed">{t.estado.completadoTexto}<br/>{t.estado.completadoRemate}</p>
                  </>
                ) : (
                  <>
                    <p className="text-6xl mb-5">⏳</p>
                    <h2 className="text-2xl font-bold text-[#3b82f6] mb-3 tracking-tight">{t.estado.alDiaTitulo}</h2>
                    <p className="text-ink-soft mb-8 leading-relaxed">
                      {t.estado.alDiaTexto}<br/>
                      {faltanPorPagar.length === 1
                        ? t.estado.faltaUna
                        : rellena(t.estado.faltanN, { n: faltanPorPagar.length })}
                    </p>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowStatusPopup(false)}
                  className="w-full rounded-xl border border-line bg-paper px-4 py-3.5 font-bold text-ink transition-colors active:bg-paper-3"
                >
                  {t.estado.cerrar}
                </button>
              </div>
            );
          })()}
        </Sheet>
      )}

      {editNameOpen && yo && (
        <EditNameSheet
          currentName={yo.name}
          currentAvatar={yo.avatar}
          currentBizum={yo.bizum}
          currentRevolut={yo.revolut}
          onSave={async (name, avatar, bizum, revolut) => {
            patchParticipant(yo.id, { name, avatar, bizum, revolut });
            saveProfile({ name, avatar, bizum, revolut });
          }}
          onClose={() => setEditNameOpen(false)}
        />
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

/** El aviso de que a ese ticket todavía nadie le ha puesto pagador. */
function Sinpagador() {
  return (
    <span
      aria-hidden
      className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-clay align-middle"
    />
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
  globalProfile,
  onJoin,
  onSaveProfile,
  onClose,
}: {
  people: Participant[];
  globalProfile: { name: string; avatar?: string; bizum?: string; revolut?: string } | null;
  onJoin: (name: string, avatar?: string, bizum?: string, revolut?: string) => Promise<void>;
  onSaveProfile: (updates: {name: string, avatar?: string, bizum?: string, revolut?: string}) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(!globalProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">{t.entrar.titulo}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t.entrar.entradilla}</p>

      {globalProfile && !showForm && (
        <div className="mt-5 mb-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void onJoin(globalProfile.name, globalProfile.avatar, globalProfile.bizum, globalProfile.revolut)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber px-4 py-3 font-bold text-paper transition-transform active:scale-[0.98]"
          >
            {globalProfile.avatar && (
              <Avatar name={globalProfile.name} avatar={globalProfile.avatar} color="var(--color-amber)" size={24} />
            )}
            {rellena(t.perfil.entrarComo, { name: globalProfile.name })}
          </button>
          
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-line bg-paper px-4 py-3 font-bold text-ink-soft transition-colors hover:border-amber active:bg-paper-3"
          >
            {t.perfil.entrarNuevo}
          </button>
        </div>
      )}

      {showForm && (
        <>
          <form
          className={`flex flex-col gap-4 mt-4`}
          onSubmit={async (event) => {
            event.preventDefault();
            if (!name.trim() || busy) return;
            setBusy(true);
            onSaveProfile({ name: name.trim(), avatar: avatar || undefined });
            await onJoin(name.trim(), avatar || undefined);
            setBusy(false);
          }}
        >
          <div className="flex flex-col gap-2">
            <p className="stamp text-ink-faint uppercase tracking-wider text-[0.7rem] font-bold">{t.perfil.tuNombre}</p>
            <div className="flex gap-2">
              <input
                autoFocus={people.length === 0}
                value={name}
                onChange={(event) => setName(event.target.value)}
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
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <p className="stamp text-ink-faint uppercase tracking-wider text-[0.7rem] font-bold">{t.perfil.ponteFoto}</p>
            <div className="flex gap-3">
              <div className="shrink-0 flex items-center justify-center">
                <Avatar name={name || "Yo"} avatar={avatar} color="#e8b04b" size={56} />
              </div>
              <div className="flex flex-col gap-2 flex-1 justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border border-line bg-paper px-4 py-2 text-sm font-semibold transition-colors hover:bg-paper-2 active:bg-paper-3"
            >
              {t.perfil.subirFoto}
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const base64 = await processImageToAvatarBase64(file);
                  setAvatar(base64);
                } catch (error) {
                  console.error("Error processing image", error);
                }
              }}
            />
            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar("")}
                className="w-full rounded-xl border border-transparent bg-paper-2 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-3 active:bg-paper-4"
              >
                {t.perfil.quitarFoto}
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
    </>
  )}

      <button
        type="button"
        onClick={onClose}
        className="mt-4 block w-full py-2 text-center text-sm font-bold text-ink-soft opacity-70 transition-opacity hover:opacity-100"
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
          placeholder={t.varios.otraCana}
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
