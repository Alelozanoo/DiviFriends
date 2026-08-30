"use client";

import { useState } from "react";
import { computeSettlement } from "@/lib/settle";
import { money } from "@/lib/format";
import type { Claim, Item, Participant, TicketState } from "@/lib/types";
import { Avatar, Sheet } from "./ui";

/**
 * Prueba: repartir un plato en una sola pantalla.
 *
 * La idea es de Alejandro y va contra dos cosas de la hoja de hoy. La primera,
 * que hay dos preguntas numéricas seguidas —cuántas unidades y entre cuántos—
 * que se ven idénticas y significan cosas distintas. La segunda, que «entre 4»
 * es un número abstracto: dices cuatro y no ves a nadie, y luego otra pantalla
 * te pregunta quiénes.
 *
 * Aquí las dos preguntas caben en una hoja, y el número se dibuja: pones 4 y
 * salen cuatro huecos. Los rellenas con quien esté, o los dejas abiertos para
 * quien llegue después — que es exactamente lo que pasa en una mesa donde la
 * gente va entrando mientras ya se está pidiendo.
 *
 * Es una maqueta. Los números salen de `computeSettlement`, el de verdad.
 */

const YO = "p_ale";

const GENTE: Participant[] = [
  { id: YO, ticketId: "T", name: "Ale", color: "#e8b04b", isPayer: true, settled: false },
  { id: "p_nacho", ticketId: "T", name: "Nacho", color: "#5ec5c0", isPayer: false, settled: false },
  { id: "p_rocio", ticketId: "T", name: "Rocío", color: "#e0705f", isPayer: false, settled: false },
];

const nuevaLinea = (
  id: string,
  name: string,
  qty: number,
  totalCents: number,
  position: number,
): Item => ({
  id, ticketId: "T", name, qty,
  unitCents: Math.round(totalCents / qty),
  totalCents, splitInto: qty, manualSplit: false, position,
});

const INICIALES: Item[] = [
  nuevaLinea("i1", "Mariscada", 2, 7600, 0),
  nuevaLinea("i2", "Pulpo a la brasa", 1, 1890, 1),
  nuevaLinea("i3", "Café solo", 4, 640, 2),
];

export default function PruebaDividir() {
  const [items, setItems] = useState<Item[]>(INICIALES);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [dividiendo, setDividiendo] = useState<string | null>(null);

  const state: TicketState = {
    ticket: { id: "PRUEBA", place: "Taberna La Cantina", tableLabel: null, currency: "EUR",
      totalCents: items.reduce((a, i) => a + i.totalCents, 0), payerId: YO, createdAt: "" },
    receipts: [], items, participants: GENTE, claims, events: [], pagos: [],
  };
  const settlement = computeSettlement(state);
  const item = items.find((i) => i.id === dividiendo) ?? null;

  /**
   * Aplica lo elegido.
   *
   * Si se reparten menos unidades de las que hay, la línea se parte en dos —una
   * con lo que se reparte y otra con el resto— que es lo que hace la app de
   * verdad: dos repartos distintos piden dos líneas.
   */
  function repartir(itemId: string, unidades: number, huecos: (string | null)[]) {
    const original = items.find((i) => i.id === itemId)!;
    const partes = huecos.length;
    const nuevos: Item[] = [];
    let destino = original.id;

    if (unidades < original.qty) {
      const porUnidad = Math.round(original.totalCents / original.qty);
      destino = `${original.id}_x`;
      for (const i of items) {
        if (i.id !== original.id) { nuevos.push(i); continue; }
        nuevos.push({ ...i, id: destino, qty: unidades, totalCents: porUnidad * unidades, splitInto: partes, manualSplit: true });
        nuevos.push({ ...i, qty: original.qty - unidades, totalCents: porUnidad * (original.qty - unidades), splitInto: original.qty - unidades, position: i.position + 0.5 });
      }
    } else {
      for (const i of items) nuevos.push(i.id === original.id ? { ...i, splitInto: partes, manualSplit: true } : i);
    }

    setItems(nuevos.sort((a, b) => a.position - b.position));
    setClaims((previas) => [
      ...previas.filter((c) => c.itemId !== original.id),
      ...huecos.filter((h): h is string => Boolean(h)).map((participantId) => ({ itemId: destino, participantId, shares: 1 })),
    ]);
    setDividiendo(null);
  }

  const mio = settlement.byParticipant.find((p) => p.participantId === YO);

  return (
    <div className="mx-auto w-full max-w-md px-[var(--gutter)] pb-32 pt-5">
      <p className="text-[17px] font-bold tracking-[-0.02em]">Taberna La Cantina</p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">
        Maqueta para probar el reparto en una sola hoja. Toca «Dividir» en la mariscada, que es
        el caso del que hablábamos: hay dos y quieres repartir una.
      </p>
      <div className="rule mt-4" />

      <ul className="mt-4 grid list-none gap-[9px]">
        {items.map((i) => {
          const bd = settlement.byItem[i.id];
          const mia = bd?.shares.find((s) => s.participantId === YO);
          return (
            <li key={i.id} className={`rounded-caja border-[1.5px] px-[13px] py-3 ${mia ? "border-amber bg-amber/[0.085]" : "border-line-soft bg-paper-2"}`}>
              <div className="flex items-baseline gap-2.5">
                <span className="min-w-0 flex-1 text-[17px] font-semibold leading-tight">{i.name}</span>
                <span className={`tnum shrink-0 text-[17px] font-bold ${mia ? "text-amber" : "text-ink-faint"}`}>
                  {mia ? money(mia.cents, "EUR") : "—"}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="tnum flex-1 text-[13px] text-ink-faint">
                  {i.qty > 1 ? `${i.qty} × ${money(Math.round(i.totalCents / i.qty), "EUR")}` : money(i.totalCents, "EUR")}
                  {bd && bd.freeShares > 0 ? ` · quedan ${bd.freeShares}` : bd?.settled ? " · completo" : ""}
                </span>
                {bd && bd.shares.length > 0 && (
                  <span className="flex items-center -space-x-1.5">
                    {bd.shares.map((s) => {
                      const p = GENTE.find((g) => g.id === s.participantId)!;
                      return <Avatar key={p.id} name={p.name} color={p.color} size={18} />;
                    })}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setDividiendo(i.id)}
                  className="rounded-pieza border border-line px-3 py-1.5 text-[13px] font-semibold text-ink-soft transition-colors active:bg-paper-3"
                >
                  ÷ Dividir
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 border-t border-line bg-paper/95 px-[var(--gutter)] py-3 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <span>
            <span className="stamp block text-ink-faint">Lo tuyo</span>
            <span className="tnum text-[24px] font-bold leading-tight">{money(mio?.owesCents ?? 0, "EUR")}</span>
          </span>
          <button type="button" onClick={() => { setItems(INICIALES); setClaims([]); }}
            className="rounded-pieza border border-line px-4 py-2.5 text-[13px] font-semibold text-ink-soft">
            Empezar de nuevo
          </button>
        </div>
      </div>

      {item && (
        <HojaDividir
          item={item}
          gente={GENTE}
          onCerrar={() => setDividiendo(null)}
          onRepartir={(unidades, huecos) => repartir(item.id, unidades, huecos)}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function HojaDividir({
  item, gente, onCerrar, onRepartir,
}: {
  item: Item;
  gente: Participant[];
  onCerrar: () => void;
  onRepartir: (unidades: number, huecos: (string | null)[]) => void;
}) {
  const [unidades, setUnidades] = useState(1);
  /* Los huecos: uno por parte. Con nombre dentro o vacío esperando a alguien. */
  const [huecos, setHuecos] = useState<(string | null)[]>([YO, null]);
  const [eligiendo, setEligiendo] = useState<number | null>(null);

  const porUnidad = Math.round(item.totalCents / item.qty);
  const aRepartir = porUnidad * unidades;
  const cada = Math.round(aRepartir / Math.max(1, huecos.length));
  const dentro = huecos.filter(Boolean) as string[];
  const libres = huecos.length - dentro.length;
  const todaLaMesa = dentro.length === gente.length && libres === 0;

  const cambiaPartes = (n: number) => {
    const siguiente = Math.max(1, Math.min(20, n));
    setHuecos((previos) => {
      if (siguiente === previos.length) return previos;
      if (siguiente > previos.length) return [...previos, ...Array(siguiente - previos.length).fill(null)];
      // Al bajar se van primero los huecos vacíos, que es lo que nadie echa de menos.
      const orden = [...previos].sort((a, b) => (a === null ? 1 : 0) - (b === null ? 1 : 0));
      return orden.slice(0, siguiente);
    });
  };

  return (
    <Sheet centrado onClose={onCerrar} titulo={item.name}>
      <p className="mt-1 text-[13px] text-ink-faint">
        {item.qty > 1 ? `${item.qty} en el ticket · ${money(porUnidad, "EUR")} cada una` : money(item.totalCents, "EUR")}
      </p>

      {/* ---------------------------------------------- cuántas de ellas */}
      {item.qty > 1 && (
        <div className="mt-5">
          <p className="text-[15px] font-semibold">¿Cuántas repartís?</p>
          <div className="mt-2.5 flex items-center gap-3">
            <Contador valor={unidades} min={1} max={item.qty} onCambia={setUnidades} />
            <span className="tnum text-[13px] text-ink-faint">
              {unidades === item.qty ? "todas" : `de ${item.qty}`} · {money(aRepartir, "EUR")}
            </span>
          </div>
          {unidades < item.qty && (
            <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
              {item.qty - unidades === 1
                ? "La otra se queda en su propia línea, para repartirla aparte."
                : `Las otras ${item.qty - unidades} se quedan en su propia línea, para repartirlas aparte.`}
            </p>
          )}
        </div>
      )}

      {/* ------------------------------------------------- entre cuántos */}
      <div className="mt-6">
        <p className="text-[15px] font-semibold">¿Entre cuántos?</p>
        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHuecos(gente.map((g) => g.id))}
            className={`min-h-[44px] flex-1 rounded-pieza border text-[15px] font-semibold transition-colors ${
              todaLaMesa ? "border-amber bg-amber/12 text-amber" : "border-line text-ink-soft active:bg-paper-3"
            }`}
          >
            Toda la mesa · {gente.length}
          </button>
          <Contador valor={huecos.length} min={1} max={20} onCambia={cambiaPartes} />
        </div>

        {/* los huecos, que es la idea */}
        <ul className="mt-3 grid list-none grid-cols-4 gap-2">
          {huecos.map((quien, i) => {
            const p = quien ? gente.find((g) => g.id === quien) : null;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => (p ? setHuecos(huecos.map((h, j) => (j === i ? null : h))) : setEligiendo(i))}
                  className={`grid h-[74px] w-full place-items-center gap-1 rounded-bloque border-2 transition-colors ${
                    p ? "border-amber bg-amber/10" : "border-dashed border-line text-ink-faint active:bg-paper-3"
                  }`}
                >
                  {p ? (
                    <>
                      <Avatar name={p.name} color={p.color} size={26} />
                      <span className="max-w-full truncate px-1 text-[12px] font-semibold">{p.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[19px] leading-none">+</span>
                      <span className="text-[11px] leading-none">libre</span>
                    </>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-2.5 text-[12px] leading-relaxed text-ink-faint">
          {libres > 0
            ? `${libres} ${libres === 1 ? "hueco espera" : "huecos esperan"} a quien entre después: cada uno paga ${money(cada, "EUR")}.`
            : `Cada uno paga ${money(cada, "EUR")}.`}
        </p>
      </div>

      {/* quién ocupa el hueco */}
      {eligiendo !== null && (
        <div className="mt-4 rounded-bloque border border-line bg-paper p-3">
          <p className="text-[13px] text-ink-faint">¿Quién ocupa este hueco?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {gente.map((g) => (
              <button
                key={g.id}
                type="button"
                disabled={huecos.includes(g.id)}
                onClick={() => { setHuecos(huecos.map((h, j) => (j === eligiendo ? g.id : h))); setEligiendo(null); }}
                className="flex items-center gap-2 rounded-pieza border border-line px-3 py-2 text-[15px] font-semibold disabled:opacity-30"
              >
                <Avatar name={g.name} color={g.color} size={20} />
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => onRepartir(unidades, huecos)}
        className="mt-6 min-h-[52px] w-full rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
      >
        Repartir · {money(cada, "EUR")} cada uno
      </button>
    </Sheet>
  );
}

/** Un más y un menos, que no se confunde con una lista de opciones. */
function Contador({
  valor, min, max, onCambia,
}: { valor: number; min: number; max: number; onCambia: (n: number) => void }) {
  return (
    <span className="flex items-center gap-1 rounded-pieza border border-line">
      <button type="button" aria-label="Uno menos" disabled={valor <= min} onClick={() => onCambia(valor - 1)}
        className="grid h-[44px] w-11 place-items-center text-[21px] leading-none text-ink-soft disabled:opacity-25">−</button>
      <span className="tnum w-8 text-center text-[19px] font-bold">{valor}</span>
      <button type="button" aria-label="Uno más" disabled={valor >= max} onClick={() => onCambia(valor + 1)}
        className="grid h-[44px] w-11 place-items-center text-[21px] leading-none text-ink-soft disabled:opacity-25">+</button>
    </span>
  );
}
