"use client";

import { useRouter } from "next/navigation";
import { guardarIdioma, useLang, type Lang } from "@/lib/i18n";

/**
 * Cambiar de idioma, en dos letras.
 *
 * Guarda la elección en una cookie y recarga: la comanda se pinta en el
 * servidor, así que el idioma tiene que llegar antes que el HTML o habría un
 * parpadeo en español. En la portada, además, salta entre `/` y `/en`, que son
 * dos páginas estáticas distintas.
 *
 * Sin banderas. Una bandera dice país y no idioma, y aquí sobra la discusión de
 * cuál le toca al inglés.
 */
export default function LangSwitch({ enPortada = false }: { enPortada?: boolean }) {
  const lang = useLang();
  const router = useRouter();

  function cambiar(nuevo: Lang) {
    // La cookie se escribe siempre, incluso al pulsar el idioma que ya está
    // marcado. Salir antes de escribirla dejaba el botón muerto justo en el
    // caso en que hacía falta: con la portada en español y la cookie en inglés,
    // pulsar ES no hacía nada y no había manera de volver.
    guardarIdioma(nuevo);
    if (nuevo === lang) return;
    if (enPortada) router.push(nuevo === "es" ? "/" : "/en");
    else router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      {(["es", "en"] as const).map((codigo) => (
        <button
          key={codigo}
          type="button"
          onClick={() => cambiar(codigo)}
          aria-current={codigo === lang}
          lang={codigo}
          className="uppercase tracking-wider transition-colors"
        >
          {/*
            El color y la negrita van en un <span> y no en el <button>.

            `globals.css` le da a todo botón `font: inherit; color: inherit`
            fuera de las capas de Tailwind, así que gana siempre y se comía el
            ámbar: los dos idiomas salían del mismo color y no se veía cuál
            estaba puesto. Dentro de un span no le afecta, que es como lo
            resuelve el resto de la app.
          */}
          <span
            className={
              codigo === lang ? "font-bold text-amber" : "text-ink-faint hover:text-ink"
            }
          >
            {codigo}
          </span>
        </button>
      ))}
    </span>
  );
}
