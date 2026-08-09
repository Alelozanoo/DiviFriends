import Image from "next/image";

/**
 * El nombre escrito, con las dos mitades en distinto color.
 *
 * «Divi» en el color del texto y «Friends» en ámbar: separa las dos palabras
 * sin meter un espacio ni una mayúscula rara, y hace que el nombre se lea como
 * una marca y no como una palabra cualquiera de la frase.
 *
 * Vive aquí, junto al símbolo, y en un solo sitio: escrito a mano en cada
 * pantalla acabaría con la mitad de los sitios sin actualizar el día que
 * cambie el color.
 */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-ink">Divi</span>
      <span className="text-amber">Friends</span>
    </span>
  );
}

/**
 * El logo de la marca dentro de la web.
 *
 * Va sin fondo a propósito. El icono de iOS lleva un cuadrado oscuro porque el
 * sistema no admite transparencia —la pintaría de negro—, pero el papel de la
 * app es #14100d: sobre él ese cuadrado se nota y el logo se lee como una
 * pegatina. Sin fondo, el borde roto de las dos mitades del ticket recorta
 * contra la página y el dibujo forma parte de ella.
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
