import type {
  Claim,
  Item,
  ItemBreakdown,
  ParticipantBalance,
  Settlement,
  TicketState,
} from "./types";

/**
 * Reparte `total` céntimos entre varios pesos sin perder ni inventar un céntimo.
 * Método del resto mayor: los céntimos sobrantes van a quien tiene la fracción
 * más alta, así la suma del resultado es siempre exactamente `total`.
 */
export function splitCents(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const sum = weights.reduce((a, b) => a + Math.max(0, b), 0);
  if (sum <= 0) return weights.map(() => 0);

  const sign = total < 0 ? -1 : 1;
  const abs = Math.abs(total);
  const exact = weights.map((w) => (abs * Math.max(0, w)) / sum);
  const out = exact.map((e) => Math.floor(e));
  let remainder = Math.round(abs - out.reduce((a, b) => a + b, 0));

  const order = exact
    .map((e, i) => ({ i, frac: e - Math.floor(e) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  for (let k = 0; k < order.length && remainder > 0; k++) {
    out[order[k].i] += 1;
    remainder -= 1;
  }
  return out.map((v) => v * sign);
}

/**
 * Con qué total se queda el ticket al borrar una línea.
 *
 * Baja lo que costaba, porque si no su importe se colaría en los «extras» y
 * acabaría repartido entre todos sin decirlo: borrar dejaría de significar
 * nada. Pero nunca por debajo de lo que suman las líneas que quedan, y eso
 * cubre el caso contrario: una línea añadida a mano —o inventada por la
 * lectura de la foto— se quita sin arrastrar consigo el total impreso.
 */
export function totalAfterRemoving(
  totalCents: number,
  items: { id: string; totalCents: number }[],
  itemId: string,
): number {
  const removed = items.find((i) => i.id === itemId);
  if (!removed) return totalCents;
  const restCents = items.reduce((a, i) => (i.id === itemId ? a : a + i.totalCents), 0);
  return Math.max(0, restCents, totalCents - removed.totalCents);
}

/**
 * Un solo camino para todos los casos: la línea se parte en `splitInto` partes
 * y cada uno paga las que se ha quedado. Las que nadie coge se quedan sin
 * asignar, que es justo lo que la pantalla necesita cantar.
 */
function breakdownForItem(item: Item, claims: Claim[]): ItemBreakdown {
  const mine = claims.filter((c) => c.itemId === item.id && c.shares > 0);
  const splitInto = Math.max(1, item.splitInto);

  const takenShares = Math.min(
    splitInto,
    mine.reduce((a, c) => a + c.shares, 0),
  );
  const freeShares = Math.max(0, splitInto - takenShares);

  const weights = [...mine.map((c) => c.shares), freeShares];
  const cents = splitCents(item.totalCents, weights);

  return {
    itemId: item.id,
    takenShares,
    freeShares,
    unassignedCents: cents[cents.length - 1],
    perShareCents: Math.round(item.totalCents / splitInto),
    shares: mine.map((c, i) => ({
      participantId: c.participantId,
      shares: c.shares,
      cents: cents[i],
    })),
    settled: freeShares === 0,
  };
}

/**
 * Calcula el reparto completo: quién debe cuánto, qué queda sin dueño y cuánto
 * falta por devolverle a quien pagó.
 *
 * El modelo es de un solo pagador: alguien adelanta la cuenta entera y los
 * demás le devuelven su parte. Por eso no hay aquí ningún reparto de deudas
 * cruzadas — con un único acreedor, «quién le paga a quién» siempre tiene la
 * misma respuesta y no hace falta calcularla.
 */
export function computeSettlement(state: TicketState): Settlement {
  const { ticket, items, participants, claims } = state;

  const byItem: Record<string, ItemBreakdown> = {};
  const itemsCentsByParticipant = new Map<string, number>();
  let unassignedItemCents = 0;

  for (const item of items) {
    const bd = breakdownForItem(item, claims);
    byItem[item.id] = bd;
    unassignedItemCents += bd.unassignedCents;
    for (const share of bd.shares) {
      itemsCentsByParticipant.set(
        share.participantId,
        (itemsCentsByParticipant.get(share.participantId) ?? 0) + share.cents,
      );
    }
  }

  const itemsTotalCents = items.reduce((a, i) => a + i.totalCents, 0);
  // Diferencia entre el total impreso y la suma de líneas: servicio, IVA no
  // desglosado, descuentos… Se reparte en proporción a lo que come cada uno.
  const extrasCents = ticket.totalCents - itemsTotalCents;

  const extraWeights = [
    ...participants.map((p) => itemsCentsByParticipant.get(p.id) ?? 0),
    unassignedItemCents,
  ];
  const anyWeight = extraWeights.some((w) => w > 0);
  const extrasSplit = anyWeight
    ? splitCents(extrasCents, extraWeights)
    : extraWeights.map((_, i) => (i === extraWeights.length - 1 ? extrasCents : 0));

  const byParticipant: ParticipantBalance[] = participants.map((p, i) => {
    const itemsC = itemsCentsByParticipant.get(p.id) ?? 0;
    const extrasC = extrasSplit[i];
    return {
      participantId: p.id,
      name: p.name,
      color: p.color,
      isPayer: p.isPayer,
      itemsCents: itemsC,
      extrasCents: extrasC,
      owesCents: itemsC + extrasC,
      // Quien pagó no se debe nada a sí mismo, se derive y no se guarde: así
      // cambiar de pagador no deja a nadie marcado por error.
      settled: p.isPayer || p.settled,
    };
  });

  const grandTotalCents = ticket.totalCents;
  const assignedCents = byParticipant.reduce((a, p) => a + p.owesCents, 0);

  return {
    itemsTotalCents,
    extrasCents,
    grandTotalCents,
    unassignedCents: grandTotalCents - assignedCents,
    assignedCents,
    pendingCents: byParticipant.reduce((a, p) => (p.settled ? a : a + p.owesCents), 0),
    byItem,
    byParticipant: sortForDisplay(byParticipant),
    complete:
      participants.length > 0 &&
      grandTotalCents - assignedCents === 0 &&
      items.every((i) => byItem[i.id].settled),
  };
}

/**
 * Deja arriba a quien más debe y hunde a los que ya han pagado.
 *
 * La pregunta que se hace quien adelantó la cuenta es «¿quién me falta?», así
 * que lo pendiente va primero; dentro de cada grupo, de más a menos.
 */
function sortForDisplay(balances: ParticipantBalance[]): ParticipantBalance[] {
  return [...balances].sort(
    (a, b) =>
      Number(a.settled) - Number(b.settled) ||
      b.owesCents - a.owesCents ||
      a.name.localeCompare(b.name, "es"),
  );
}
