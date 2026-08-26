"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { clientFirestore, realtimeEnabled } from "./firebaseClient";
import { docToState, isTicketDoc } from "./ticketDoc";
import { applyClaim } from "./claimRules";
import type { TicketState } from "./types";

/** Cada cuánto se pregunta cuando la escucha en vivo no está disponible. */
const POLL_MS = 3000;

/**
 * Lo que se le da a la escucha para dar señales de vida antes de dar por hecho
 * que no va a darlas.
 *
 * No hay forma de preguntarle al SDK si está conectado: ante un problema de red
 * reintenta callado y no llama al callback de error, así que lo único que queda
 * es mirar si llega algo del servidor. Cinco segundos son de sobra con
 * cobertura mala, y equivocarse por abajo sólo cuesta una lectura de más.
 */
const VIGILANCIA_MS = 5000;

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
  /**
   * Si la escucha en vivo sigue en pie.
   *
   * Es estado y no una referencia a propósito: al caerse tiene que volver a
   * montarse el efecto de abajo para que arranque el sondeo.
   */
  const [enVivo, setEnVivo] = useState(realtimeEnabled);

  /* ------------------------------------------------- escucha en tiempo real */

  useEffect(() => {
    const db = clientFirestore();
    if (!db) return;

    // Si en unos segundos no ha llegado nada del servidor, esa escucha no está
    // funcionando y hay que preguntar a mano.
    const vigilante = setTimeout(() => setEnVivo(false), VIGILANCIA_MS);

    const unsubscribe = onSnapshot(
      doc(db, "tickets", code),
      // Con esto el SDK avisa también cuando lo único que cambia es de dónde
      // viene el dato, que es justo la señal que se mira abajo.
      { includeMetadataChanges: true },
      (snapshot) => {
        const data = snapshot.data();
        if (snapshot.exists() && isTicketDoc(data)) setServer(docToState(code, data));

        // `fromCache` es como dice el SDK «esto no viene del servidor». Mientras
        // sea cierto estamos a ciegas, aunque no haya saltado ningún error:
        // ante un fallo de red reintenta en silencio y el callback de error no
        // llega nunca. Antes esto se fiaba de ese error para dar el relevo a un
        // sondeo que además se apagaba solo con que hubiera configuración, así
        // que al caerse la escucha la mesa se congelaba para siempre y quien se
        // apuntaba desde otro móvil no aparecía jamás.
        if (snapshot.metadata.fromCache) {
          setEnVivo(false);
          return;
        }
        clearTimeout(vigilante);
        setEnVivo(true);
      },
      () => setEnVivo(false),
    );

    return () => {
      clearTimeout(vigilante);
      unsubscribe();
    };
  }, [code]);

  /* ------------------------------------------------------------- refrescos */

  useEffect(() => {
    let cancelled = false;
    async function preguntar() {
      try {
        const response = await fetch(`/api/tickets/${code}`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as TicketState;
        if (!cancelled) setServer(pick(data));
      } catch {
        /* red intermitente: se reintenta al volver */
      }
    }

    /*
      Volver a la comanda es cuando más falta hace, y va pase lo que pase con
      la escucha.

      El móvil ha estado bloqueado en el bolsillo mientras los demás se
      apuntaban, y ninguna conexión sobrevive a eso con garantías: iOS corta
      lo que haya abierto al apagar la pantalla y no siempre avisa de que lo
      ha hecho. Sin esto, la escucha podía estar muerta sin haberlo dicho y la
      mesa se quedaba como estaba media hora antes. Cuesta una lectura por
      vuelta, que es lo más barato que se puede pagar por no mentir.
    */
    const alVolver = () => {
      if (document.visibilityState === "visible") void preguntar();
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("focus", alVolver);

    // El sondeo, sólo si no hay escucha viva: con ella sería gastar por gusto.
    const timer = enVivo ? null : setInterval(alVolver, POLL_MS);
    if (!enVivo) void preguntar();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("focus", alVolver);
    };
  }, [code, enVivo]);

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
