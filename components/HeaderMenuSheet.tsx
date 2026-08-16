"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n";
import LangSwitch from "./LangSwitch";
import { CerrarHoja, Sheet } from "./ui";

/**
 * Todo lo que se puede hacer con la mesa, detrás de los tres puntos.
 *
 * Lo que no tiene vuelta atrás —cerrar la mesa, quitarse de pagador, irse—
 * pide confirmación aquí dentro y no con el diálogo del navegador: ése sale
 * gris, en el idioma del sistema y no en el de la app, y encima corta el hilo
 * de la pantalla justo cuando hay que leer con atención.
 */
export function HeaderMenuSheet({
  modo = "general",
  onClose,
  onChangeName,
  onLeave,
  onChangePayer,
  onRemovePayer,
  onConfigPayment,
  onCloseTicket,
  onComoFunciona,
  onHistorial,
  eventos = 0,
  ticketClosed,
}: {
  /** «general» es el de los tres puntos; «pagador», el del escudo. */
  modo?: "general" | "pagador";
  onClose: () => void;
  onChangeName: () => void;
  onLeave: () => void;
  onChangePayer: (() => void) | null;
  onRemovePayer: (() => void) | null;
  onConfigPayment: (() => void) | null;
  onCloseTicket: (() => void) | null;
  onComoFunciona: () => void;
  /** El historial vivía en la cabecera; ahí el sitio lo necesitaba compartir. */
  onHistorial: () => void;
  eventos?: number;
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
      <Sheet onClose={onClose} titulo={titulo} sub={aviso}>
        <div className="mt-5 grid gap-2.5">
          <button
            type="button"
            onClick={() => {
              onClose();
              hazlo?.();
            }}
            className={`min-h-[52px] rounded-xl text-[15px] font-bold text-paper transition-transform active:scale-[0.98] ${
              tono === "amber" ? "bg-amber" : "bg-clay"
            }`}
          >
            {t.menu.si}
          </button>
          <CerrarHoja onClick={() => setConfirmando(null)}>{t.menu.no}</CerrarHoja>
        </div>
      </Sheet>
    );
  }

  /*
    Lo que sólo puede hacer quien puso el dinero vive detrás del escudo, y no
    mezclado con «editar mi perfil». Así el resto de la mesa no se encuentra
    media lista de botones que no le corresponden, y quien pagó reconoce de un
    vistazo que ese escudo es suyo.
  */
  if (modo === "pagador") {
    return (
      <Sheet onClose={onClose} titulo={t.menu.tituloPagador} sub={t.menu.entradillaPagador}>
        <div className="mt-5 grid gap-2.5">
          {onChangePayer && !ticketClosed && (
            <Opcion
              icono={<IconoCambiarPagador />}
              onClick={() => {
                onClose();
                onChangePayer();
              }}
            >
              {t.menu.cambiarPagador}
            </Opcion>
          )}

          {onConfigPayment && !ticketClosed && (
            <Opcion
              icono={<IconoTarjeta />}
              onClick={() => {
                onClose();
                onConfigPayment();
              }}
            >
              {t.menu.configurarCobro}
            </Opcion>
          )}

          {onCloseTicket && !ticketClosed && (
            <Opcion icono={<IconoCandado />} tono="amber" onClick={() => setConfirmando("cerrar")}>
              {t.menu.bloquear}
            </Opcion>
          )}

          {onRemovePayer && !ticketClosed && (
            <Opcion icono={<IconoAspa />} tono="clay" onClick={() => setConfirmando("pagador")}>
              {t.menu.noPagueYo}
            </Opcion>
          )}

          <CerrarHoja onClick={onClose}>{t.mesa.cerrar}</CerrarHoja>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={onClose} titulo={t.menu.titulo}>
      <div className="mt-5 grid gap-2.5">
        <Opcion
          icono={<IconoPersona />}
          onClick={() => {
            onClose();
            onChangeName();
          }}
        >
          {t.menu.editarPerfil}
        </Opcion>

        <Opcion
          icono={<IconoReloj />}
          contador={eventos || undefined}
          onClick={() => {
            onClose();
            onHistorial();
          }}
        >
          {t.comanda.historialTitulo}
        </Opcion>

        <Opcion
          icono={<IconoPregunta />}
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
        <div className="flex min-h-[54px] w-full items-center gap-3 rounded-xl border border-line-soft bg-paper px-3.5">
          <span className="shrink-0 text-ink-faint">
            <IconoGlobo />
          </span>
          <span className="min-w-0 flex-1 text-[15px] font-semibold">{t.menu.idioma}</span>
          <LangSwitch />
        </div>

        <Opcion icono={<IconoSalir />} tono="clay" className="mt-2" onClick={() => setConfirmando("salir")}>
          {t.menu.salir}
        </Opcion>

        <CerrarHoja onClick={onClose}>{t.mesa.cerrar}</CerrarHoja>
      </div>
    </Sheet>
  );
}

/** Una acción del menú: icono, palabra y todo el ancho para tocarla. */
function Opcion({
  children,
  icono,
  onClick,
  contador,
  tono = "normal",
  className = "",
}: {
  children: React.ReactNode;
  icono: React.ReactNode;
  onClick: () => void;
  /** Cuántas cosas hay detrás, si la fila lleva cuenta. */
  contador?: number;
  tono?: "normal" | "amber" | "clay";
  className?: string;
}) {
  const estilo =
    tono === "amber"
      ? "border-amber/30 text-amber"
      : tono === "clay"
        ? "border-clay/30 text-clay"
        : "border-line-soft text-ink";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[54px] w-full items-center gap-3 rounded-xl border bg-paper px-3.5 text-left text-[15px] font-semibold transition-colors active:bg-paper-3 ${estilo} ${className}`}
    >
      <span className={`shrink-0 ${tono === "normal" ? "text-ink-faint" : ""}`}>{icono}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {contador != null && (
        <span className="tnum shrink-0 text-[13px] text-ink-faint">{contador}</span>
      )}
    </button>
  );
}

/* Los dibujos. Trazo de 1,9 y 19 px, como los de la cabecera. */
function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const IconoPersona = () => (
  <Svg>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
);

const IconoPregunta = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.2A2.5 2.5 0 0 1 14 10.4c0 1.7-2 2-2 3.3" />
    <circle cx="12" cy="17" r=".6" fill="currentColor" />
  </Svg>
);

const IconoReloj = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

const IconoGlobo = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
  </Svg>
);

const IconoSalir = () => (
  <Svg>
    <path d="M14.5 4.5H18a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3.5" />
    <path d="M10 8.5 6.5 12l3.5 3.5M6.5 12H15" />
  </Svg>
);

const IconoCambiarPagador = () => (
  <Svg>
    <path d="M16 19a4 4 0 0 0-8 0" />
    <circle cx="12" cy="9" r="3.2" />
    <path d="m19 4 2 2-2 2" />
    <path d="M21 6h-5" />
  </Svg>
);

const IconoTarjeta = () => (
  <Svg>
    <rect x="2.5" y="5.5" width="19" height="13" rx="2.5" />
    <path d="M2.5 10h19" />
  </Svg>
);

const IconoCandado = () => (
  <Svg>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
  </Svg>
);

const IconoAspa = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 8.5 7 7M15.5 8.5l-7 7" />
  </Svg>
);
