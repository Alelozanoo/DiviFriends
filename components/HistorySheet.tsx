"use client";

import { money } from "@/lib/format";
import type { ChangeEvent, Participant } from "@/lib/types";
import { useT, rellena } from "@/lib/i18n";
import { Avatar, Sheet } from "./ui";

/**
 * Quién ha tocado qué, y cuándo.
 *
 * Existe porque quitar una línea le baja el total a toda la mesa y hasta ahora
 * pasaba sin dejar rastro: si alguien borraba su chuletón, la cuenta cuadraba y
 * nadie tenía forma de saber que el chuletón había estado ahí.
 *
 * No impide nada —cualquiera puede entrar diciendo que se llama Ana— y no
 * pretende hacerlo: lo que frena a quien iba a quitarse un plato es que se vea,
 * igual que en la mesa de verdad. Por eso el aviso de la ✕ lo dice antes de
 * borrar y no después.
 */
export default function HistorySheet({
  events,
  participants,
  currency,
  meId,
  onClose,
}: {
  events: ChangeEvent[];
  participants: Participant[];
  currency: string;
  meId: string | null;
  onClose: () => void;
}) {
  const t = useT();
  // El color de cada uno es su identidad en toda la app, así que aquí sale el
  // suyo y no uno según el tipo de cambio: pintando por acción, Álex salía
  // verde al añadir y rojo al quitar, como si fueran dos personas distintas.
  const colorDe = new Map(participants.map((p) => [p.id, p.color]));
  return (
    <Sheet onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight">{t.historial.titulo}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {t.historial.entradilla}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.historial.cerrar}
          className="-mr-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-lg leading-none text-ink-faint transition-colors hover:bg-paper-3 hover:text-ink active:bg-paper-3"
        >
          ✕
        </button>
      </div>

      {events.length === 0 ? (
        <p className="mt-5 rounded-xl border border-line bg-paper px-4 py-5 text-center text-sm text-ink-faint">
          {t.historial.vacio}
        </p>
      ) : (
        <ul className="mt-4 space-y-1.5">
          {events.map((event) => (
            <Fila
              key={event.at}
              event={event}
              currency={currency}
              /* Gris para quien ya no está en la mesa: se fue, pero su cambio
                 sigue contando y su nombre sigue aquí. */
              color={(event.participantId ? colorDe.get(event.participantId) : null) ?? "#776a5c"}
              mio={event.participantId !== null && event.participantId === meId}
              t={t}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-xl bg-amber py-3 text-sm font-bold text-paper transition-transform active:scale-[0.98]"
      >
        {t.historial.cerrar}
      </button>
    </Sheet>
  );
}

function Fila({
  event,
  currency,
  color,
  mio,
  t,
}: {
  event: ChangeEvent;
  currency: string;
  color: string;
  mio: boolean;
  t: ReturnType<typeof useT>;
}) {
  const quitado = event.kind === "item.remove";

  return (
    <li
      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
        quitado ? "border-clay/30 bg-clay/[0.07]" : "border-line bg-paper"
      }`}
    >
      <Avatar name={event.by} color={color} size={26} />

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug">
          <b className="font-semibold">{event.by}</b>
          {mio && <span className="ml-1 text-xs text-amber">{t.mesa.tu}</span>}{" "}
          <Cuenta event={event} currency={currency} t={t} />
        </p>
        <p className="stamp mt-0.5 text-ink-faint">{cuando(event.at, t)}</p>
      </div>
    </li>
  );
}

/** La frase de cada tipo de cambio, con el importe siempre a la vista. */
function Cuenta({ event, currency, t }: { event: ChangeEvent; currency: string; t: ReturnType<typeof useT> }) {
  const importe = <span className="tnum font-semibold">{money(event.cents, currency)}</span>;

  if (event.kind === "item.remove") {
    return (
      <span className="text-ink-soft">
        {t.historial.quito} <b className="font-semibold text-clay">{event.what}</b>{t.historial.de} {importe}
      </span>
    );
  }
  if (event.kind === "item.add") {
    return (
      <span className="text-ink-soft">
        {t.historial.anadio} <b className="font-semibold text-ink">{event.what}</b>{t.historial.de} {importe}
      </span>
    );
  }
  // `what` guarda el total viejo en céntimos; `cents`, el nuevo.
  return (
    <span className="text-ink-soft">
      {t.historial.cambioTotal} <span className="tnum">{money(Number(event.what) || 0, currency)}</span> {t.historial.aTotal} {importe}
    </span>
  );
}

/**
 * «Hace 5 min» en vez de una hora exacta.
 *
 * Lo que se pregunta al abrir esto es «¿esto ha sido ahora mismo o antes de que
 * yo llegara?», y para eso el reloj de pared no sirve. A partir del día se pasa
 * a la fecha, que es cuando lo relativo deja de decir nada.
 */
function cuando(iso: string, t: ReturnType<typeof useT>): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return t.misDivis.ahoraMismo;
  if (min < 60) return rellena(t.misDivis.haceMin, { n: min });
  const horas = Math.floor(min / 60);
  if (horas < 24) return rellena(t.misDivis.haceH, { n: horas });
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}
