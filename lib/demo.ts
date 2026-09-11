import { colorFor, id, ticketCode } from "./format";
import { caducidad } from "./store";
import { LIMITS } from "./ticketDoc";
import { firestore, TICKETS } from "./firebaseAdmin";
import type { ClaimDoc, ItemDoc, ParticipantDoc, TicketDoc } from "./ticketDoc";

/**
 * La mesa de ejemplo: una cena que ya está pasando, para meterse dentro.
 *
 * De cada diez mesas con contenido, tres no las tocó nadie: se creó el divi y
 * ahí se quedó. Parte de eso es gente asomándose a ver qué es esto, y no tiene
 * dónde hacerlo: la única forma de probar la app era fotografiar un ticket de
 * verdad y quedarse con una mesa a medias en la lista.
 *
 * Aquí la cena ya está montada. Tres personas sentadas, la mitad de los platos
 * repartidos y alguien que ya puso la tarjeta. Quien entra se apunta como una
 * más y puede tocarlo todo: marcar, dividir, mirar las cuentas, decir que ha
 * pagado. No hay nada que romper.
 *
 * **Es una mesa de verdad**, no una imitación: el mismo documento, la misma
 * pantalla y el mismo código. Sólo lleva `demo: true`, que hace dos cosas —
 * sale el aviso de que no es real, y las métricas la saltan, que si no cada
 * curioso ensuciaría justo el número que mide si la app se entiende.
 *
 * Se borra sola a los treinta días como cualquier otra.
 */

/** Lo que se come una mesa de cuatro en un bar, con sus precios de bar. */
const CARTA: { name: string; qty: number; cents: number }[] = [
  { name: "Croquetas de jamón", qty: 2, cents: 1300 },
  { name: "Ensaladilla rusa", qty: 1, cents: 950 },
  { name: "Pulpo a la gallega", qty: 1, cents: 1890 },
  { name: "Tortilla de patatas", qty: 1, cents: 1100 },
  { name: "Caña", qty: 4, cents: 1000 },
  { name: "Tinto de verano", qty: 2, cents: 700 },
  { name: "Tarta de queso", qty: 2, cents: 1100 },
];

/** Quiénes están ya sentados. Nombres de bar, no «Usuario 1». */
const GENTE = ["Bea", "Nacho", "Sofía"];

/**
 * Quién ha cogido qué, por posición: `[plato, persona, partes]`.
 *
 * A medias a propósito. Una mesa entera ya repartida no enseña nada —no queda
 * nada que tocar— y una vacía no enseña de qué va. Así quedan cañas libres,
 * una tarta a medias y el pulpo sin dueño, que es exactamente el momento en el
 * que se abre esto en un bar.
 */
const COGIDO: [number, number, number][] = [
  [0, 0, 1], // una croqueta, Bea
  [0, 1, 1], // la otra, Nacho
  [1, 1, 1], // la ensaladilla, Nacho
  [3, 2, 1], // la tortilla, Sofía
  [4, 0, 1], // una caña, Bea
  [4, 2, 1], // otra caña, Sofía
  [6, 0, 1], // media tarta, Bea
];

export async function creaDemo(): Promise<string> {
  const ahora = new Date().toISOString();

  const participants: ParticipantDoc[] = GENTE.map((name, i) => ({
    id: id("prt"),
    name,
    color: colorFor(i),
    // Bea puso la tarjeta: así las cuentas salen con números de verdad desde
    // el primer momento, en vez de con el aviso de que falta el pagador.
    isPayer: i === 0,
  }));

  const items: ItemDoc[] = CARTA.map((linea, index) => ({
    id: id("itm"),
    name: linea.name,
    qty: linea.qty,
    unitCents: Math.round(linea.cents / linea.qty),
    totalCents: linea.cents,
    splitInto: linea.qty,
    manualSplit: false,
    position: index,
  }));

  const claims: ClaimDoc[] = COGIDO.map(([plato, persona, partes]) => ({
    itemId: items[plato].id,
    participantId: participants[persona].id,
    shares: partes,
  }));

  const doc: TicketDoc = {
    place: "Bar de ejemplo",
    tableLabel: null,
    currency: "EUR",
    // El total del papel, que es la suma de las líneas: sin extras ni
    // descuentos, para que las cuentas cuadren a la primera y quien mire no
    // tenga que preguntarse de dónde sale un céntimo.
    totalCents: CARTA.reduce((a, l) => a + l.cents, 0),
    payerId: participants[0].id,
    createdAt: ahora,
    updatedAt: ahora,
    caducaEl: caducidad(),
    items: items.slice(0, LIMITS.items),
    participants,
    claims,
    demo: true,
  };

  const db = firestore();
  for (let intento = 0; intento < 12; intento++) {
    const code = intento < 10 ? ticketCode() : ticketCode(10);
    try {
      await db.collection(TICKETS).doc(code).create(doc);
      return code;
    } catch {
      // Código pillado: se prueba otro. A la décima se alarga.
    }
  }
  throw new Error("No se ha podido crear la mesa de ejemplo.");
}
