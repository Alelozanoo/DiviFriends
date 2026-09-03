import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad.
 *
 * No había ninguna. Ninguna de estas arregla un agujero concreto de esta app
 * —las escrituras ya pasan todas por el servidor y las reglas de Firestore
 * prohíben tocar nada desde el navegador—, pero son el suelo que se le supone a
 * cualquier web y cuestan una línea cada una.
 *
 * Aquí no hay Content-Security-Policy completa a propósito: la app carga
 * Firestore, tipografías y estilos en línea, y una política escrita a ojo se
 * cae el día que Firebase cambie un dominio. Lo que sí va es `frame-ancestors`,
 * que es la parte que de verdad protege y no puede romper nada.
 */
const SEGURAS = [
  // Que nadie pueda meter una comanda dentro de un iframe suyo y engañar a la
  // mesa: el clásico truco de poner botones invisibles encima de los de verdad.
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  // Un fichero servido como texto se queda en texto, aunque el navegador crea
  // que ha olido otra cosa.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Sólo el dominio, nunca la ruta. Importa de verdad en /metricas, donde la
  // llave viaja en la propia URL.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Un año de HTTPS obligatorio: el enlace de una comanda se pega en WhatsApp y
  // se abre en redes ajenas.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  // El Admin SDK usa binarios nativos de gRPC: no debe pasar por el bundler.
  serverExternalPackages: ["firebase-admin"],

  headers() {
    return Promise.resolve([
      { source: "/:path*", headers: SEGURAS },
      {
        // La llave de las métricas va en la URL, así que de esta página no sale
        // ni el dominio.
        source: "/metricas",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
      {
        // El manejador de Google mete un iframe suyo dentro de la propia
        // portada para cerrar la entrada. Con `frame-ancestors 'none'` de
        // arriba no podría ni siendo del mismo dominio: aquí, y sólo aquí,
        // se permite el mismo origen. Va la última porque la última manda.
        source: "/__/auth/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ]);
  },

  /**
   * La entrada con Google, servida desde nuestro dominio.
   *
   * Firebase atiende la ventana de Google en `<proyecto>.firebaseapp.com`, y
   * eso es lo que Google enseña en la ventana: «Ir a
   * divifriends-2964.firebaseapp.com». Con esto, `/__/auth/*` de divifriends.es
   * se sirve desde ahí sin que el navegador lo sepa, y en cuanto la
   * configuración pública diga `authDomain: divifriends.es` la ventana dirá
   * «Ir a divifriends.es». De paso Safari deja de partir la entrada, porque
   * ya no hay un dominio ajeno guardando cosas en medio.
   *
   * El cambio de `authDomain` no va aquí a propósito: antes hay que dar de
   * alta `https://divifriends.es/__/auth/handler` en el cliente OAuth de la
   * consola de Google, y hacerlo al revés deja a todo el mundo sin entrar.
   * Hasta entonces esta ruta no la pisa nadie.
   */
  rewrites() {
    return Promise.resolve([
      {
        source: "/__/auth/:path*",
        destination: "https://divifriends-2964.firebaseapp.com/__/auth/:path*",
      },
    ]);
  },
};

export default nextConfig;
