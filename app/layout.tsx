import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: {
    default: "DiviFriends Reparte la cuenta escaneando el ticket",
    // Lo que ponga cada página, y detrás la marca. Sin esto la pestaña de la
    // comanda decía sólo el nombre del bar y no se sabía de qué app era.
    template: "%s · DiviFriends",
  },
  description:
    "Escanea el QR del ticket, marca lo que has comido y sabe al instante cuánto le debes a quien pagó.",
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
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
