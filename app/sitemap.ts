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
    {
      // La privacidad sí se indexa: quien la busca la busca en Google.
      url: `${SITIO}/privacidad`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      // El aviso legal, por lo mismo: la ley pide que se encuentre sin buscar.
      url: `${SITIO}/aviso-legal`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      // Los términos de la cuenta, que se aceptan al registrarse.
      url: `${SITIO}/terminos`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
