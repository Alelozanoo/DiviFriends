import type { MetadataRoute } from "next";
import icono from "@/assets/icono-512.png";

/**
 * Esto se usa de verdad: la comanda se abre en la mesa y se vuelve a ella un
 * rato después, así que mucha gente la acaba guardando en la pantalla de
 * inicio. Con el manifiesto se abre a pantalla completa y con su icono en vez
 * de dentro del navegador.
 *
 * El icono se importa y no se sirve desde `public/`: en App Hosting
 * `public/icono-512.png` daba 404 —se vio el 3 de septiembre de 2026, al
 * fallar igual la captura de la portada— y el manifiesto llevaba tiempo
 * apuntando a un icono que no existía. Importado, Next lo empaqueta con hash
 * en `/_next/static/media/`, por el mismo camino que el JavaScript.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DiviFriends · reparte la cuenta",
    short_name: "DiviFriends",
    description:
      "Escanea el QR del ticket, marca lo que has comido y sabe al instante cuánto le debes a quien pagó.",
    start_url: "/",
    display: "standalone",
    background_color: "#14100d",
    theme_color: "#14100d",
    icons: [
      { src: icono.src, sizes: "512x512", type: "image/png" },
      // `maskable` deja que Android recorte el icono a la forma del sistema
      // sin comerse el dibujo.
      { src: icono.src, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
