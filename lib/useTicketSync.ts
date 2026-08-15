"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { clientFirestore } from "./firebaseClient";
import { docToState, isTicketDoc } from "./ticketDoc";
import { applyClaim } from "./claimRules";
import type { TicketState } from "./types";

/** Sólo se usa cuando no hay configuración pública de Firebase. */
const POLL_MS = 3000;

interface PendingClaim {
  token: number;
  itemId: string;
  participantId: string;
  shares: number;
  splitInto?: number;
}

/**
 * Mantiene la comanda sincronizada con Firestore y encima superpone los cambios
 * que acabas de hacer y todavía no ha confirmado el servidor.
 *
 * Esa superposición es lo que evita el parpadeo clásico: si marcas un plato y
 * justo entonces llega una actualización de otro móvil, tu pulsación no se
 * borra de la pantalla para volver medio segundo después. Se mantiene encima
 * hasta que el servidor responde, y sólo entonces se retira.
 */
export function useTicketSync(code: string, initial: TicketState) {
  const [server, setServer] = useState<TicketState>(initial);
  const [pending, setPending] = useState<PendingClaim[]>([]);
  const nextToken = useRef(1);

  /* ------------------------------------------------- escucha en tiempo real */

  useEffect(() => {
    const db = clientFirestore();
    if (!db) return;

    const unsubscribe = onSnapshot(
      doc(db, "tickets", code),
      (snapshot) => {
        const data = snapshot.data();
        if (snapshot.exists() && isTicketDoc(data)) setServer(docToState(code, data));
      },
      () => {
        // Si las reglas o la red fallan, el sondeo de abajo sigue cubriendo.
      },
    );
    return unsubscribe;
  }, [code]);

  /* ------------------------------------------- sondeo de respaldo (sin config) */

  useEffect(() => {
    if (clientFirestore()) return;

    let cancelled = false;
    async function poll() {
      try {
        const response = await fetch(`/api/tickets/${code}`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as TicketState;
        if (!cancelled) setServer(pick(data));
      } catch {
        /* red intermitente: lo reintentamos en el siguiente tick */
      }
    }

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void poll();
    }, POLL_MS);
    const onFocus = () => void poll();
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [code]);

  /* ------------------------------------------------------------ composición */

  const state = useMemo(() => overlay(server, pending), [server, pending]);

  /** Pinta el cambio ya y devuelve el testigo con el que confirmarlo o revertirlo. */
  function beginClaim(
    itemId: string,
    participantId: string,
    shares: number,
    splitInto?: number,
  ): number {
    const token = nextToken.current++;
    setPending((prev) => [...prev, { token, itemId, participantId, shares, splitInto }]);
    return token;
  }

  function settleClaim(token: number, confirmed?: TicketState) {
    // Un único repintado: la verdad del servidor entra a la vez que se retira
    // la superposición, así no hay ni un fotograma con el valor viejo.
    if (confirmed) setServer(pick(confirmed));
    setPending((prev) => prev.filter((entry) => entry.token !== token));
  }

  return { state, setServer: (next: TicketState) => setServer(pick(next)), beginClaim, settleClaim };
}

function pick(state: TicketState): TicketState {
  return {
    ticket: state.ticket,
    receipts: state.receipts || [],
    items: state.items,
    participants: state.participants,
    claims: state.claims,
    events: state.events,
    pagos: state.pagos || [],
  };
}

/** Aplica los cambios pendientes sobre el estado del servidor, en orden. */
function overlay(server: TicketState, pending: PendingClaim[]): TicketState {
  if (pending.length === 0) return server;
  return pending.reduce(
    (state, entry) =>
      applyClaim(state, entry.itemId, entry.participantId, entry.shares, entry.splitInto),
    server,
  );
}
