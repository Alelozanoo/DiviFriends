"use client";

import { useEffect, useRef, useState } from "react";
import { money } from "@/lib/format";
import { LIMITS } from "@/lib/ticketDoc";
import type { Item, ItemBreakdown, Participant } from "@/lib/types";
import { useT, rellena } from "@/lib/i18n";
import { Avatar, Sheet } from "./ui";

/**
 * Repartir una línea, en preguntas cortas y en este orden: cuántas unidades
 * van a repartirse, entre cuántos, y con quién.
 *
 * Antes las dos vivían una debajo de la otra en la misma hoja y casi nadie
 * llegaba a la segunda: elegías «entre 4», la hoja se cerraba sola, y para
 * decir quiénes eran esos cuatro había que volver a entrar por el ÷. Quien lo
 * probaba se quedaba en el primer paso creyendo que ya estaba, y la línea se
 * quedaba con tres partes sin dueño.
 *
 * Por eso el número ya no cierra nada: lleva al «¿con quién?», donde están los
 * de la mesa y un hueco para apuntar a quien falte. El nombre que se apunta
 * aquí es el mismo que esa persona se encontrará esperándola cuando entre por
 * el enlace, así que apuntar a Sofía ahora le ahorra escribirlo luego.
 *
 * La primera pregunta sólo sale cuando la línea trae varias unidades, y es la
 * que faltaba: en un «Carne ×2», repartir entre cinco repartía las dos carnes
 * entre cinco, y no había manera de decir que una fue entre cinco y la otra
 * entre dos. Al elegir menos de las que hay, esas unidades se separan a su
 * propia línea y la hoja sigue con ella. Cada línea lleva su reparto, así que
 * no hace falta ningún concepto nuevo: son dos líneas normales.
 */
export default function ItemSheet({
  item,
  breakdown,
  participants,
  meId,
  currency,
  onSetShares,
  onPick,
  onSetPartes,
  onSplitUnits,
  onAddPerson,
  onClose,
}: {
  item: Item;
  breakdown: ItemBreakdown;
  participants: Participant[];
  meId: string | null;
  currency: string;
  /** `into` parte la línea en un trozo más para hacer sitio a quien no cabía. */
  onSetShares: (participantId: string, shares: number, into?: number) => void;
  onPick: (into: number) => void;
  /** Cambia en cuántas partes se reparte, sin cogerse ninguna. */
  onSetPartes: (into: number) => void;
  /**
   * Separa `qty` unidades a su propia línea. Devuelve si salió bien; la hoja
   * se queda entonces con la línea nueva, que es la que se va a repartir.
   */
  onSplitUnits: (qty: number) => Promise<boolean>;
  /** Apunta a alguien a la mesa y devuelve su ficha para darle su parte. */
  onAddPerson: (name: string) => Promise<string | null>;
  onClose: () => void;
}) {
  const t = useT();
  /*
    Varias unidades enteras: «Carne ×2», «Caña ×9». Un peso de carnicería
    —1,025— no cuenta, porque ahí no hay unidades que separar.
  */
  const multiUnidad = Number.isInteger(item.qty) && item.qty > 1;

  /*
    Una sola hoja.

    Fueron tres pantallas y luego dos, y seguía sobrando una. Las preguntas son
    tres —cuántas de estas, entre cuántos, y quiénes— pero se contestan de un
    vistazo si están juntas: la cantidad arriba, al lado del nombre, y debajo
    los huecos, que ya dicen a la vez cuántos son y quiénes.

    Lo que obligaba a separarlas era de fontanería: repartir menos unidades de
    las que hay parte la línea en dos y eso no se deshace, así que no puede
    pasar mientras alguien juguetea con un contador. Se resuelve esperando:
    el contador no toca nada, y la línea se parte sola en el momento en que se
    reparte de verdad —al tocar un hueco o «toda la mesa»—, que es cuando ya
    está claro lo que se quiere.
  */
  const [unidades, setUnidades] = useState(item.qty);
  const [eligiendo, setEligiendo] = useState<number | null>(null);
  const [nuevo, setNuevo] = useState("");
  const [busy, setBusy] = useState(false);

  /*
    Lo que quedó a medias mientras se separaba la línea.

    Al separar, la hoja pasa a hablar de la línea nueva y llega en el
    renderizado siguiente. Por eso lo pendiente se guarda como una descripción
    y no como una función: ejecutarla después vuelve a pedir los mandos, que
    para entonces ya apuntan a la línea buena.
  */
  type Pendiente =
    | { tipo: "todos" }
    | { tipo: "poner"; id: string }
    | { tipo: "partes"; n: number };
  const pendiente = useRef<Pendiente | null>(null);
  const lineaPrevia = useRef<string | null>(null);

  const porId = new Map(participants.map((p) => [p.id, p]));

  /*
    Los huecos salen del reparto que ya hay, no de un estado aparte.

    `splitInto` son las partes y cada parte es un hueco; los que tienen dueño
    salen de los claims y el resto quedan libres. Quien lleva dos partes ocupa
    dos huecos, que es la verdad y se ve. Al no guardar nada por duplicado, lo
    que otro marque desde su móvil aparece aquí solo.
  */
  const huecos: (string | null)[] = [
    ...breakdown.shares.flatMap((s) => Array<string>(s.shares).fill(s.participantId)),
    ...Array<null>(Math.max(0, breakdown.freeShares)).fill(null),
  ];

  const esTodaLaMesa =
    participants.length > 0 &&
    breakdown.freeShares === 0 &&
    participants.every((p) => breakdown.shares.some((s) => s.participantId === p.id));

  /** Una parte para cada uno de los que están en la mesa, de un toque. */
  function repartirEntreTodos() {
    const gente = participants.map((p) => p.id);
    onPick(gente.length);
    for (const id of gente) {
      if (!breakdown.shares.some((s) => s.participantId === id)) onSetShares(id, 1, gente.length);
    }
    setEligiendo(null);
  }

  /** Mete a alguien en un hueco libre. Si no queda ninguno, abre uno más. */
  function ponerEnHueco(participantId: string) {
    const suyas = breakdown.shares.find((s) => s.participantId === participantId)?.shares ?? 0;
    onSetShares(
      participantId,
      suyas + 1,
      breakdown.freeShares > 0 ? undefined : item.splitInto + 1,
    );
    setEligiendo(null);
  }

  /** Lo saca de un hueco. Con varias partes, le quita una. */
  function quitarDelHueco(participantId: string) {
    const suyas = breakdown.shares.find((s) => s.participantId === participantId)?.shares ?? 0;
    onSetShares(participantId, Math.max(0, suyas - 1));
    setEligiendo(null);
  }

  function ejecutar(accion: Pendiente) {
    if (accion.tipo === "todos") repartirEntreTodos();
    else if (accion.tipo === "poner") ponerEnHueco(accion.id);
    else onSetPartes(accion.n);
  }

  /**
   * Hace algo sobre la línea, separándola antes si hace falta.
   *
   * Mientras el contador de arriba diga «todas», no hay nada que separar. En
   * cuanto dice menos, la primera cosa que se reparta parte la línea: esas
   * unidades se van a una línea propia y la hoja sigue con ella.
   */
  async function conLineaLista(accion: Pendiente) {
    if (unidades >= item.qty) {
      ejecutar(accion);
      return;
    }
    pendiente.current = accion;
    lineaPrevia.current = item.id;
    setBusy(true);
    const hecho = await onSplitUnits(unidades);
    setBusy(false);
    if (!hecho) {
      pendiente.current = null;
      lineaPrevia.current = null;
    }
  }

  /* Ya hay línea nueva: se termina lo que se había pedido. */
  useEffect(() => {
    if (!pendiente.current || !lineaPrevia.current || item.id === lineaPrevia.current) return;
    ejecutar(pendiente.current);
    pendiente.current = null;
    lineaPrevia.current = null;
    // `ejecutar` se recrea en cada render; lo que manda es que la línea cambie.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  return (
    <Sheet onClose={onClose}>
      {/*
        La ✕ va arriba y pegada: la hoja es más alta que la pantalla en cuanto
        hay unos cuantos comensales, así que un cierre al final del todo obliga
        a bajar para salir. Tocar fuera sigue funcionando, pero no se ve.
      */}
      <div className="sticky -top-2 z-10 -mx-[var(--gutter)] -mt-2 flex items-start justify-between gap-3 bg-paper-2/95 px-[var(--gutter)] pb-3 pt-2 backdrop-blur">
        <div className="min-w-0">
          <h2 className="truncate text-[17px] font-bold tracking-[-0.02em]">{item.name}</h2>
          <p className="mt-0.5 text-[15px] text-ink-soft">
            {money(item.totalCents, currency)}
            {/* «1,025 unidades» no es una frase: eso es un peso, no unidades. */}
            {multiUnidad && ` · ${item.qty} ${t.repartir.unidades}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-[17px] leading-none text-ink-faint transition-colors hover:bg-paper-3 hover:text-ink active:bg-paper-3"
        >
          ✕
        </button>
      </div>

      {/*
        Cuántas de ellas, arriba y con el nombre.

        Era una pantalla entera para sí sola, con su rejilla de once números y
        su «paso 1 de 2». Es una cantidad, y una cantidad se dice con un más y
        un menos: cabe en una línea al lado del plato y deja ver a la vez lo que
        de verdad se está decidiendo, que es entre quiénes va.
      */}
      {multiUnidad && (
        <div className="mt-4 flex items-center gap-3">
          <Contador valor={unidades} min={1} max={item.qty} onCambia={setUnidades} disabled={busy} />
          <span className="text-[15px] text-ink-soft">
            {unidades === item.qty ? t.repartir.todas : rellena(t.repartir.deN, { n: item.qty })} ·{" "}
            <b className="tnum font-bold text-ink">
              {money(Math.round((item.totalCents * unidades) / item.qty), currency)}
            </b>
          </span>
        </div>
      )}

      {multiUnidad && unidades < item.qty && (
        <p className="mt-2 text-[13px] leading-relaxed text-ink-faint">
          {item.qty - unidades === 1
            ? t.repartir.laOtraAparte
            : rellena(t.repartir.lasOtrasAparte, { n: item.qty - unidades })}
        </p>
      )}

          <h3 className="mt-5 text-[17px] font-bold tracking-[-0.02em]">
            {t.repartir.entreCuantos}
          </h3>

          {/*
            Toda la mesa de un toque, y el número al lado.

            «Toda la mesa» es lo que pasa nueve de cada diez veces —una paella
            entre los que están— y era tres o cuatro toques: elegir el número y
            luego ir tocando a cada uno. El contador queda para cuando sois más
            de los que hay dentro.
          */}
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void conLineaLista({ tipo: "todos" })}
              disabled={participants.length === 0 || busy}
              className={`min-h-[46px] flex-1 rounded-pieza border text-[15px] font-semibold transition-colors disabled:opacity-30 ${
                esTodaLaMesa
                  ? "border-amber bg-amber/12 text-amber"
                  : "border-line text-ink-soft active:bg-paper-3"
              }`}
            >
              {rellena(t.repartir.todaLaMesa, { n: participants.length })}
            </button>
            <Contador
              valor={item.splitInto}
              min={Math.max(1, breakdown.takenShares)}
              max={LIMITS.splitInto}
              onCambia={(n) => void conLineaLista({ tipo: "partes", n })}
            />
          </div>

          {/*
            Los huecos, que es la idea entera.

            «Entre 4» era un número y ya: decías cuatro y no veías a nadie, y
            hacía falta otra pantalla para preguntar quiénes. Aquí el número se
            dibuja. Cuatro partes son cuatro huecos, se rellenan tocándolos, y
            los que quedan vacíos dicen en voz alta lo que significan: que
            esperan a quien entre por el enlace más tarde. Eso último es la
            mitad de las mesas de un bar, gente que va llegando.
          */}
          <ul className="mt-3 grid list-none grid-cols-4 gap-2">
            {huecos.map((quien, i) => {
              const persona = quien ? porId.get(quien) : null;
              return (
                <li key={`${quien ?? "libre"}-${i}`}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      persona ? quitarDelHueco(persona.id) : setEligiendo(eligiendo === i ? null : i)
                    }
                    aria-label={persona ? persona.name : t.repartir.hueco}
                    className={`grid h-[74px] w-full place-items-center gap-1 rounded-bloque border-2 px-1 transition-colors disabled:opacity-40 ${
                      persona
                        ? "border-amber bg-amber/10"
                        : eligiendo === i
                          ? "border-amber border-dashed text-amber"
                          : "border-dashed border-line text-ink-faint active:bg-paper-3"
                    }`}
                  >
                    {persona ? (
                      <>
                        <Avatar
                          name={persona.name}
                          avatar={persona.avatar}
                          color={persona.color}
                          size={26}
                        />
                        <span className="max-w-full truncate text-[12px] font-semibold">
                          {persona.id === meId ? t.mesa.tu : persona.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[21px] leading-none">+</span>
                        <span className="text-[11px] leading-none">{t.repartir.hueco}</span>
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Quién ocupa el hueco que acabas de tocar. */}
          {eligiendo !== null && (
            <div className="mt-3 rounded-bloque border border-line bg-paper p-3">
              <p className="text-[13px] text-ink-faint">{t.repartir.quienOcupa}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {participants.map((persona) => (
                  <button
                    key={persona.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void conLineaLista({ tipo: "poner", id: persona.id })}
                    className="flex items-center gap-2 rounded-pieza border border-line px-3 py-2 text-[15px] font-semibold transition-colors active:bg-paper-3 disabled:opacity-40"
                  >
                    <Avatar
                      name={persona.name}
                      avatar={persona.avatar}
                      color={persona.color}
                      size={20}
                    />
                    {persona.id === meId ? t.mesa.tu : persona.name}
                  </button>
                ))}
              </div>

              {/*
                Apuntar a alguien sin salir de aquí. Antes había que cerrar la
                hoja, abrir «Compartir», escribir el nombre y volver a buscar el
                plato: cuatro pantallas para decir que la paella también era de
                Sofía.
              */}
              <form
                className="mt-2.5 flex gap-2"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const name = nuevo.trim();
                  if (!name || busy) return;
                  setBusy(true);
                  const participantId = await onAddPerson(name);
                  setBusy(false);
                  setNuevo("");
                  if (participantId) void conLineaLista({ tipo: "poner", id: participantId });
                }}
              >
                <input
                  value={nuevo}
                  onChange={(event) => setNuevo(event.target.value)}
                  placeholder={t.repartir.anadeAQuienFalte}
                  maxLength={40}
                  aria-label={t.repartir.anadeAQuienFalte}
                  className="min-w-0 flex-1 rounded-pieza border border-line bg-paper px-3.5 py-2.5 text-[16px] focus:border-amber focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={busy || !nuevo.trim()}
                  className="shrink-0 rounded-pieza bg-amber px-4 text-[15px] font-bold text-paper disabled:opacity-30"
                >
                  {t.repartir.anadir}
                </button>
              </form>
            </div>
          )}

          {/* La cuenta de lo que queda: es lo único que dice si has terminado. */}
          <p className="mt-3 rounded-bloque bg-paper px-3.5 py-2.5 text-[15px] leading-relaxed text-ink-soft">
            {breakdown.freeShares === 0
              ? rellena(t.repartir.cadaUnoPaga, {
                  dinero: money(breakdown.perShareCents, currency),
                })
              : breakdown.freeShares === 1
                ? rellena(t.repartir.huecoEspera, {
                    dinero: money(breakdown.perShareCents, currency),
                  })
                : rellena(t.repartir.huecosEsperan, {
                    n: breakdown.freeShares,
                    dinero: money(breakdown.perShareCents, currency),
                  })}
      </p>

      {/*
        Nunca «Cancelar»: cada toque de aquí se guarda al momento, así que no
        hay nada que deshacer al salir. Ni siquiera separar unidades, que es lo
        único que no tiene vuelta atrás: no pasa al mover el contador, sino al
        repartir de verdad.

        Quitar la línea no vive aquí: estaba bajo una raya al final de una hoja
        que va de repartir, y no tenía nada que ver. Es la ✕ de la burbuja.
      */}
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="mt-4 w-full min-h-[52px] rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {t.repartir.listo}
      </button>
    </Sheet>
  );
}

/**
 * Un más y un menos.
 *
 * Sustituye a las rejillas de números que había en los dos primeros pasos. Un
 * contador dice «esto es una cantidad que subes y bajas»; una rejilla dice
 * «elige una de estas opciones», y cuando había dos rejillas seguidas con
 * significados distintos —unidades y personas— nadie sabía cuál estaba
 * contestando. De paso deja llegar a catorce, que con once botones no se podía.
 */
function Contador({
  valor,
  min,
  max,
  onCambia,
  disabled = false,
}: {
  valor: number;
  min: number;
  max: number;
  onCambia: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <span className="flex shrink-0 items-center rounded-pieza border border-line">
      <button
        type="button"
        aria-label="−"
        disabled={disabled || valor <= min}
        onClick={() => onCambia(valor - 1)}
        className="grid h-[46px] w-11 place-items-center text-[21px] leading-none text-ink-soft transition-colors active:bg-paper-3 disabled:opacity-25"
      >
        −
      </button>
      <span className="tnum w-9 text-center text-[19px] font-bold">{valor}</span>
      <button
        type="button"
        aria-label="+"
        disabled={disabled || valor >= max}
        onClick={() => onCambia(valor + 1)}
        className="grid h-[46px] w-11 place-items-center text-[21px] leading-none text-ink-soft transition-colors active:bg-paper-3 disabled:opacity-25"
      >
        +
      </button>
    </span>
  );
}
