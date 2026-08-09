import type { MetadataRoute } from "next";

/**
 * Servido en /robots.txt.
 *
 * `/t/` fuera por privacidad: son cuentas de gente real que se abren con sólo
 * tener el código. La etiqueta `noindex` de cada comanda ya lo cubre, pero esto
 * evita además el gasto de que un rastreador se pasee por miles de ellas
 * despertando instancias y leyendo Firestore.
 *
 * `/api/` fuera porque no es contenido, y en el caso de crear comandas cada
 * visita costaría dinero de verdad.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/t/"],
    },
    sitemap: "https://divifriends.es/sitemap.xml",
  };
}
