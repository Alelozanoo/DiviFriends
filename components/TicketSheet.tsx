"use client";

import Link from "next/link";
import type { TicketState } from "@/lib/types";
import PaperTicket from "./PaperTicket";
import ShareTicketButton from "./ShareTicketButton";
import { Sheet } from "./ui";

/**
 * El ticket entero, para mirarlo sin salir del reparto.
 *
 * Hace falta porque la comanda enseña las líneas sueltas y en burbujas, y a
 * mitad de reparto siempre sale la pregunta de si la lectura de la foto acertó:
 * cuántas cañas ponía, cuánto era el total. Aquí está tal cual, en orden y con
 * las cuentas cuadradas.
 */
export default function TicketSheet({
  state,
  shareUrl,
  qrSvg,
  onClose,
}: {
  state: TicketState;
  shareUrl: string;
  qrSvg: string;
  onClose: () => void;
}) {
  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">El ticket</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Lo que se leyó del papel. Si algo no cuadra, se corrige desde la comanda.
      </p>

      <div className="mt-4 overflow-hidden rounded-xl">
        <PaperTicket ticket={state.ticket} items={state.items} />
      </div>

      {/*
        Compartir manda; imprimir es lo raro. Lo que pasa aquí es que uno de la
        mesa quiere enseñarles lo que ha salido y que entren, y para eso va la
        imagen del ticket con el enlace dentro. Imprimir el QR lo hace un bar
        una vez, así que se queda debajo y en pequeño.
      */}
      <ShareTicketButton state={state} url={shareUrl} qrSvg={qrSvg} onDone={onClose} />

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-xl py-2 text-sm text-ink-faint"
      >
        Cerrar
      </button>
    </Sheet>
  );
}
