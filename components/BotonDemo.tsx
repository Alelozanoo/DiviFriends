"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { nuevaDemo } from "@/lib/demoCliente";
import { useT } from "@/lib/i18n";

/**
 * «Probar con una mesa de ejemplo».
 *
 * Sale en los dos sitios donde alguien se queda sin nada que hacer: en la
 * portada de venta, debajo del botón de la foto, y en el inicio de quien acaba
 * de registrarse y todavía no tiene ni una divi. Ese segundo caso es el que
 * más importa: una cuenta recién hecha con una pantalla vacía y un único botón
 * que pide una foto de un ticket que no tienes delante es una cuenta que se
 * cierra y no vuelve.
 *
 * Crea una mesa suya —no una compartida por todos— y entra en ella. Lo que
 * cuesta es una escritura de Firestore: los platos ya vienen escritos, así que
 * no pasa por el lector ni cuesta un céntimo.
 *
 * `tono` es lo único que cambia entre los dos sitios. En la portada va como un
 * enlace gris debajo de lo que de verdad hay que hacer, porque no es la puerta
 * principal. En el inicio vacío va como botón con borde, porque ahí sí es una
 * de las dos únicas cosas que se pueden hacer.
 */
export default function BotonDemo({ tono = "enlace" }: { tono?: "enlace" | "boton" }) {
  const t = useT();
  const router = useRouter();
  const [yendo, setYendo] = useState(false);

  async function abrir() {
    if (yendo) return;
    setYendo(true);
    const code = await nuevaDemo();
    if (code) router.push(`/t/${code}`);
    // Sin red o con el tope lleno: el botón vuelve a su sitio y ya está.
    else setYendo(false);
  }

  if (tono === "boton") {
    return (
      <button
        type="button"
        disabled={yendo}
        onClick={() => void abrir()}
        className="mt-3 flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-line px-6 text-[16px] font-semibold text-ink-soft transition-colors active:bg-paper-2 disabled:opacity-50"
      >
        {yendo ? t.subir.preparando : t.demo.probar}
      </button>
    );
  }

  return (
    <div className="mt-3 text-center">
      <button
        type="button"
        disabled={yendo}
        onClick={() => void abrir()}
        className="min-h-[44px] text-[14px] font-semibold text-ink-soft underline decoration-line underline-offset-4 transition-colors active:text-ink disabled:opacity-50"
      >
        {yendo ? t.subir.preparando : t.demo.probar}
      </button>
      <p className="mt-0.5 text-[12px] leading-relaxed text-ink-faint">{t.demo.probarAyuda}</p>
    </div>
  );
}
