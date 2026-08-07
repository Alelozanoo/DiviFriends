import type { TicketState } from "./types";

/**
 * Réplica local de la regla del servidor, incluido el auto-compartir: si pides
 * más partes de las que quedan, la línea se parte en más trozos. Tiene que
 * coincidir con `setClaim` en store.ts o la pantalla mentiría durante el
 * medio segundo que tarda en confirmar el servidor.
 */
export function applyClaim(
  state: TicketState,
  itemId: string,
  participantId: string,
  shares: number,
  splitInto?: number,
): TicketState {
  const item = state.items.find((i) => i.id === itemId);
  if (!item) return state;

  const rest = state.claims.filter(
    (c) => !(c.itemId === itemId && c.participantId === participantId),
  );
  const byOthers = rest
    .filter((c) => c.itemId === itemId)
    .reduce((total, c) => total + c.shares, 0);

  const naturalSplit = Math.max(1, Math.round(item.qty || 1));
  const withItem = (
    nextSplitInto: number,
    manualSplit: boolean,
    claims: TicketState["claims"],
  ): TicketState => ({
    ...state,
    items: state.items.map((i) =>
      i.id === itemId ? { ...i, splitInto: nextSplitInto, manualSplit } : i,
    ),
    claims,
  });

  if (shares <= 0) {
    // Lo que creció solo se encoge solo; lo que pediste a mano se respeta.
    const into = item.manualSplit
      ? item.splitInto
      : Math.max(naturalSplit, byOthers);
    return withItem(into, item.manualSplit, rest);
  }

  const wanted = Math.max(1, Math.round(shares));
  const manual = splitInto === undefined ? item.manualSplit : splitInto !== naturalSplit;
  let into = Math.max(1, Math.round(splitInto ?? item.splitInto), byOthers);
  if (wanted > into - byOthers) into = byOthers + wanted;

  const granted = Math.min(wanted, into - byOthers);
  if (granted <= 0) return state;

  return withItem(into, manual, [...rest, { itemId, participantId, shares: granted }]);
}
