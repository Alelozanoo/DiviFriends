"use client";

import { createContext, useContext, useEffect } from "react";
import { es, type Dict } from "./es";
import { en } from "./en";

export type Lang = "es" | "en";

const DICCIONARIOS: Record<Lang, Dict> = { es, en };

/** La cookie la lee el servidor en la comanda, que ya se pinta a demanda. */
export const COOKIE = "divi.lang";

const Ctx = createContext<{ lang: Lang; t: Dict }>({ lang: "es", t: es });

/**
 * Pone el idioma en el árbol y lo deja escrito en `<html lang>`.
 *
 * El idioma se decide fuera de aquí y llega ya resuelto: en la portada por la
 * ruta —`/` es español y `/en` inglés, las dos estáticas—, y en la comanda por
 * una cookie que lee el servidor. En ninguno de los dos casos hay un parpadeo
 * de español antes de cambiar a inglés, que es lo que pasa cuando el idioma se
 * decide después de pintar.
 */
export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  useEffect(() => {
    // `<html>` lo pinta el layout, que es común a las dos rutas y estático: la
    // única forma de que diga la verdad en /en es corregirlo aquí.
    document.documentElement.lang = lang;
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
