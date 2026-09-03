import type { NewTicket } from "./store";

/**
 * Las cuentas de los reels, para que se puedan repartir de verdad.
 *
 * Un vídeo termina enseñando la web y una pregunta abierta, y ahí se pierde
 * casi todo el mundo: mira, discute en los comentarios y sigue bajando. Esto
 * pone una puerta en el último fotograma —`divifriends.es/reparte/vino`— que
 * lleva a la cuenta de ese mismo vídeo. Quien entra no ve una demo: **se lleva
 * su propia mesa** con esa cuenta dentro, y puede pasarle el enlace a sus
 * amigos, que es justo lo que queremos que aprenda a hacer.
 *
 * Su propia mesa y no una compartida a propósito. Enseñar un código y que
 * entren todos a la misma no aguanta: cada cambio es una transacción sobre un
 * único documento (`mutate` en `store.ts`), cualquiera puede quitar líneas, y
 * el segundo que llega se encuentra el chuletón ya repartido.
 *
 * **Las cuentas son las de los vídeos, línea a línea.** Salen de los HTML de
 * las animaciones (`~/Developer/divi/_generador/reel-*.html`), no de una
 * invención: quien vio el reel reconoce el chuletón y su precio. El total va
 * escrito a mano, tal y como se dice en el vídeo, y `plantillas.test.ts`
 * comprueba que las líneas lo suman — una cifra que no cuadra aquí desmiente
 * el vídeo que trajo a la persona.
 *
 * Y viven en el repo y no en Firestore también a propósito: una mesa se borra
 * sola a los treinta días de que nadie la toque, y ese reloj sólo se reinicia
 * al tocarla (`caducidad()` en `store.ts`). Una plantilla guardada allí se
 * moriría justo cuando el vídeo empieza a moverse.
 */
export interface Plantilla {
  /** Lo que se lee en el último fotograma: divifriends.es/reparte/<slug>. */
  slug: string;
  titulo: string;
  /** De qué iba el vídeo, para quien llega sin haberlo visto. */
  entradilla: string;
  /** La pregunta con la que acaba el reel. Se repite aquí para cerrar el círculo. */
  pregunta: string;
  cuenta: NewTicket;
}

/** Una línea del ticket. El total de la línea nunca se escribe: se multiplica. */
function linea(name: string, qty: number, unitCents: number) {
  return { name, qty, unitCents, totalCents: qty * unitCents };
}

/**
 * `totalCents` es el que se dice en el vídeo, escrito a mano y no sumado aquí.
 *
 * Sumarlo haría que cualquier línea mal tecleada cuadrase sola y el ticket
 * dejara de coincidir con la animación sin que se enterase nadie. Escrito a
 * mano, el test lo caza.
 */
function cuenta(
  tableLabel: string,
  totalCents: number,
  items: ReturnType<typeof linea>[],
): NewTicket {
  return { place: null, tableLabel, currency: "EUR", totalCents, items };
}

export const PLANTILLAS: Record<string, Plantilla> = {
  vino: {
    slug: "vino",
    titulo: "La cuenta del vino",
    entradilla:
      "La botella la eligió uno, se la bebió uno, y la pagasteis seis. Esta es la cuenta de esa mesa, tal cual sale en el vídeo.",
    pregunta: "¿El vino de la mesa lo paga el que se lo bebe?",
    cuenta: cuenta("La cuenta del vídeo", 8460, [
      linea("Ribera del Duero", 6, 600),
      linea("Presa ibérica", 1, 2100),
      linea("Croquetas", 3, 550),
      linea("Caña", 3, 250),
      linea("Agua", 2, 180),
    ]),
  },
  ensalada: {
    slug: "ensalada",
    titulo: "La cuenta de la ensalada",
    entradilla:
      "Tú, ensalada y dos aguas. Ellos, chuletón y cubatas. Y alguien propuso pagar a medias. Esta es la cuenta de esa mesa.",
    pregunta: "¿Tú habrías pagado a medias?",
    cuenta: cuenta("La cuenta del vídeo", 18800, [
      linea("Chuletón", 3, 2300),
      linea("Cubata", 8, 800),
      linea("Tabla de ibéricos", 1, 2400),
      linea("Postre", 2, 645),
      linea("Ensalada", 1, 950),
      linea("Agua", 2, 180),
      linea("Servicio", 1, 500),
    ]),
  },
  cumple: {
    slug: "cumple",
    titulo: "La cuenta del cumple",
    entradilla:
      "Al del cumple se le invita, y él pide sabiendo que no paga. Esta es la cuenta de esa cena: 168,80 € entre seis, y lo suyo lo pagáis cinco.",
    pregunta: "¿Cuánto es demasiado para invitar a alguien?",
    cuenta: cuenta("La cuenta del vídeo", 16880, [
      linea("Chuletón", 1, 2350),
      linea("Gin-tonic", 4, 900),
      linea("Croquetas", 3, 840),
      linea("Presa ibérica", 1, 1950),
      linea("Bacalao", 1, 1860),
      linea("Berenjenas con miel", 2, 890),
      linea("Caña", 5, 250),
      linea("Tarta de cumpleaños", 1, 690),
      linea("Refresco", 2, 260),
      linea("Agua", 2, 180),
    ]),
  },
};

export const SLUGS = Object.keys(PLANTILLAS);
