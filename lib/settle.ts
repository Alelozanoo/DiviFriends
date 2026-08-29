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

  const paidByParticipant = new Map<string, number>();
  
  // Calcular cuánto ha adelantado cada persona (por los tickets que ha pagado)
  const legacyPayer = participants.find(p => p.isPayer)?.id;
  const mainPayerId = ticket.payerId || legacyPayer;
  
  // El ticket.totalCents incluye todos los recibos, así que para el ticket principal
  // solo debemos sumar la parte que no pertenece a ningún recibo adicional.
  const receiptsTotal = state.receipts ? state.receipts.reduce((a, r) => a + r.totalCents, 0) : 0;
  const legacyTicketCents = ticket.totalCents - receiptsTotal;
  
  if (mainPayerId && legacyTicketCents > 0) {
    paidByParticipant.set(mainPayerId, (paidByParticipant.get(mainPayerId) ?? 0) + legacyTicketCents);
  }
  
  if (state.receipts) {
    for (const r of state.receipts) {
      if (r.payerId) {
        paidByParticipant.set(r.payerId, (paidByParticipant.get(r.payerId) ?? 0) + r.totalCents);
      }
    }
  }

  const byParticipant: ParticipantBalance[] = participants.map((p, i) => {
    const itemsC = itemsCentsByParticipant.get(p.id) ?? 0;
    const extrasC = extrasSplit[i];
    const paidC = paidByParticipant.get(p.id) ?? 0;
    const owesCents = itemsC + extrasC - paidC;
    
    return {
      participantId: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      paidCents: paidC,
      itemsCents: itemsC,
      extrasCents: extrasC,
      owesCents,
      // Dejamos a los acreedores como no saldados por ahora para que no se difuminen
      // (lo recalcularemos después de sacar las transacciones).
      settled: owesCents === 0 || (owesCents > 0 && (p.settled || p.isPayer)),
    };
  });

  const grandTotalCents = ticket.totalCents;
  /*
    Repartido es lo que tiene dueño, extras incluidos — pero sólo la parte de
    los extras que ha caído en alguien.

    Aquí se sumaban los extras **enteros**, y con un ticket que trae descuento
    eso era un disparate visible: nueve líneas que suman 63,10 con un total
    impreso de 59,94 hacen −3,16 de extras, así que una mesa donde nadie había
    cogido nada anunciaba «repartido −3,16 €» y «sin repartir 63,10 €» —más que
    el total de la propia mesa—. `extrasSplit` ya reparte esa diferencia en
    proporción a lo que come cada uno, dejando en la última casilla la parte que
    corresponde a lo que aún no tiene dueño: es esa casilla la que no había que
    contar.
  */
  const assignedCents = participants.reduce(
    (a, p, i) => a + (itemsCentsByParticipant.get(p.id) ?? 0) + extrasSplit[i],
    0,
  );
  const unassignedCents = grandTotalCents - assignedCents;

  const transactions = calculateTransactions(byParticipant);

  // Segunda pasada para acreedores: están saldados si TODO el dinero de la cuenta está asignado
  // Y todos los que les deben dinero ya han saldado su parte.
  for (const p of byParticipant) {
    if (p.owesCents < 0) {
      if (unassignedCents > 0) {
        p.settled = false;
      } else {
        const incoming = transactions.filter(t => t.toId === p.participantId);
        p.settled = incoming.length > 0 && incoming.every(t => {
          const debtor = byParticipant.find(x => x.participantId === t.fromId);
          return debtor?.settled;
        });
      }
    }
  }

  return {
    itemsTotalCents,
    extrasCents,
    grandTotalCents,
    unassignedCents,
    assignedCents,
    // pendingCents es la suma de los que tienen saldo positivo y aún no están saldados
    pendingCents: byParticipant.reduce((a, p) => (p.settled || p.owesCents <= 0 ? a : a + p.owesCents), 0),
    byItem,
    byParticipant: sortForDisplay(byParticipant),
    transactions,
    complete:
      participants.length > 0 &&
      grandTotalCents - assignedCents === 0 &&
      items.every((i) => byItem[i.id].settled),
  };
}

/**
 * Calcula el mínimo número de transferencias para liquidar las deudas.
 * Estilo Tricount/Splitwise: los que deben pagan directamente a los que se les debe.
 */
function calculateTransactions(balances: ParticipantBalance[]): import("./types").Transaction[] {
  // Filtramos y clonamos para no mutar los originales
  const debtors = balances.filter(b => b.owesCents > 0).map(b => ({ id: b.participantId, amount: b.owesCents }));
  const creditors = balances.filter(b => b.owesCents < 0).map(b => ({ id: b.participantId, amount: -b.owesCents }));

  // Ordenamos para emparejar los más grandes primero (optimización simple)
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transactions: import("./types").Transaction[] = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];

    const amount = Math.min(debtor.amount, creditor.amount);
    
    if (amount > 0) {
      transactions.push({
        fromId: debtor.id,
        toId: creditor.id,
        cents: amount,
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;

    if (debtor.amount === 0) d++;
    if (creditor.amount === 0) c++;
  }

  return transactions;
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
      b.paidCents - a.paidCents ||
      a.name.localeCompare(b.name, "es"),
  );
}
