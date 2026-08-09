import type { MetadataRoute } from "next";

const SITIO = "https://divifriends.es";

/**
 * El mapa del sitio, servido en /sitemap.xml.
 *
 * ¿Hace falta con dos páginas? Google las encontraría igual siguiendo enlaces.
 * Lo que sí aporta es control: aquí se declara qué páginas existen de verdad,
 * y por descarte queda claro que las comandas (`/t/CÓDIGO`) no son contenido
 * que haya que rastrear. Además Search Console usa el sitemap para avisar de
 * errores de indexación, que es la única forma de enterarse de que algo va mal.
 *
 * Las comandas nunca entran aquí: son privadas, efímeras y cada una lleva su
 * propio `noindex`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITIO,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITIO}/nueva`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
