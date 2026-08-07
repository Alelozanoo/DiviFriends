import type {
  Claim,
  Item,
  ItemBreakdown,
  ParticipantBalance,
  Settlement,
  TicketState,
  Transfer,
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

function breakdownForItem(item: Item, claims: Claim[]): ItemBreakdown {
  const mine = claims.filter((c) => c.itemId === item.id && c.units > 0);

  if (item.splitMode === "shared") {
    // Compartido: se parte a partes iguales entre quienes se apuntan.
    if (mine.length === 0) {
      return {
        itemId: item.id,
        claimedUnits: 0,
        freeUnits: item.qty,
        unassignedCents: item.totalCents,
        shares: [],
        settled: false,
      };
    }
    const cents = splitCents(
      item.totalCents,
      mine.map(() => 1),
    );
    return {
      itemId: item.id,
      claimedUnits: item.qty,
      freeUnits: 0,
      unassignedCents: 0,
      shares: mine.map((c, i) => ({
        participantId: c.participantId,
        units: item.qty / mine.length,
        cents: cents[i],
      })),
      settled: true,
    };
  }

  // Por unidades: cada uno se lleva las que se comió; el resto queda libre.
  const claimedUnits = Math.min(
    item.qty,
    mine.reduce((a, c) => a + c.units, 0),
  );
  const freeUnits = Math.max(0, item.qty - claimedUnits);
  const weights = [...mine.map((c) => c.units), freeUnits];
  const cents = splitCents(item.totalCents, weights);
  const unassignedCents = cents[cents.length - 1];

  return {
    itemId: item.id,
    claimedUnits,
    freeUnits,
    unassignedCents,
    shares: mine.map((c, i) => ({
      participantId: c.participantId,
      units: c.units,
      cents: cents[i],
    })),
    settled: freeUnits <= 0,
  };
}

/**
 * Calcula el reparto completo: quién debe cuánto, qué queda sin asignar
 * y las transferencias mínimas para saldar la cuenta.
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
  const extrasPool = extrasCents + ticket.tipCents;

  const extraWeights = [
    ...participants.map((p) => itemsCentsByParticipant.get(p.id) ?? 0),
    unassignedItemCents,
  ];
  const anyWeight = extraWeights.some((w) => w > 0);
  const extrasSplit = anyWeight
    ? splitCents(extrasPool, extraWeights)
    : extraWeights.map((_, i) => (i === extraWeights.length - 1 ? extrasPool : 0));

  const byParticipant: ParticipantBalance[] = participants.map((p, i) => {
    const itemsC = itemsCentsByParticipant.get(p.id) ?? 0;
    const extrasC = extrasSplit[i];
    const owes = itemsC + extrasC;
    return {
      participantId: p.id,
      name: p.name,
      color: p.color,
      isPayer: p.isPayer,
      itemsCents: itemsC,
      extrasCents: extrasC,
      owesCents: owes,
      paidCents: p.paidCents,
      balanceCents: p.paidCents - owes,
    };
  });

  const grandTotalCents = ticket.totalCents + ticket.tipCents;
  const assignedCents = byParticipant.reduce((a, p) => a + p.owesCents, 0);
  const unassignedCents = grandTotalCents - assignedCents;
  const paidCents = byParticipant.reduce((a, p) => a + p.paidCents, 0);

  return {
    itemsTotalCents,
    extrasCents,
    tipCents: ticket.tipCents,
    grandTotalCents,
    unassignedCents,
    assignedCents,
    paidCents,
    overpaidCents: paidCents - grandTotalCents,
    byItem,
    byParticipant,
    transfers: computeTransfers(byParticipant),
    complete:
      participants.length > 0 &&
      unassignedCents === 0 &&
      items.every((i) => byItem[i.id].settled),
  };
}

/**
 * Salda los balances con el mínimo de transferencias: el que más debe le paga
 * al que más ha adelantado, y así sucesivamente.
 */
export function computeTransfers(balances: ParticipantBalance[]): Transfer[] {
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ ...b, left: -b.balanceCents }))
    .sort((a, b) => b.left - a.left);
  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ ...b, left: b.balanceCents }))
    .sort((a, b) => b.left - a.left);

  const transfers: Transfer[] = [];
  let di = 0;
  let ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di];
    const c = creditors[ci];
    const amount = Math.min(d.left, c.left);
    if (amount > 0) {
      transfers.push({
        fromId: d.participantId,
        fromName: d.name,
        toId: c.participantId,
        toName: c.name,
        cents: amount,
      });
      d.left -= amount;
      c.left -= amount;
    }
    if (d.left === 0) di += 1;
    if (c.left === 0) ci += 1;
  }
  return transfers;
}
