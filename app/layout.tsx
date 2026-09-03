import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Courier_Prime } from "next/font/google";
import Consent from "@/components/Consent";
import Pixel from "@/components/Pixel";
import "./globals.css";

/*
  Las dos letras de la casa, cambiadas el 2 de septiembre de 2026.

  Antes eran Space Grotesk y JetBrains Mono, y ese par es el ajuste de fábrica
  de las webs generadas: quien haya visto diez landings salidas de una IA
  reconoce la «a», la «y» y la «G» de Space Grotesk sin proponérselo. JetBrains
  Mono además estaba mal elegida dos veces, porque es una letra de editor de
  código y aquí lo que se imita es una impresora de comandas.

  Bricolage Grotesque tiene carácter propio sin salirse de la familia de las
  grotescas, así que la comanda sigue leyéndose igual de rápido. Courier Prime
  es una máquina de escribir de verdad: las cifras del ticket dejan de parecer
  una terminal y pasan a parecer papel.
*/
const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

/*
  Courier Prime sólo trae redonda y negrita. JetBrains Mono traía además la
  media, así que cualquier `font-medium` que hubiera caído sobre una cifra
  ahora se redondea a la redonda en vez de sintetizarse: mejor así, porque una
  negrita falsa en una columna de importes se nota en cuanto hay dos seguidas.
*/
const figure = Courier_Prime({
  variable: "--font-figure",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const DESCRIPCION =
  "Haz una foto del ticket, marca lo que has comido y sabe al instante a quién le debes cuánto. Varios tickets, varios pagadores, una sola cuenta.";

export const metadata: Metadata = {
  // Sin esto, las rutas de `openGraph` y del sitemap salen relativas y ni
  // WhatsApp ni Google saben resolverlas: la vista previa se queda sin imagen.
  metadataBase: new URL("https://divifriends.es"),
  title: {
    default: "DiviFriends Reparte la cuenta escaneando el ticket",
    // Lo que ponga cada página, y detrás la marca. Sin esto la pestaña de la
    // comanda decía sólo el nombre del bar y no se sabía de qué app era.
    template: "%s · DiviFriends",
  },
  description: DESCRIPCION,
  applicationName: "DiviFriends",
  // La imagen la coge sola de `app/opengraph-image.png`. Antes no había ninguna
  // etiqueta og:, así que cada sitio elegía la imagen que le parecía —normalmente
  // el favicon— y la vista previa salía con lo primero que encontraba.
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "DiviFriends",
    url: "https://divifriends.es",
    title: "Reparte la cuenta escaneando el ticket",
    description: DESCRIPCION,
  },
  twitter: {
    // Sin esto la vista previa sale como una miniatura cuadrada diminuta.
    card: "summary_large_image",
    title: "Reparte la cuenta escaneando el ticket",
    description: DESCRIPCION,
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#14100d",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  /*
    Que al abrirse el teclado encoja la pantalla en vez de empujarla.

    Por defecto el móvil deja la página del mismo tamaño y la desplaza hacia
    arriba para que se vea el campo: la pantalla entera se mueve sola y parece
    que algo se ha descolocado. Con esto, lo que queda a la vista es la pantalla
    de verdad, así que una hoja centrada se centra en el hueco que queda encima
    del teclado y se queda quieta.

  */
  interactiveWidget: "resizes-content",

  /*
    Sin zoom. Decisión de producto, tomada a sabiendas.

    Esto **no** es lo que evita que iOS amplíe solo al tocar un campo —eso ya
    está resuelto por el suelo de 16 px de `globals.css`, y es lo que de verdad
    molestaba—. Esto es otra cosa: quitar el pellizco.

    El coste está en que quien amplía para leer, normalmente porque ve poco, deja
    de poder hacerlo. A cambio, en una app que se usa de pie en un bar y se toca
    con una sola mano, un pellizco accidental deja la pantalla torcida y no hay
    forma evidente de deshacerlo.

    Y un aviso para quien lo lea dentro de un año: en el iPhone esto casi no
    hace nada. Safari ignora `user-scalable=no` desde iOS 10 a propósito, así
    que el pellizco sigue ahí. Donde se nota es en Android.
  */
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${display.variable} ${figure.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/*
          Lo primero que encuentra el tabulador.

          Fuera de la portada, encima del contenido hay una cabecera con menú,
          cambio de idioma y pestañas de tickets: quien navega con el teclado
          los recorría todos cada vez que cambiaba de pantalla antes de llegar
          a la comanda. El enlace no se ve hasta que recibe el foco, y entonces
          baja desde el borde de arriba.
        */}
        <a href="#contenido" className="saltar">
          {/* Las dos etiquetas van escritas, y el idioma de `<html>` esconde la
              que sobra. Es la única manera de que la portada inglesa no diga
              «Ir al contenido»: este enlace tiene que ser lo primero que toca
              el tabulador, así que vive en el layout, que es común a las dos. */}
          <span data-es>Ir al contenido</span>
          <span data-en>Skip to content</span>
        </a>
        {children}
        <Pixel />
        <Consent />
      </body>
    </html>
  );
}
