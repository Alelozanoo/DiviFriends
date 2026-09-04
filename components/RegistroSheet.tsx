"use client";

import { useEffect, useState } from "react";
import { EVENTO, leer } from "@/lib/consent";
import { CLAVE_REGISTRO, useCuenta } from "@/lib/cuenta";
import { useT } from "@/lib/i18n";
import { PIXEL_ID } from "@/lib/track";
import { G } from "./CuentaBoton";
import { Sheet } from "./ui";

/** Dónde se apunta en este móvil que ya se ofreció, y cuándo. Cerrar la sesión también lo apunta. */
const CLAVE = CLAVE_REGISTRO;

/**
 * Lo que tarda en volver a salir después de «Ahora no».
 *
 * Cada visita sería insistir, y nunca sería rendirse: una semana deja pasar
 * la cena de este sábado y vuelve a preguntar a la siguiente, que es cuando
 * ya se sabe si la web sirvió de algo.
 */
const DESCANSO_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * La hoja que sale al entrar en la portada sin sesión: «Continuar con Google»
 * o «Ahora no».
 *
 * Antes la entrada con Google era un botón pequeño en la esquina, a propósito
 * opcional, y casi nadie lo tocaba. Se pidió el 3 de septiembre de 2026 que la
 * portada la empuje: quien llega sin cuenta ve primero esto, y la portada de
 * siempre debajo, intacta.
 *
 * Tres cosas que no hace:
 *
 * - No sale hasta que Firebase ha decidido si hay alguien. Con sesión no tiene
 *   sentido, y pintarla y quitarla medio segundo después es un parpadeo.
 * - No se pone encima del cartel de las cookies. Dos avisos a la vez es la
 *   forma más segura de que se cierren los dos sin leerlos: espera a que el
 *   de las cookies esté contestado y entonces sale.
 * - No vuelve en una semana si dices que no. Tocar fuera cuenta como decir
 *   que no: es lo que hace la gente para quitarse algo de encima.
 *
 * Si entrar falla, se aparta: la hoja del fallo la abre `CuentaBoton`, que es
 * quien sabe explicarlo, y aquí no hay sitio para dos hojas.
 */
export default function RegistroSheet() {
  const t = useT();
  const { usuario, entrar, ocupado, fallo } = useCuenta();
  const [lista, setLista] = useState(false);
  const [cerrada, setCerrada] = useState(false);

  useEffect(() => {
    const mira = () => {
      setLista(!ofrecidaHacePoco() && (!PIXEL_ID || leer() !== null));
    };
    mira();
    window.addEventListener(EVENTO, mira);
    return () => window.removeEventListener(EVENTO, mira);
  }, []);

  if (usuario !== null || !lista || cerrada || fallo) return null;

  const luego = () => {
    setCerrada(true);
    try {
      localStorage.setItem(CLAVE, String(Date.now()));
    } catch {
      // Sin sitio donde apuntarlo —modo privado lleno— volverá a salir a la
      // próxima. Peor sería no cerrarse.
    }
  };

  return (
    <Sheet onClose={luego} titulo={t.registro.titulo} sub={t.registro.entradilla}>
      {/* En crema, que es como pide Google que vaya su botón y lo único claro
          de la pantalla: sobre el café oscuro se ve antes que el ámbar. */}
      <button
        type="button"
        onClick={() => void entrar()}
        disabled={ocupado}
        className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-pieza bg-ink text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
      >
        <G />
        {t.registro.google}
      </button>
      <button
        type="button"
        onClick={luego}
        className="mt-2 min-h-[46px] w-full rounded-pieza text-[15px] font-semibold text-ink-faint transition-colors active:bg-paper-3"
      >
        {t.registro.luego}
      </button>
    </Sheet>
  );
}

/** ¿Se le ofreció en este móvil hace menos de una semana? */
function ofrecidaHacePoco(): boolean {
  try {
    const cuando = localStorage.getItem(CLAVE);
    return cuando !== null && Date.now() - Number(cuando) < DESCANSO_MS;
  } catch {
    // Sin poder recordar la respuesta, mejor no preguntar cada vez.
    return true;
  }
}
