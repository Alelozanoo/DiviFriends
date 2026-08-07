import Image from "next/image";

/**
 * El logo de la marca. Se sirve desde el PNG de 512 y Next lo redimensiona al
 * tamaño exacto en el que se pinta, así que en una cabecera de 32 px pesa un
 * par de kilobytes. El SVG original está en public/logo.svg, pero son 208 KB
 * de ilustración trazada: a este tamaño no se distingue y no compensa.
 */
export default function Logo({ size = 32, priority = false }: { size?: number; priority?: boolean }) {
  return (
    <Image
      src="/icono-512.png"
      alt=""
      width={size}
      height={size}
      priority={priority}
      className="rounded-lg"
    />
  );
}
