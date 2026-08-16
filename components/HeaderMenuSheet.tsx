"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import LangSwitch from "./LangSwitch";
import { Sheet } from "./ui";

/**
 * Todo lo que se puede hacer con la mesa, detrás de los tres puntos.
 *
 * Lo que no tiene vuelta atrás —cerrar la mesa, quitarse de pagador, irse—
 * pide confirmación aquí dentro y no con el diálogo del navegador: ése sale
 * gris, en el idioma del sistema y no en el de la app, y encima corta el hilo
 * de la pantalla justo cuando hay que leer con atención.
 */
export function HeaderMenuSheet({
  onClose,
  onChangeName,
  onLeave,
  onChangePayer,
  onRemovePayer,
  onConfigPayment,
  onCloseTicket,
  onComoFunciona,
  showPayerOptions,
  ticketClosed,
}: {
  onClose: () => void;
  onChangeName: () => void;
  onLeave: () => void;
  onChangePayer: (() => void) | null;
  onRemovePayer: (() => void) | null;
  onConfigPayment: (() => void) | null;
  onCloseTicket: (() => void) | null;
  onComoFunciona: () => void;
  showPayerOptions: boolean;
  ticketClosed: boolean;
}) {
  const t = useT();
  /** Cuál de las tres cosas serias está esperando un sí. */
  const [confirmando, setConfirmando] = useState<null | "pagador" | "cerrar" | "salir">(null);

  const confirmaciones = {
    pagador: {
      titulo: t.menu.noPagueYo,
      aviso: t.menu.noPagueYoAviso,
      hazlo: onRemovePayer,
      tono: "clay" as const,
    },
    cerrar: {
      titulo: t.menu.bloquear,
      aviso: t.menu.bloquearAviso,
      hazlo: onCloseTicket,
      tono: "amber" as const,
    },
    salir: {
      titulo: t.menu.salir,
      aviso: t.menu.salirAviso,
      hazlo: onLeave,
      tono: "clay" as const,
    },
  };

  if (confirmando) {
    const { titulo, aviso, hazlo, tono } = confirmaciones[confirmando];
    return (
      <Sheet onClose={onClose}>
        <h2 className="text-xl font-bold tracking-tight">{titulo}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{aviso}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              hazlo?.();
            }}
            className={`flex-1 rounded-xl py-3 text-sm font-bold text-paper transition-transform active:scale-[0.98] ${
              tono === "amber" ? "bg-amber" : "bg-clay"
            }`}
          >
            {t.menu.si}
          </button>
          <button
            type="button"
            onClick={() => setConfirmando(null)}
            className="flex-1 rounded-xl border border-line py-3 text-sm font-semibold text-ink-soft transition-colors active:bg-paper-3"
          >
            {t.menu.no}
          </button>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-4 text-xl font-bold tracking-tight">{t.menu.titulo}</h2>

      <div className="flex flex-col gap-2">
        {onChangePayer && showPayerOptions && !ticketClosed && (
          <Opcion
            onClick={() => {
              onClose();
              onChangePayer();
            }}
          >
            {t.menu.cambiarPagador}
          </Opcion>
        )}

        {onRemovePayer && showPayerOptions && !ticketClosed && (
          <Opcion tono="clay" onClick={() => setConfirmando("pagador")}>
            {t.menu.noPagueYo}
          </Opcion>
        )}

        {onConfigPayment && showPayerOptions && !ticketClosed && (
          <Opcion
            onClick={() => {
              onClose();
              onConfigPayment();
            }}
          >
            {t.menu.configurarCobro}
          </Opcion>
        )}

        <hr className="my-2 border-line/60" />

        <Opcion
          onClick={() => {
            onClose();
            onChangeName();
          }}
        >
          {t.menu.editarPerfil}
        </Opcion>

        <Opcion
          onClick={() => {
            onClose();
            onComoFunciona();
          }}
        >
          {t.comanda.comoFunciona}
        </Opcion>

        {/*
          El idioma, aquí dentro y no sólo en el pie de la portada.

          A la comanda se llega por un enlace de WhatsApp sin pasar por la
          portada, así que quien la abre en el idioma que no es no tenía dónde
          cambiarlo. Cambia la cookie y recarga la página desde el servidor,
          que es quien decide el idioma de esta pantalla.
        */}
        <div className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3.5">
          <span className="font-semibold">{t.menu.idioma}</span>
          <LangSwitch />
        </div>

        {onCloseTicket && showPayerOptions && !ticketClosed && (
          <Opcion tono="amber" onClick={() => setConfirmando("cerrar")}>
            {t.menu.bloquear}
          </Opcion>
        )}

        <Opcion tono="clay" className="mt-4" onClick={() => setConfirmando("salir")}>
          {t.menu.salir}
        </Opcion>
      </div>
    </Sheet>
  );
}

function Opcion({
  children,
  onClick,
  tono = "normal",
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tono?: "normal" | "amber" | "clay";
  className?: string;
}) {
  const estilo =
    tono === "amber"
      ? "border-amber/40 bg-amber/[0.08] text-amber font-bold"
      : tono === "clay"
        ? "border-clay/40 bg-clay/[0.06] text-clay font-bold"
        : "border-line font-semibold";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3.5 text-left transition-colors active:bg-paper-3 ${estilo} ${className}`}
    >
      {children}
    </button>
  );
}
