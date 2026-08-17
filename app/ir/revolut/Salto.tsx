"use client";

import { useEffect } from "react";

/**
 * El salto a Revolut, hecho sin que nadie toque nada.
 *
 * iOS sólo se lleva un enlace a la app de Revolut cuando el enlace se *activa*:
 * un toque, o una navegación por JavaScript lanzada desde ese toque. Lo que no
 * cuenta como activación es que una página cargue y se vaya sola a otro sitio,
 * porque no hay gesto de por medio — igual que cuando pegas la URL en la barra
 * de direcciones y te sale la web.
 *
 * Así que lo que se toca es un enlace a nuestro propio dominio, donde no hay
 * ninguna app a la que saltar, y desde aquí la URL de Revolut entra en el
 * navegador sola. Que es exactamente lo que queremos: su web acepta Apple Pay y
 * tarjeta de un toque, mientras que la app, si no tienes saldo, te obliga a
 * recargar antes de poder enviar nada.
 *
 * El retardo mínimo es a propósito: separa esta navegación del gesto que trajo
 * a la página, que es la condición de la que depende todo esto.
 */
export default function Salto({ destino }: { destino: string }) {
  useEffect(() => {
    const id = window.setTimeout(() => {
      // `replace` y no `href`: al volver de pagar, el botón de atrás debe
      // devolverte a la comanda y no a esta pantalla de paso.
      window.location.replace(destino);
    }, 80);
    return () => window.clearTimeout(id);
  }, [destino]);

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-5 px-[var(--gutter)] py-20 text-center">
      <span
        aria-hidden
        className="grid h-14 w-14 animate-pulse place-items-center rounded-2xl bg-amber text-paper"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h13M13 6.5 18.5 12 13 17.5" />
        </svg>
      </span>

      <p className="text-[21px] font-bold leading-tight tracking-[-0.025em]" aria-live="polite">
        Abriendo Revolut…
      </p>

      {/*
        Si el salto no llega a ocurrir —JavaScript desactivado, un navegador
        raro— queda la puerta a mano. Tocarla sí es un gesto y puede abrir la
        app, pero eso es exactamente lo que pasaba antes: en el peor caso nos
        quedamos como estábamos, nunca peor.
      */}
      <a
        href={destino}
        className="min-h-[46px] rounded-xl border border-line px-5 py-3 text-[15px] font-semibold text-ink-soft transition-colors active:bg-paper-3"
      >
        Continuar
      </a>
    </main>
  );
}
