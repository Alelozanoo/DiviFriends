import Image from "next/image";

/**
 * El logo de la marca dentro de la web.
 *
 * Va sin fondo a propósito. El icono del sistema (favicon, pantalla de inicio)
 * lleva un cuadrado #121212 porque ahí hace falta, pero el papel de la app es
 * #14100d: sobre él ese cuadrado se nota y el logo se lee como una pegatina
 * pegada encima. Sin fondo, las manos y el pico del ticket rompen el círculo y
 * el dibujo forma parte de la página.
 *
 * `size` es lo que se le pide al optimizador, así que va al mayor tamaño al
 * que se vaya a pintar; el tamaño real lo manda `className`.
 */
export default function Logo({
  size = 32,
  priority = false,
  className = "",
}: {
  size?: number;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Image
      src="/logo-marca.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className={className}
    />
  );
}
