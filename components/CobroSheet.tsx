"use client";

import { useState } from "react";
import { limpiaRevolut, limpiaTelefono } from "@/lib/cobro";
import { useT } from "@/lib/i18n";
import { MarcaBizum, MarcaRevolut } from "./marcas";
import { Sheet } from "./ui";

/**
 * Cómo quieres que te devuelvan lo tuyo.
 *
 * Cuelga de la persona, no del papel de «el que pagó»: con dos tickets puede
 * haber dos cobrando a la vez, y así cada uno pone el suyo y nadie puede tocar
 * el de otro. Ésa es la respuesta entera a quién tiene permiso para esto.
 *
 * Nada es obligatorio. Un formulario que bloquea antes de haber enseñado nada
 * pierde a la gente en el primer paso, y sin el que pagó no hay comanda; se
 * vuelve a ofrecer solo en cuanto alguien le deba dinero, que es cuando le
 * interesa de verdad.
 */
export function CobroSheet({
  revolut,
  bizum,
  onSave,
  onClose,
}: {
  revolut?: string;
  bizum?: string;
  onSave: (datos: { revolut: string | null; bizum: string | null }) => Promise<unknown>;
  onClose: () => void;
}) {
  const t = useT();
  return (
    <Sheet onClose={onClose}>
      <h2 className="text-[21px] font-bold leading-tight tracking-[-0.025em]">{t.cobro.comoTitulo}</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{t.cobro.comoAviso}</p>
      <FormaDeCobro revolut={revolut} bizum={bizum} onSave={onSave} onClose={onClose} />
    </Sheet>
  );
}

/**
 * «¿Pagaste tú toda la cuenta?», y si sí, cómo quieres cobrar.
 *
 * La palabra «entera» no está de adorno: sin ella la pregunta se lee como
 * «¿has pagado ya tu parte?», que es lo contrario. Y no se dice «la tarjeta»
 * porque deja fuera a quien lo puso en efectivo.
 *
 * Sólo aparece cuando todavía no hay nadie marcado. Si ya lo está, preguntarle
 * a cada uno que entra sólo consigue que alguien se marque sin querer.
 */
export function PagadorSheet({
  revolut,
  bizum,
  onPagueYo,
  onSave,
  onClose,
}: {
  revolut?: string;
  bizum?: string;
  onPagueYo: () => Promise<unknown>;
  onSave: (datos: { revolut: string | null; bizum: string | null }) => Promise<unknown>;
  onClose: () => void;
}) {
  const t = useT();
  const [paso, setPaso] = useState<"pregunta" | "cobro">("pregunta");
  const [busy, setBusy] = useState(false);

  return (
    <Sheet onClose={onClose}>
      {paso === "pregunta" ? (
        <>
          <h2 className="text-[21px] font-bold leading-tight tracking-[-0.025em]">{t.cobro.pagasteTitulo}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{t.cobro.pagasteAviso}</p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await onPagueYo();
                
                if (revolut || bizum) {
                  await onSave({ revolut: revolut || null, bizum: bizum || null });
                  setBusy(false);
                  onClose();
                } else {
                  setBusy(false);
                  setPaso("cobro");
                }
              }}
              className="min-h-[52px] rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {t.cobro.pagueYo}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[46px] rounded-xl border border-line text-[15px] font-semibold text-ink transition-colors active:bg-paper-3"
            >
              {t.cobro.pagoOtro}
            </button>
          </div>
        </>
      ) : (
        <>
          <h2 className="text-[21px] font-bold leading-tight tracking-[-0.025em]">{t.cobro.comoTitulo}</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{t.cobro.comoAviso}</p>
          <FormaDeCobro revolut={revolut} bizum={bizum} onSave={onSave} onClose={onClose} />
        </>
      )}
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */

function FormaDeCobro({
  revolut = "",
  bizum = "",
  onSave,
  onClose,
}: {
  revolut?: string;
  bizum?: string;
  onSave: (datos: { revolut: string | null; bizum: string | null }) => Promise<unknown>;
  onClose: () => void;
}) {
  const t = useT();
  const [rev, setRev] = useState(revolut);
  const [biz, setBiz] = useState(bizum);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function guardar() {
    // Se valida aquí y otra vez en el servidor. Un usuario mal escrito no da un
    // error: da un botón de pagar que lleva a una página vacía, y quien lo
    // pulsa se cree que la culpa es suya.
    const limpioRev = rev.trim() ? limpiaRevolut(rev) : null;
    const limpioBiz = biz.trim() ? limpiaTelefono(biz) : null;
    if (rev.trim() && !limpioRev) return setError(t.cobro.malRevolut);
    if (biz.trim() && !limpioBiz) return setError(t.cobro.malBizum);
    if (!limpioRev && !limpioBiz) return setError(t.cobro.algunoAlMenos);

    setError(null);
    setBusy(true);
    await onSave({ revolut: limpioRev, bizum: limpioBiz });
    setBusy(false);
    onClose();
  }

  return (
    <div className="mt-5">
      <label className="block">
    <span className="text-[12px] flex items-center gap-1.5 text-ink-faint">
          <MarcaRevolut height={11} />
          <span>{t.cobro.tuRevolut}</span>
        </span>
        <span className="mt-1.5 flex items-center overflow-hidden rounded-xl border border-line bg-paper focus-within:border-amber">
          <span className="shrink-0 pl-3 text-[15px] text-ink-faint">revolut.me/</span>
          <input
            value={rev}
            onChange={(event) => setRev(event.target.value)}
            placeholder={t.cobro.ejemploRevolut}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={40}
            className="min-w-0 flex-1 bg-transparent py-3 pl-0.5 pr-3 focus:outline-none"
          />
        </span>
      </label>

      <label className="mt-4 block">
    <span className="text-[12px] flex items-center gap-1.5 text-ink-faint">
          <MarcaBizum height={11} />
          <span>{t.cobro.tuBizum}</span>
        </span>
        <input
          value={biz}
          onChange={(event) => setBiz(event.target.value)}
          inputMode="tel"
          autoComplete="tel"
          placeholder="600 11 22 33"
          maxLength={20}
          className="tnum mt-1.5 w-full rounded-xl border border-line bg-paper px-3 py-3 focus:border-amber focus:outline-none"
        />
      </label>

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-clay/40 bg-clay/10 px-3 py-2 text-[15px] text-clay">
          {error}
        </p>
      )}

      {/* Va en un documento que ve cualquiera con el código de la mesa. Es la
          mesa y no el mundo, pero el móvil es el móvil y hay que decirlo. */}
      <p className="mt-3 text-[13px] leading-relaxed text-ink-faint">{t.cobro.avisoCompartido}</p>

      <button
        type="button"
        onClick={guardar}
        disabled={busy}
        className="mt-4 w-full min-h-[52px] rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {t.cobro.guardar}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-xl py-2.5 text-[15px] text-ink-faint"
      >
        {t.cobro.ahoraNo}
      </button>
    </div>
  );
}
