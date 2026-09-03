import type { MetadataRoute } from "next";
import { SLUGS } from "@/lib/plantillas";

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
    /*
      Las cuentas de los vídeos sí entran, al revés que las comandas: son
      páginas públicas, siempre las mismas, y son a donde manda el último
      fotograma de cada reel. Quien busque «la cuenta del vino» después de
      verlo tiene que encontrarla.
    */
    ...SLUGS.map((slug) => ({
      url: `${SITIO}/reparte/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
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
  ];
}
