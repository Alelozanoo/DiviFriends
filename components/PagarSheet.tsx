"use client";

import { useState } from "react";
import { conceptoDe, enlaceRevolut, telefonoBonito } from "@/lib/cobro";
import { money } from "@/lib/format";
import { useT, rellena } from "@/lib/i18n";
import type { Participant, Via } from "@/lib/types";
import { MarcaBizum } from "./marcas";
import { Avatar, Sheet } from "./ui";

/**
 * Pagarle a alguien su parte, con todo escrito de antemano.
 *
 * Con Revolut es un enlace: se le pasan los céntimos, la divisa y el concepto,
 * y su web abre la pantalla de enviar con las tres cosas puestas. El que paga
 * ni siquiera necesita tener Revolut —esa pantalla acepta tarjeta y Apple Pay—,
 * hace falta sólo en quien cobra.
 *
 * Con Bizum no hay enlace: vive dentro de la app de cada banco y no existe
 * ninguna forma de abrirlo desde fuera con el importe puesto. Lo más que se
 * puede hacer es dejarlo todo copiado a un toque, y eso es lo que se hace.
 *
 * En ningún caso pasa el dinero por aquí. DiviFriends abre la app del otro y
 * se aparta.
 */
export default function PagarSheet({
  a,
  cents,
  currency,
  place,
  volviendoDePagar = false,
  onEnviado,
  onAntesDeSalir,
  onClose,
}: {
  a: Participant;
  cents: number;
  currency: string;
  place: string | null;
  /** true cuando se vuelve de la web de Revolut: la hoja arranca preguntando. */
  volviendoDePagar?: boolean;
  onEnviado: (via: Via) => Promise<unknown>;
  /** Se llama antes de salir del navegador, para poder volver donde estabas. */
  onAntesDeSalir?: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [paso, setPaso] = useState<"elegir" | "bizum" | "enviado">(() =>
    volviendoDePagar ? "enviado" : a.bizum && !a.revolut ? "bizum" : "elegir",
  );
  const [via, setVia] = useState<Via>(a.bizum && !a.revolut ? "bizum" : "revolut");
  const [busy, setBusy] = useState(false);
  const nota = conceptoDe(place);

  /*
    Preguntar al volver, y no dar el pago por hecho al abrir el enlace.

    Abrir no es pagar: se abre, se ve el importe y entonces se decide pagar en
    efectivo, o falla la tarjeta, o uno se echa atrás. Marcándolo solo, al que
    adelantó la cena se le llena la lista de pagos que no existen y tiene que ir
    rechazándolos uno a uno — peor que no tener nada, porque el aviso deja de
    significar algo. Así que el enlace se abre en otra pestaña y esta hoja se
    queda con la pregunta puesta para cuando vuelva.
  */
  async function declarar(elegida: Via) {
    setBusy(true);
    await onEnviado(elegida);
    setBusy(false);
    onClose();
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex items-center gap-3">
        <Avatar name={a.name} avatar={a.avatar} color={a.color} size={40} />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold tracking-tight">
            {rellena(t.cobro.pagarA, { name: a.name })}
          </h2>
          <p className="tnum text-2xl font-bold leading-tight text-amber">
            {money(cents, currency)}
          </p>
        </div>
      </div>

      {paso === "elegir" && (
        <div className="mt-5 flex flex-col gap-2">
          {a.revolut && (
            /*
              Un botón y no un enlace, a propósito.

              `revolut.me` se reserva todos sus enlaces para su app: su fichero
              de universal links dice `["NOT /money-request/*", "*"]`, así que
              en iPhone cualquier enlace suyo que toques abre la app de Revolut
              y te saca del navegador. Y ahí se pierde justo lo que nos
              interesa, que es su página web: la que acepta tarjeta y Apple Pay
              de quien no tiene Revolut, que son casi todos.

              iOS sólo se queda el enlace cuando el gesto es tocar un <a>. Si
              la navegación la lanza el JavaScript, Safari se queda en el
              navegador, que es exactamente lo que queremos.
            */
            <button
              type="button"
              onClick={() => {
                setVia("revolut");
                setPaso("enviado");
                onAntesDeSalir?.();
                window.location.href = enlaceRevolut(a.revolut!, cents, currency, nota);
              }}
              className="flex items-center justify-center gap-2 rounded-2xl bg-amber px-10 py-3.5 text-lg font-bold text-paper transition-transform active:scale-[0.98] shadow-md shadow-amber/20"
            >
              <span>{t.cobro.conTarjeta}</span>
            </button>
          )}

          {a.bizum && (
            <button
              type="button"
              onClick={() => {
                setVia("bizum");
                setPaso("bizum");
              }}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-line bg-paper py-3.5 font-bold transition-colors active:bg-paper-3"
            >
              <span>{t.cobro.conBizum}</span>
              <MarcaBizum height={14} />
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void declarar("mano")}
            className="mt-2 rounded-xl py-3 text-sm text-ink-faint disabled:opacity-50 transition-colors hover:bg-paper-3"
          >
            {t.cobro.aMano}
          </button>

          {a.revolut && <p className="text-center text-xs text-ink-faint">{t.cobro.seAbre}</p>}
        </div>
      )}

      {paso === "bizum" && (
        <div className="mt-5">
          <p className="text-sm leading-relaxed text-ink-soft">{t.cobro.pasosBizum}</p>
          <div className="mt-3 space-y-2">
            <Copiable etiqueta={t.cobro.movil} valor={telefonoBonito(a.bizum!)} copia={a.bizum!} />
            <Copiable etiqueta={t.cobro.concepto} valor={nota} copia={nota} />
            <Copiable
              etiqueta={t.cobro.importe}
              valor={money(cents, currency)}
              copia={(cents / 100).toFixed(2)}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void declarar("bizum")}
            className="mt-4 w-full rounded-xl bg-amber py-3.5 font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {t.cobro.siEnviado}
          </button>
          <button
            type="button"
            onClick={() => setPaso("elegir")}
            className="mt-2 w-full rounded-xl py-2.5 text-sm text-ink-faint"
          >
            {t.cobro.todaviaNo}
          </button>
        </div>
      )}

      {paso === "enviado" && (
        <div className="mt-5">
          <h3 className="text-lg font-bold tracking-tight">{t.cobro.enviadoTitulo}</h3>
          <p className="mt-1 text-sm text-ink-soft">
            {rellena(t.cobro.enviadoAviso, { name: a.name })}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void declarar(via)}
            className="mt-4 w-full rounded-xl bg-amber py-3.5 font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {t.cobro.siEnviado}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-xl border border-line py-3 text-sm font-semibold text-ink-soft"
          >
            {t.cobro.todaviaNo}
          </button>
        </div>
      )}
    </Sheet>
  );
}

/** Un dato con su botón de copiar, que es lo único que se puede hacer por Bizum. */
function Copiable({
  etiqueta,
  valor,
  copia,
}: {
  etiqueta: string;
  valor: string;
  copia: string;
}) {
  const t = useT();
  const [copiado, setCopiado] = useState(false);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-paper px-3.5 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="stamp block text-ink-faint">{etiqueta}</span>
        <span className="tnum block truncate font-semibold">{valor}</span>
      </span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(copia);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1800);
          } catch {
            // Sin portapapeles queda seleccionar a mano, que es lo de siempre.
          }
        }}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
          copiado ? "text-mint" : "border border-line text-ink-soft active:bg-paper-3"
        }`}
      >
        {copiado ? t.cobro.copiado : t.cobro.copiar}
      </button>
    </div>
  );
}
