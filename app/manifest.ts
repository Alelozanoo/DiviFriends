import type { MetadataRoute } from "next";

/**
 * Esto se usa de verdad: la comanda se abre en la mesa y se vuelve a ella un
 * rato después, así que mucha gente la acaba guardando en la pantalla de
 * inicio. Con el manifiesto se abre a pantalla completa y con su icono en vez
 * de dentro del navegador.
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
      { src: "/icono-512.png", sizes: "512x512", type: "image/png" },
      // `maskable` deja que Android recorte el icono a la forma del sistema
      // sin comerse el dibujo.
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
