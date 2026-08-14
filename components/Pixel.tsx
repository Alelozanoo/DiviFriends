"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EVENTO, leer } from "@/lib/consent";
import { PIXEL_ID, vaciarCola } from "@/lib/track";

/**
 * El código base de Meta. Si no hay píxel configurado no pinta nada, y ni
 * siquiera se descarga el script de Facebook.
 *
 * `afterInteractive`: la portada tiene que pintar y dejar subir la foto antes
 * que cualquier medición.
 */
/**
 * Páginas donde el píxel no entra.
 *
 * `/metricas` lleva la llave pegada en la URL, y el píxel manda a Meta la
 * dirección entera de la página en la que se dispara: cargarlo ahí sería
 * regalarle la contraseña a Facebook.
 */
const PROHIBIDO = ["/metricas"];

export default function Pixel() {
  const pathname = usePathname();
  const primera = useRef(true);
  const fuera = PROHIBIDO.some((ruta) => pathname.startsWith(ruta));
  // Empieza en `false` también en el navegador: hasta que no se lee la
  // respuesta guardada no se carga nada de Facebook.
  const [permiso, setPermiso] = useState(false);

  useEffect(() => {
    const mirar = () => setPermiso(leer() === "si");
    mirar();
    window.addEventListener(EVENTO, mirar);
    return () => window.removeEventListener(EVENTO, mirar);
  }, []);

  /*
    Suelta los eventos que se dispararon antes de que existiera `fbq`.

    Se espera mirando, y no con el `onReady` de `next/script`, porque con un
    script en línea ese callback no llega a dispararse: se probó y «abre mesa»
    seguía perdiéndose. El snippet define `fbq` en cuanto se ejecuta, así que
    basta con mirar en cada fotograma hasta que aparezca.
  */
  useEffect(() => {
    if (!PIXEL_ID || fuera || !permiso) return;
    let cancelado = false;
    const mirar = () => {
      if (cancelado) return;
      if (window.fbq) vaciarCola();
      else requestAnimationFrame(mirar);
    };
    mirar();
    return () => {
      cancelado = true;
    };
  }, [fuera, permiso]);

  useEffect(() => {
    if (!PIXEL_ID || fuera || !permiso) return;
    // El código base ya manda el primer PageView. Los siguientes son
    // navegaciones del router —de la portada a la comanda—, que no recargan
    // la página y por tanto no lo disparan solas.
    if (primera.current) {
      primera.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname, fuera, permiso]);

  if (!PIXEL_ID || fuera || !permiso) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');
fbq('track','PageView');`}
    </Script>
  );
}
