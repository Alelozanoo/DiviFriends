"use client";

import Link from "next/link";
import { useT } from "@/lib/i18n";

import { useCallback, useEffect, useState } from "react";
import { initials } from "@/lib/format";

export function Avatar({
  name,
  avatar,
  color,
  size = 28,
  dimmed = false,
}: {
  name: string;
  avatar?: string;
  color: string;
  size?: number;
  dimmed?: boolean;
}) {
  return (
    <span
      title={name}
      style={{
        width: size,
        height: size,
        background: dimmed ? "transparent" : color,
        borderColor: color,
        color: dimmed ? color : "#14100d",
        /* Con suelo en 11 px: la inicial de un avatar de 25 salía a 10 y se
           quedaba por debajo del mínimo legible en un móvil. Sube de 0,4 a
           0,52 porque desde que es una sola letra hay sitio de sobra, y una
           letra grande dentro del círculo se lee como una marca y no como un
           hueco por rellenar. */
        fontSize: Math.max(12, Math.round(size * 0.52)),
      }}
      /* La letra va en la tipografía de las cifras —la máquina de escribir— y
         no en la de los títulos: sobre el color plano del círculo, una capital
         de Courier parece un sello, que es de lo que va la casa. */
      className="font-mono grid shrink-0 place-items-center rounded-full border-2 font-bold leading-none overflow-hidden relative"
    >
      {avatar ? (
        avatar.startsWith("data:image/") ? (
          /* La foto ya viene recortada a 150 px y metida en la propia cadena,
             así que no hay nada que `next/image` pueda optimizar: no existe
             ninguna URL que pedir. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt={name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span className="leading-none z-10" style={{ fontSize: size * 0.55 }}>{avatar}</span>
        )
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "good" | "warn";
}) {
  const color =
    tone === "good" ? "text-mint" : tone === "warn" ? "text-clay" : "text-ink";
  return (
    <div>
   <p className="text-[12px] text-ink-faint">{label}</p>
      <p className={`tnum mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

/**
 * El panel que sube desde abajo: el gesto de toda la app en el móvil.
 *
 * El tirador de arriba no es adorno: dice que esto se cierra hacia abajo, que
 * es lo que la gente intenta hacer antes de buscar el botón de cerrar. Los
 * márgenes son los mismos de la pantalla, para que una hoja no se sienta como
 * otra aplicación distinta metida encima.
 */
export function Sheet({
  children,
  onClose,
  titulo,
  sub,
  fijo = false,
}: {
  children: React.ReactNode;
  onClose: () => void;
  /** Con título, la hoja pinta también la cabecera. */
  titulo?: string;
  sub?: React.ReactNode;
  /**
   * Una hoja que no se puede esquivar: ni el toque fuera la cierra, ni lleva
   * tirador. Se reserva para lo que de verdad no tiene alternativa —decir
   * quién eres al sentarte— porque un modal sin salida es de las cosas que
   * más molestan cuando no hace falta.
   */
  fijo?: boolean;
}) {
  useEffect(() => {
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  /*
    ¿Queda contenido por debajo del corte?

    En una ventana baja —el móvil tumbado, o el navegador del escritorio a
    media altura— la hoja no cabe entera y los últimos botones se quedan fuera
    sin que nada lo diga: parece que la hoja está mal, no que haya que bajar.
    El degradado sólo sale cuando de verdad hay más.
  */
  const [hayMas, setHayMas] = useState(false);
  /* Se vuelve a medir cuando la hoja cambia de alto —una hoja de dos pasos, un
     botón que aparece— y no sólo al abrirla, o el degradado se queda mintiendo. */
  const mide = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const calcula = () => setHayMas(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    calcula();
    const observador = new ResizeObserver(calcula);
    observador.observe(el);
    for (const hijo of el.children) observador.observe(hijo);
    // React 19 llama a lo que devuelve el ref cuando el nodo se va.
    return () => observador.disconnect();
  }, []);

  return (
    /*
      El fondo va oscuro y desenfocado, no sólo oscuro.

      Sobre una app que ya es casi negra, un velo negro al 75 % apenas cambia
      nada: la comanda se seguía leyendo detrás y la hoja parecía un recuadro
      suelto encima en vez de algo que está delante de todo. Con el desenfoque
      la pantalla de atrás pierde el foco de golpe.
    */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0705]/85 px-[var(--gutter)] backdrop-blur-[3px]"
      onClick={fijo ? undefined : onClose}
    >
      <div className="relative w-full max-w-md" onClick={(event) => event.stopPropagation()}>
        <div
          role="dialog"
          aria-modal="true"
          ref={mide}
          onScroll={(event) => mide(event.currentTarget)}
          /*
            Borde por los cuatro lados y sombra: en una ventana ancha la hoja no
            llega a los lados, así que necesita su propio filo para no quedarse
            flotando sin bordes. `dvh` y no `vh` porque en el móvil la barra del
            navegador se mueve y con `vh` la hoja se cortaba por abajo.
          */
          /*
            Flotando en medio, siempre.

            Subían desde el borde de abajo, que es lo natural para elegir de una
            lista porque la mano ya está ahí. Pero en cuanto hay algo que
            escribir, el teclado ocupa media pantalla y empuja la hoja contra el
            borde de arriba: se rompe. Centrada no la empuja nada, y con
            `interactive-widget=resizes-content` se coloca sola en el hueco que
            queda encima del teclado.

            Redonda por los cuatro lados y algo más baja que antes: flotando, el
            borde de abajo se ve, y conviene que se vea aire.
          */
          /*
            `[&_.grid>*]:min-w-0` es lo que impide que un nombre largo rompa
            la hoja entera, y cuesta explicarlo porque el fallo no está donde
            se ve.

            Un hijo de grid, por defecto, no encoge por debajo de su
            contenido. Y `truncate` —que es lo que se usa para que un nombre
            largo acabe en puntos suspensivos— lleva `white-space: nowrap`,
            así que el ancho mínimo de ese texto es la frase entera. Juntas
            las dos cosas, un bar llamado «Restaurante Casa Pepe el de la
            Esquina de Siempre» estiraba la hoja de 358 a 521 px y echaba
            fuera de la pantalla el QR, el botón de compartir y los nombres
            de la mesa. Los puntos suspensivos no aparecían nunca, porque
            nunca hacía falta cortar: la caja se agrandaba.

            Aquí se dice, para todo lo que vive dentro de una hoja, que puede
            encoger. A partir de ahí cada elemento degrada como sepa: el que
            lleva `truncate` corta, el que no, parte en dos líneas.
          */
          className="pop max-h-[86dvh] overflow-y-auto overscroll-contain rounded-hoja border border-line bg-paper-2 px-[var(--gutter)] pb-5 pt-4 shadow-[var(--sombra-hoja)] [&_.grid>*]:min-w-0"
        >
          {titulo && (
            <h2 className="text-[21px] font-bold leading-tight tracking-[-0.025em]">{titulo}</h2>
          )}
          {sub && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-faint">{sub}</p>}
          {children}
        </div>
        {hayMas && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-paper-2 via-paper-2/85 to-transparent"
          />
        )}
      </div>
    </div>
  );
}

/** El botón de cerrar que remata todas las hojas. */
export function CerrarHoja({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[46px] w-full rounded-pieza border border-line text-[15px] font-semibold text-ink transition-colors active:bg-paper-3"
    >
      {children}
    </button>
  );
}

export function Progress({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
      <div
        className="h-full rounded-full bg-amber transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * «Al entrar aceptas los términos», debajo del botón de Google.
 *
 * Va aquí, en la caja de piezas comunes, porque tiene que salir en los tres
 * sitios donde se puede entrar —la portada, la cabecera y la puerta de una
 * mesa— y porque el día que falte en uno, ése es justo el que recoge un
 * consentimiento que no se ha pedido. Es lo que hace legítimo dar los
 * términos por aceptados al crear la cuenta: se avisa donde se pulsa.
 */
export function AvisoTerminos() {
  const t = useT();
  return (
    <p className="mt-2 px-1 text-center text-[12px] leading-relaxed text-ink-faint">
      {t.cuentaNueva.alEntrar}{" "}
      <Link href="/terminos" target="_blank" rel="noopener" className="underline underline-offset-2">
        {t.cuentaNueva.terminosEnlace}
      </Link>{" "}
      {t.varios.y}{" "}
      <Link href="/privacidad" target="_blank" rel="noopener" className="underline underline-offset-2">
        {t.cookies.privacidad}
      </Link>
      .
    </p>
  );
}
