"use client";

import Link from "next/link";
import type { TicketState } from "@/lib/types";
import PaperTicket from "./PaperTicket";
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
  onClose,
}: {
  state: TicketState;
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

      <Link
        href={`/t/${state.ticket.id}/qr`}
        className="mt-4 block w-full rounded-xl border border-line py-2.5 text-center text-sm font-semibold text-ink-soft transition-colors hover:border-amber hover:text-amber"
      >
        Verlo con el QR para imprimir
      </Link>

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
