"use client";

import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { ticketPng } from "@/lib/ticketImage";
import type { TicketState } from "@/lib/types";

/**
 * Mandar el ticket por WhatsApp: la foto de la cuenta, el mensaje y el enlace.
 *
 * Antes aquí sólo había «verlo con el QR para imprimir», que es lo que hace un
 * bar y no lo que hace la mesa. Lo que se quiere a las tres de la tarde es
 * enseñarles lo que ha salido y que entren, y para eso hace falta la imagen: un
 * enlace pelado en el grupo no lo abre nadie, y una foto de la cuenta sí se
 * mira.
 *
 * El enlace va dentro del texto y no en el campo `url` porque cada aplicación
 * lo trata a su manera —unas lo pegan al final, otras lo tiran— y así llega
 * siempre, en un sitio previsible.
 */
export default function ShareTicketButton({
  state,
  url,
  qrSvg,
  onDone,
}: {
  state: TicketState;
  url: string;
  qrSvg: string;
  onDone?: () => void;
}) {
  const [imagen, setImagen] = useState<File | null>(null);
  const [nota, setNota] = useState<string | null>(null);

  const { ticket } = state;
  const sitio = ticket.place ? `de ${ticket.place}` : "de la mesa";
  const mensaje =
    `La cuenta ${sitio}: ${money(ticket.totalCents, ticket.currency)}. ` +
    `Entra y marca lo que has tomado tú, que sale solo lo que le toca a cada uno:\n${url}`;

  /*
    La imagen se dibuja al abrir la hoja, no al pulsar.

    No es por ir rápido: `navigator.share` sólo se puede llamar mientras dura
    el gesto del dedo, y dibujar el ticket primero —esperar a las fuentes y al
    `toBlob`— lo daba por gastado. El navegador respondía «Must be handling a
    user gesture» y no se abría nada. Teniéndola hecha de antes, al pulsar se
    llama a compartir sin un solo `await` por delante.
  */
  const firma = `${ticket.totalCents}·${state.items.length}·${ticket.place ?? ""}`;
  useEffect(() => {
    let vivo = true;
    void ticketPng(state, url, qrSvg).then((blob) => {
      if (!vivo || !blob) return;
      setImagen(new File([blob], `divi-${ticket.id}.png`, { type: "image/png" }));
    });
    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma, url]);

  function compartir() {
    setNota(null);

    if (imagen && navigator.canShare?.({ files: [imagen] })) {
      navigator.share({ files: [imagen], text: mensaje }).then(onDone, avisar);
      return;
    }
    // Sin poder mandar ficheros —escritorio, navegadores viejos, o la imagen
    // todavía dibujándose— va el mensaje solo: el enlace es lo que hace falta.
    if (navigator.share) {
      navigator.share({ text: mensaje, url }).then(onDone, avisar);
      return;
    }
    if (imagen) descargar(imagen);
    void navigator.clipboard?.writeText(mensaje).then(
      () => setNota("Imagen descargada y mensaje copiado."),
      () => setNota("Imagen descargada."),
    );
  }

  function avisar(error: unknown) {
    // Cancelar el menú de compartir lanza AbortError: no es un fallo.
    if (error instanceof DOMException && error.name === "AbortError") return;
    setNota("No se ha podido compartir. Copia el enlace desde «Compartir».");
  }

  return (
    <>
      <button
        type="button"
        onClick={compartir}
        className="mt-4 w-full rounded-xl bg-mint py-3 font-bold text-paper transition-transform active:scale-[0.98]"
      >
        Compartir ticket
      </button>
      {nota && <p className="mt-2 text-center text-xs text-ink-faint">{nota}</p>}
    </>
  );
}

function descargar(file: File): void {
  const href = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = href;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(href);
}
