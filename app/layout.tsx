import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Consent from "@/components/Consent";
import Pixel from "@/components/Pixel";
import "./globals.css";

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const figure = JetBrains_Mono({
  variable: "--font-figure",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
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
