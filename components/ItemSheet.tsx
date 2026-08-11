"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { LIMITS } from "@/lib/ticketDoc";
import type { Item, ItemBreakdown, Participant } from "@/lib/types";
import { Avatar, Sheet } from "./ui";

/**
 * Repartir una línea, en dos preguntas y en este orden: entre cuántos va, y
 * con quién.
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
 */
export default function ItemSheet({
  item,
  breakdown,
  participants,
  meId,
  currency,
  onSetShares,
  onPick,
  onUndoSplit,
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
  /** Deshace el reparto: vuelve a las unidades que traía el ticket. */
  onUndoSplit: () => void;
  /** Apunta a alguien a la mesa y devuelve su ficha para darle su parte. */
  onAddPerson: (name: string) => Promise<string | null>;
  onClose: () => void;
}) {
  // Una línea ya repartida entra directamente por el «¿con quién?»: el número
  // está decidido y lo que se viene a tocar aquí es la lista de nombres.
  const [paso, setPaso] = useState<"cuantos" | "quienes">(
    item.splitInto > 1 ? "quienes" : "cuantos",
  );
  const [custom, setCustom] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [busy, setBusy] = useState(false);

  // Partes ya repartidas, no personas: si Sofía lleva tres cañas y Ana dos, el
  // reparto no puede bajar de cinco aunque sólo haya dos nombres. Contando
  // cabezas, «entre 3» salía pulsable y el servidor lo corregía en silencio.
  const repartidas = breakdown.takenShares;
  const natural = Math.max(1, Math.round(item.qty || 1));
  // Cuando cada parte es una unidad de verdad —nueve cañas partidas en nueve—
  // se puede decir «Ana tomó tres». En un «entre 4» una parte es un cuarto de
  // paella y ese contador sólo servía para duplicarte el precio sin querer.
  const porUnidades = item.qty > 1 && item.splitInto === item.qty;

  const typed = Number.parseInt(custom, 10);
  const customValid =
    Number.isFinite(typed) && typed >= Math.max(2, repartidas) && typed <= LIMITS.splitInto;

  function repartirEntre(n: number) {
    onPick(n);
    setPaso("quienes");
  }

  /**
   * Le da su parte a alguien, y si la línea estaba llena la parte en un trozo
   * más para hacerle sitio.
   *
   * Aquí sí puede crecer sola, al revés que al tocar la burbuja: allí es un
   * roce y le cambiaría lo que paga a otro sin querer; aquí lo estás diciendo
   * con el dedo encima de un nombre.
   */
  function darParte(participantId: string) {
    onSetShares(participantId, 1, breakdown.freeShares > 0 ? undefined : item.splitInto + 1);
  }

  return (
    <Sheet onClose={onClose}>
      {/*
        La ✕ va arriba y pegada: la hoja es más alta que la pantalla en cuanto
        hay unos cuantos comensales, así que un cierre al final del todo obliga
        a bajar para salir. Tocar fuera sigue funcionando, pero no se ve.
      */}
      <div className="sticky -top-5 z-10 -mx-5 -mt-5 flex items-start justify-between gap-3 bg-paper-2/95 px-5 pb-3 pt-5 backdrop-blur">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold tracking-tight">{item.name}</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            {money(item.totalCents, currency)}
            {/* «1,025 unidades» no es una frase: eso es un peso, no unidades. */}
            {Number.isInteger(item.qty) && item.qty > 1 && ` · ${item.qty} unidades`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-lg leading-none text-ink-faint transition-colors hover:bg-paper-3 hover:text-ink active:bg-paper-3"
        >
          ✕
        </button>
      </div>

      {paso === "cuantos" ? (
        /* ------------------------------------------- paso 1: entre cuántos */
        <>
          <p className="stamp mt-5 text-amber">Paso 1 de 2</p>
          <h3 className="mt-1 text-lg font-bold tracking-tight">¿Entre cuántos se reparte?</h3>
          <p className="mt-1 text-sm text-ink-soft">
            Debajo de cada número, lo que costaría cada parte.
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[2, 3, 4, 5, 6, 7].map((n) => {
              // Partir en menos trozos de los ya repartidos dejaría a alguien fuera.
              const blocked = n < repartidas;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={blocked}
                  onClick={() => repartirEntre(n)}
                  className={`flex flex-col items-center gap-0.5 rounded-2xl border-2 py-3 transition-colors disabled:opacity-25 ${
                    item.splitInto === n
                      ? "border-mint bg-mint/10"
                      : "border-line hover:border-mint active:bg-paper-3"
                  }`}
                >
                  <span className="tnum text-xl font-bold">{n}</span>
                  <span className="tnum text-[0.7rem] text-ink-soft">
                    {money(Math.round(item.totalCents / n), currency)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mesas grandes: el menú rápido se queda corto a partir de 7. */}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (customValid) repartirEntre(typed);
            }}
          >
            <input
              value={custom}
              onChange={(event) => setCustom(event.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              placeholder="otro número"
              aria-label="Entre cuántas personas se reparte"
              className="tnum min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-2.5 text-center focus:border-mint focus:outline-none"
            />
            <button
              type="submit"
              disabled={!customValid}
              className="shrink-0 rounded-xl bg-mint px-4 text-sm font-bold text-paper disabled:opacity-30"
            >
              {customValid ? money(Math.round(item.totalCents / typed), currency) : "Repartir"}
            </button>
          </form>

          {/* Sólo cuando hay un reparto pedido a mano que deshacer. */}
          {/* Oculto cuando ya hay más partes repartidas que unidades trae el
              ticket: ahí el servidor no puede bajar el reparto sin dejar a
              alguien fuera, y el botón no haría nada. */}
          {item.manualSplit && repartidas <= natural && (
            <button
              type="button"
              onClick={onUndoSplit}
              className="mt-3 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-amber hover:text-amber"
            >
              {natural > 1 ? `Volver a ${natural} unidades sueltas` : "Dejar de compartirlo"}
            </button>
          )}
        </>
      ) : (
        /* ------------------------------------------------ paso 2: con quién */
        <>
          {/* La vuelta al número, con el número puesto: se ve dónde estás sin
              tener que acordarte de lo que acabas de pulsar. */}
          <button
            type="button"
            onClick={() => setPaso("cuantos")}
            className="stamp mt-5 inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-ink-faint transition-colors hover:border-amber hover:text-amber"
          >
            ← Entre {item.splitInto} · cambiar
          </button>

          <h3 className="mt-3 text-lg font-bold tracking-tight">¿Con quién lo compartes?</h3>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Toca a los de la mesa. A quien falte, apúntalo abajo: se encontrará su nombre esperándole
            cuando entre por el enlace.
          </p>

          {participants.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {participants.map((person) => {
                const share = breakdown.shares.find((s) => s.participantId === person.id);
                return (
                  <span
                    key={person.id}
                    className={`flex items-center rounded-xl border-2 transition-colors ${
                      share ? "border-amber bg-amber/12" : "border-line"
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={Boolean(share)}
                      onClick={() => (share ? onSetShares(person.id, 0) : darParte(person.id))}
                      className="flex items-center gap-1.5 py-2 pl-2 pr-2.5"
                    >
                      <Avatar name={person.name} avatar={person.avatar} color={person.color} size={22} />
                      <span className="max-w-28 truncate text-sm font-semibold">
                        {person.name}
                        {person.id === meId && (
                          <span className="ml-1 text-xs font-normal text-ink-faint">(tú)</span>
                        )}
                      </span>
                      <span
                        aria-hidden
                        className={`text-sm font-bold leading-none ${
                          share ? "text-amber" : "text-ink-faint"
                        }`}
                      >
                        {share ? "✓" : "+"}
                      </span>
                    </button>

                    {share && porUnidades && (
                      <span className="flex items-center pr-1">
                        <Step
                          label={`Quitarle una unidad a ${person.name}`}
                          onClick={() => onSetShares(person.id, share.shares - 1)}
                        >
                          −
                        </Step>
                        <span className="tnum w-4 text-center text-xs font-bold">
                          {share.shares}
                        </span>
                        <Step
                          label={`Darle otra unidad a ${person.name}`}
                          disabled={breakdown.freeShares === 0}
                          onClick={() => onSetShares(person.id, share.shares + 1)}
                        >
                          +
                        </Step>
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/*
            Apuntar a alguien sin salir de aquí. Antes había que cerrar la hoja,
            abrir «Compartir», escribir el nombre y volver a buscar el plato:
            cuatro pantallas para decir que la paella también era de Sofía.
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
              // Si ya estaba en la mesa y ya tenía su parte, no se le toca:
              // volver a dársela partiría la línea en un trozo de más.
              if (participantId && !breakdown.shares.some((s) => s.participantId === participantId)) {
                darParte(participantId);
              }
            }}
          >
            <input
              value={nuevo}
              onChange={(event) => setNuevo(event.target.value)}
              placeholder="Añade a quien falte"
              maxLength={40}
              aria-label="Nombre de quien también lo ha compartido"
              className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm focus:border-amber focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !nuevo.trim()}
              className="shrink-0 rounded-xl bg-amber px-4 text-sm font-bold text-paper disabled:opacity-30"
            >
              Añadir
            </button>
          </form>

          {/* La cuenta de lo que queda: es lo único que dice si ya has terminado. */}
          <p className="mt-3 rounded-xl bg-paper px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft">
            {breakdown.freeShares > 0 ? (
              <>
                Quedan{" "}
                <b className="tnum font-bold text-ink">
                  {breakdown.freeShares} de {item.splitInto}
                </b>{" "}
                sin dueño:{" "}
                <span className="tnum">{money(breakdown.unassignedCents, currency)}</span> que
                todavía no paga nadie.
              </>
            ) : porUnidades ? (
              <>
                Repartidas las {item.qty} unidades ·{" "}
                <span className="tnum font-bold text-mint">
                  {money(breakdown.perShareCents, currency)}
                </span>{" "}
                cada una.
              </>
            ) : (
              <>
                Repartido entre {item.splitInto} ·{" "}
                <span className="tnum font-bold text-mint">
                  {money(breakdown.perShareCents, currency)}
                </span>{" "}
                cada uno.
              </>
            )}
          </p>
        </>
      )}

      {/*
        Nunca «Cancelar»: cada toque de aquí arriba se guarda al momento, así
        que no hay nada que deshacer al salir. En el paso 1 el botón empuja
        hacia adelante en vez de cerrar, porque quedarse ahí es justo el fallo
        que traía a la gente con tres cuartos de paella sin dueño.

        Quitar la línea ya no vive aquí: estaba bajo una raya al final de una
        hoja que va de repartir, y no tenía nada que ver. Ahora es la ✕ de la
        esquina de la burbuja.
      */}
      <div className="mt-4" />
      {paso === "cuantos" && item.splitInto === 1 ? (
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-line py-3 text-sm font-semibold text-ink-soft"
        >
          Cerrar
        </button>
      ) : (
        <button
          type="button"
          onClick={paso === "cuantos" ? () => setPaso("quienes") : onClose}
          className="mt-3 w-full rounded-xl bg-amber py-3 text-sm font-bold text-paper transition-transform active:scale-[0.98]"
        >
          {paso === "cuantos" ? "Seguir · ¿con quién?" : "Listo"}
        </button>
      )}
    </Sheet>
  );
}

function Step({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-7 w-5 place-items-center text-sm font-bold transition-colors hover:text-amber disabled:opacity-25"
    >
      {children}
    </button>
  );
}
