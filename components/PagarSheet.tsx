"use client";

import { useState } from "react";
import { conceptoDe, enlaceRevolut, telefonoBonito } from "@/lib/cobro";
import { money } from "@/lib/format";
import { useT, rellena } from "@/lib/i18n";
import type { Participant, Via } from "@/lib/types";
import { MarcaBizum } from "./marcas";
import { Avatar, CerrarHoja, Sheet } from "./ui";

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
  demo = false,
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
  /**
   * Mesa de ejemplo: aquí no se sale a ninguna parte.
   *
   * El botón de la tarjeta manda a `revolut.me`, que es una web de verdad
   * donde se cobra de verdad. En una cena inventada eso no puede pasar: sería
   * sacar a alguien de la app, a pagarle a una persona que no existe, en mitad
   * de un tutorial. Así que el mismo botón abre una pantalla simulada.
   */
  demo?: boolean;
  onEnviado: (via: Via) => Promise<unknown>;
  /** Se llama antes de salir del navegador, para poder volver donde estabas. */
  onAntesDeSalir?: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const [paso, setPaso] = useState<"elegir" | "bizum" | "tarjeta" | "enviado">(() =>
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
        <Avatar name={a.name} avatar={a.avatar} color={a.color} size={44} />
        <div className="min-w-0">
          <h2 className="truncate text-[21px] font-bold leading-tight tracking-[-0.025em]">
            {rellena(t.cobro.pagarA, { name: a.name })}
          </h2>
          <p className="tnum text-[24px] font-bold leading-none tracking-[-0.02em] text-amber">
            {money(cents, currency)}
          </p>
        </div>
      </div>

      {paso === "elegir" && (
        <div className="mt-5 grid gap-2.5">
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
                // En la mesa de ejemplo no se sale del navegador: `revolut.me`
                // es una web donde se cobra de verdad.
                if (demo) {
                  setPaso("tarjeta");
                  return;
                }
                setPaso("enviado");
                onAntesDeSalir?.();
                window.location.href = enlaceRevolut(a.revolut!, cents, currency, nota);
              }}
              className="flex min-h-[52px] items-center justify-center rounded-xl bg-amber px-5 text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
            >
              {t.cobro.conTarjeta}
            </button>
          )}

          {a.bizum && (
            <button
              type="button"
              onClick={() => {
                setVia("bizum");
                setPaso("bizum");
              }}
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-line text-[15px] font-semibold text-ink transition-colors active:bg-paper-3"
            >
              <span>{t.cobro.conBizum}</span>
              <MarcaBizum height={14} />
            </button>
          )}

          <button
            type="button"
            disabled={busy}
            onClick={() => void declarar("mano")}
            className="min-h-[46px] rounded-xl text-[13px] text-ink-faint transition-colors active:bg-paper-3 disabled:opacity-50"
          >
            {t.cobro.aMano}
          </button>

          {a.revolut && (
            <p className="text-center text-[13px] leading-relaxed text-ink-faint">
              {demo ? t.cobro.simulacionAviso : t.cobro.seAbre}
            </p>
          )}

          {/* Sin Revolut ni Bizum queda el efectivo, y conviene decir por qué
              no hay más botones en vez de dejar la hoja medio vacía. */}
          {!a.revolut && !a.bizum && (
            <p className="text-center text-[13px] leading-relaxed text-ink-faint">
              {rellena(t.cobro.sinMetodo, { name: a.name })}
            </p>
          )}
        </div>
      )}

      {paso === "bizum" && (
        <div className="mt-5 grid gap-2.5">
          {/* En la mesa de ejemplo nadie va a abrir su banco: el móvil es
              inventado y no hay a quién pagarle. Se enseña igual, porque ver
              los tres datos que hay que copiar es justo lo que se viene a
              aprender, pero con su aviso. */}
          <p className="text-[13px] leading-relaxed text-ink-soft">
            {demo ? t.cobro.bizumSimulado : t.cobro.pasosBizum}
          </p>
          <Copiable etiqueta={t.cobro.movil} valor={telefonoBonito(a.bizum!)} copia={a.bizum!} />
          <Copiable etiqueta={t.cobro.concepto} valor={nota} copia={nota} />
          <Copiable
            etiqueta={t.cobro.importe}
            valor={money(cents, currency)}
            copia={(cents / 100).toFixed(2)}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void declarar("bizum")}
            className="mt-1 min-h-[52px] rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {t.cobro.siEnviado}
          </button>
          <CerrarHoja onClick={() => setPaso("elegir")}>{t.cobro.todaviaNo}</CerrarHoja>
        </div>
      )}

      {/*
        La tarjeta de mentira.

        Enseña lo que enseñaría Revolut —a quién, cuánto y de qué— con una
        tarjeta dibujada y un botón que no cobra nada. Lo importante es que se
        vea que aquí acabaría el viaje: quien lo prueba entiende que sus amigos
        pagan sin instalar nada, que es la pregunta que hace todo el mundo.

        Con el aviso de simulación en grande y los números tachados de una
        tarjeta que no existe: 4242 es el número que usa medio mundo para
        probar pagos, justamente porque no es de nadie.
      */}
      {paso === "tarjeta" && (
        <div className="mt-5 grid gap-3">
          <div className="rounded-bloque border border-line bg-paper p-4">
            <p className="stamp text-ink-faint">{t.cobro.simulacion}</p>
            <div className="mt-2.5 rounded-caja bg-gradient-to-br from-[#2a2018] to-[#171210] p-4">
              <p className="tnum text-[15px] tracking-[0.14em] text-ink">4242 4242 4242 4242</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-[11px] uppercase tracking-wide text-ink-soft">
                  {t.cobro.titular}
                </span>
                <span className="tnum text-[12px] text-ink-soft">12/30</span>
              </div>
            </div>
            <dl className="mt-3 grid gap-1.5 text-[13px]">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">{t.cobro.paraQuien}</dt>
                <dd className="font-semibold">{a.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">{t.cobro.concepto}</dt>
                <dd className="min-w-0 truncate font-semibold">{nota}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-faint">{t.cobro.importe}</dt>
                <dd className="tnum font-bold text-amber">{money(cents, currency)}</dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void declarar("revolut")}
            className="min-h-[52px] rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {rellena(t.cobro.pagarSimulado, { dinero: money(cents, currency) })}
          </button>
          <CerrarHoja onClick={() => setPaso("elegir")}>{t.cobro.todaviaNo}</CerrarHoja>
        </div>
      )}

      {paso === "enviado" && (
        <div className="mt-5 grid gap-2.5">
          <div>
            <h3 className="text-[17px] font-bold tracking-[-0.02em]">{t.cobro.enviadoTitulo}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
              {rellena(t.cobro.enviadoAviso, { name: a.name })}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void declarar(via)}
            className="min-h-[52px] rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {t.cobro.siEnviado}
          </button>
          <CerrarHoja onClick={onClose}>{t.cobro.todaviaNo}</CerrarHoja>
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
    <div className="flex items-center gap-3 rounded-xl border border-line-soft bg-paper px-3.5 py-2.5">
      <span className="min-w-0 flex-1">
    <span className="text-[12px] block text-ink-faint">{etiqueta}</span>
        <span className="tnum mt-1 block truncate text-[15px] font-semibold">{valor}</span>
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
        className={`min-h-10 shrink-0 rounded-xl px-3.5 text-[13px] font-bold transition-colors ${
          copiado ? "text-mint" : "border border-line text-ink-soft active:bg-paper-3"
        }`}
      >
        {copiado ? t.cobro.copiado : t.cobro.copiar}
      </button>
    </div>
  );
}
