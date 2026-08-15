"use client";

import { createContext, useContext, useEffect } from "react";
import { es, type Dict } from "./es";
import { en } from "./en";

import { COOKIE, type Lang } from "./config";

export { COOKIE };
export type { Lang };

const DICCIONARIOS: Record<Lang, Dict> = { es, en };

const Ctx = createContext<{ lang: Lang; t: Dict }>({ lang: "es", t: es });

/**
 * Pone el idioma en el árbol, lo deja escrito en `<html lang>` y lo recuerda.
 *
 * El idioma se decide fuera de aquí y llega ya resuelto, pero por dos caminos
 * distintos: en la portada lo dice la ruta —`/` es español y `/en` inglés, las
 * dos estáticas— y en la comanda lo dice la cookie, que lee el servidor. Así
 * ninguna de las dos parpadea en español antes de cambiar a inglés.
 *
 * Dos caminos es justo lo que hay que vigilar: si se separan, la portada sale
 * en un idioma y la comanda en otro. Pasaba, y encima sin salida — la portada
 * en `/` se creía en español, el selector marcaba ES, y pulsar ES no hacía nada
 * porque ya se creía ahí. Se quedaba uno en inglés para siempre.
 *
 * Por eso la cookie se escribe aquí: lo que estás viendo manda sobre lo que
 * dijera antes. En las páginas que salen de la cookie es escribir lo mismo que
 * ya ponía, y en la portada la corrige.
 */
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  useEffect(() => {
    // `<html>` lo pinta el layout, que es común a las dos rutas y estático: la
    // única forma de que diga la verdad en /en es corregirlo aquí.
    document.documentElement.lang = lang;
    guardarIdioma(lang);
  }, [lang]);

  return <Ctx.Provider value={{ lang, t: DICCIONARIOS[lang] }}>{children}</Ctx.Provider>;
}

/** El texto. */
export function useT(): Dict {
  return useContext(Ctx).t;
}

export function useLang(): Lang {
  return useContext(Ctx).lang;
}

/**
 * Cambia el idioma de la app y lo recuerda.
 *
 * Un año de cookie: quien la cambia una vez no quiere que se le olvide, y no
 * lleva ningún dato personal — es una letra. Por eso tampoco pasa por el
 * consentimiento: guardar la preferencia que acabas de pedir es justo lo que
 * la ley llama estrictamente necesario.
 */
export function guardarIdioma(lang: Lang): void {
  document.cookie = `${COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Qué idioma le toca a alguien que llega sin haber elegido.
 *
 * Español salvo que el navegador diga otra cosa. Quien recibe el enlace de una
 * mesa desde otro país no tiene por qué encontrarse una pantalla en un idioma
 * que no lee, y quien tiene el móvil en inglés viviendo aquí puede cambiarlo
 * de un toque.
 */
export function idiomaDelNavegador(): Lang {
  if (typeof navigator === "undefined") return "es";
  return navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";
}

/** Mete los valores en una frase con huecos: `{n}`, `{dinero}`… */
export function rellena(plantilla: string, valores: Record<string, string | number>): string {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave: string) =>
    clave in valores ? String(valores[clave]) : `{${clave}}`,
  );
}
