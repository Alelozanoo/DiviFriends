"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Wordmark } from "@/components/Logo";
import { COOKIE, idiomaDe, inicio, type Lang } from "@/lib/i18n/config";

/**
 * La página que sale cuando la dirección no lleva a ninguna parte.
 *
 * No había ninguna, y la de serie de Next se pinta con su propio estilo: fondo
 * blanco, letra del sistema y «This page could not be found» en inglés. En una
 * app que es café oscuro de arriba abajo, eso no parece un error de la web —
 * parece que la web se ha roto.
 *
 * Se distingue a propósito de la de «esta comanda no existe», que vive en la
 * propia ruta de la comanda: aquélla sabe el código que se ha intentado abrir
 * y puede decir que quizá esté mal escrito. Ésta no sabe nada, así que no
 * inventa: dice lo que hay y ofrece la única salida que sirve siempre.
 *
 * El idioma se lee en el navegador y no con `cookies()` en el servidor, que
 * era lo natural. Y no es un capricho: este fichero se cuela en el árbol de
 * todas las rutas como respaldo, así que en cuanto pide la cookie arrastra a
 * la portada entera —y a `/en`, y a las páginas legales— fuera de la
 * generación estática. Se comprueba en la tabla de `next build`: pasaban de
 * ○ a ƒ. Un parpadeo de un idioma en una página de error vale menos que eso.
 */
/* Nadie cambia de idioma mientras mira un 404, así que no hay a qué suscribirse. */
const nadaQueEscuchar = () => () => {};
const idiomaGuardado = (): Lang =>
  idiomaDe(document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`))?.[1]);
const enElServidor = (): Lang => "es";

export default function NoEncontrada() {
  /* Igual que `misDivis` y los demás: lo que sólo existe en el navegador se lee
     con `useSyncExternalStore`, que da un valor para el HTML y otro para el
     navegador sin pasar por un efecto que repinta. */
  const lang = useSyncExternalStore(nadaQueEscuchar, idiomaGuardado, enElServidor);
  const ingles = lang === "en";

  return (
    <main
      id="contenido"
      className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-[var(--gutter)] py-20 text-center"
    >
      {/*
        El 404 escrito como el número de una mesa, que es el único sitio donde
        esta app enseña cifras grandes. Así el error se lee dentro del mismo
        idioma visual y no como una pantalla prestada de otro sitio.
      */}
      <p className="stamp text-ink-faint">Error</p>
      <p className="tnum mt-2 text-[64px] font-bold leading-none tracking-[-0.04em] text-amber">
        404
      </p>

      <div className="rule mx-auto mt-7 w-full max-w-[14rem]" />

      <h1 className="mt-7 text-[27px] font-bold leading-tight tracking-[-0.03em]">
        {ingles ? "There's nothing at this address" : "Aquí no hay nada"}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        {ingles
          ? "The link may be cut short, or the page may have moved. Bills live at an address with a six-character code."
          : "Puede que el enlace se haya cortado, o que la página ya no esté donde estaba. Las comandas viven en una dirección con un código de seis caracteres."}
      </p>

      <Link
        href={inicio(lang)}
        className="mt-8 min-h-[52px] rounded-xl bg-amber px-5 py-3.5 text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
      >
        {ingles ? "Back to the start" : "Volver al inicio"}
      </Link>

      <p className="mt-8 text-[13px] text-ink-faint">
        <Wordmark className="font-semibold" />
      </p>
    </main>
  );
}
