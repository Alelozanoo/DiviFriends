"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EVENTO, guardar, leer, olvidar } from "@/lib/consent";
import { PIXEL_ID } from "@/lib/track";
import { useT } from "@/lib/i18n";

/**
 * El cartel de la cookie.
 *
 * Reglas que no son de diseño sino de ley: «Rechazar» tiene que costar lo
 * mismo que «Aceptar» —mismo tamaño, mismo sitio, un solo toque— y hay que
 * poder cambiar de idea después, que para eso está el enlace del pie.
 *
 * Si no hay píxel configurado no hay cookie que aceptar, así que el cartel ni
 * aparece: sin `NEXT_PUBLIC_META_PIXEL_ID` esta web no pone ninguna.
 */
export default function Consent() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!PIXEL_ID) return;
    setAbierto(leer() === null);
    const alCambiar = () => setAbierto(leer() === null);
    window.addEventListener(EVENTO, alCambiar);
    return () => window.removeEventListener(EVENTO, alCambiar);
  }, []);

  const t = useT();

  if (!PIXEL_ID || !abierto) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookies"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 rounded-2xl border border-line bg-paper-2 p-4 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
        <p className="text-sm leading-relaxed text-ink-soft">
          {t.consent.aviso} <span className="text-ink">{t.consent.igualSiNo}</span>{" "}
          <Link href="/cookies" className="text-amber underline underline-offset-2">
            {t.consent.queGuarda}
          </Link>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => guardar("no")}
            className="flex-1 rounded-xl border border-line px-4 py-3 text-sm font-bold text-ink-soft transition-colors active:bg-paper-3"
          >
            {t.consent.no}
          </button>
          <button
            type="button"
            onClick={() => guardar("si")}
            className="flex-1 rounded-xl bg-amber px-4 py-3 text-sm font-bold text-paper transition-transform active:scale-[0.98]"
          >
            {t.consent.si}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * El enlace del pie para cambiar de idea. Sin píxel configurado tampoco
 * aparece: no hay nada que revocar.
 */
export function CambiarCookies({ className }: { className?: string }) {
  const [hay, setHay] = useState(false);

  useEffect(() => {
    setHay(Boolean(PIXEL_ID));
  }, []);

  if (!hay) return null;

  return (
    <button type="button" onClick={olvidar} className={className}>
      Cookies
    </button>
  );
}
