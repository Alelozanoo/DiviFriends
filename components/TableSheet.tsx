"use client";

import { useEffect, useState } from "react";
import { EV, track } from "@/lib/track";
import {
  amigos as cargaAmigos,
  cuentasDeMesa,
  useCuenta,
  type Amigo,
  type PerfilPublico,
} from "@/lib/cuenta";
import type { Participant } from "@/lib/types";
import { useT, rellena } from "@/lib/i18n";
import { Avatar, Sheet } from "./ui";
import MeterAmigosSheet from "./MeterAmigosSheet";
import PerfilMesaSheet from "./PerfilMesaSheet";

/**
 * Compartir la mesa: el gesto más importante de toda la app.
 *
 * De aquí sale el enlace que se pega en el grupo de WhatsApp, así que lo
 * primero es el botón de compartir y el QR, y sólo después quién ya está
 * dentro. El nombre de la mesa vive aquí arriba porque es lo que ve quien
 * recibe el enlace: con dos tickets en la misma comanda, «Casa Lola» no dice
 * de qué noche va, y «BBQ 29 de julio» sí.
 *
 * Rehecha el 6 de septiembre de 2026 para que se vea entera de una: la X
 * arriba en vez del botón de cerrar al final —que sólo aparecía tras bajar
 * por toda la hoja—, copiar como un icono al lado de compartir en vez de un
 * segundo botón y la URL escrita, y la lista de amigos fuera, detrás del «+»
 * de «Quién está». Tocar a alguien de la mesa abre su ficha, desde la que se
 * le pide amistad; antes ese toque cambiaba su avatar por un emoji.
 */
export default function TableSheet({
  code,
  url,
  qrSvg,
  place,
  participants,
  payerId,
  meId,
  puedeQuitar = false,
  onRename,
  onRemove,
  onInvitar,
  onClose,
}: {
  code: string;
  url: string;
  qrSvg: string;
  place: string | null;
  participants: Participant[];
  payerId?: string | null;
  meId: string | null;
  /** Si esta persona puede sacar a otros de la mesa. */
  puedeQuitar?: boolean;
  onRename: (nombre: string) => void;
  onRemove: (participantId: string) => void;
  /** Meter a un amigo con cuenta. Sólo existe si quien mira tiene cuenta. */
  onInvitar?: (uid: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const { usuario } = useCuenta();
  const [amigos, setAmigos] = useState<Amigo[] | null>(null);
  const [cuentas, setCuentas] = useState<Record<string, PerfilPublico> | null>(null);
  const [metiendo, setMetiendo] = useState(false);
  const [fichaDe, setFichaDe] = useState<Participant | null>(null);
  const [copied, setCopied] = useState(false);
  // Sin permiso de portapapeles, la URL se escribe para copiarla a mano.
  const [sinPortapapeles, setSinPortapapeles] = useState(false);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [borrador, setBorrador] = useState(place ?? "");

  // Con cuenta se piden dos cosas al abrir, y sólo con cuenta: tus amigos —para
  // el «+» y para saber si alguien de la mesa ya lo es— y quién de la mesa
  // tiene cuenta, para su ficha.
  useEffect(() => {
    if (!usuario) return;
    let vivo = true;
    cargaAmigos()
      .then((d) => vivo && setAmigos(d.amigos))
      .catch(() => vivo && setAmigos([]));
    cuentasDeMesa(code)
      .then((d) => vivo && setCuentas(d.cuentas))
      .catch(() => vivo && setCuentas({}));
    return () => {
      vivo = false;
    };
  }, [usuario, code]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      track(EV.comparte, { via: "copiar" });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setSinPortapapeles(true);
    }
  }

  async function share() {
    /*
      El mensaje con el que sale el enlace.

      Antes decía «Comanda K3V8FU», que no invita a nada: quien lo recibe ve un
      código y un enlace y no sabe qué le están pidiendo. Ahora dice qué tiene
      que hacer —pagar su parte— y de dónde, con el nombre de la mesa. El
      enlace se manda aparte, en `url`, para que WhatsApp lo reconozca y pinte
      la vista previa en vez de dejarlo como texto suelto.
    */
    const texto = place
      ? rellena(t.mesa.invitacion, { sitio: place })
      : t.mesa.invitacionSinNombre;

    // En el móvil esto abre WhatsApp directamente, que es como se comparte esto
    // de verdad. En escritorio no existe y se cae al portapapeles.
    if (navigator.share) {
      try {
        await navigator.share({
          title: place ?? "DiviFriends",
          text: texto,
          url,
        });
        track(EV.comparte, { via: "sistema" });
      } catch {
        // cancelado por quien comparte: no hay nada que hacer
      }
      return;
    }
    await copy();
  }

  function guardaNombre() {
    const limpio = borrador.trim().slice(0, 40);
    if (limpio !== (place ?? "")) onRename(limpio);
    setEditandoNombre(false);
  }

  const yo = usuario?.uid ?? null;

  return (
    <>
      <Sheet onClose={onClose} titulo={t.mesa.titulo} sub={t.mesa.entradilla} cierre>
        <div className="mt-4 grid gap-3">
          {/* ------------------------------------------------ cómo se llama */}
          {editandoNombre ? (
            <div className="grid gap-2.5 rounded-bloque border border-amber/40 bg-amber/[0.06] p-3.5">
              <p className="text-[12px] text-ink-faint">{t.mesa.nombreMesa}</p>
              <input
                autoFocus
                value={borrador}
                onChange={(event) => setBorrador(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") guardaNombre();
                  if (event.key === "Escape") {
                    setBorrador(place ?? "");
                    setEditandoNombre(false);
                  }
                }}
                placeholder={t.mesa.nombreEjemplo}
                maxLength={40}
                aria-label={t.mesa.nombreMesa}
                className="min-h-[52px] w-full rounded-xl border border-line bg-paper px-4 text-[16px] font-semibold focus:border-amber focus:outline-none"
              />
              <p className="text-[13px] leading-relaxed text-ink-faint">
                {t.mesa.nombreAyuda}
              </p>
              <button
                type="button"
                onClick={guardaNombre}
                className="min-h-[46px] rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
              >
                {t.mesa.guardarNombre}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setBorrador(place ?? "");
                setEditandoNombre(true);
              }}
              /* `min-w-0` no es adorno: esto es hijo de un grid, y un hijo de
                 grid no encoge por debajo de su contenido a menos que se le
                 diga. Sin esto, un nombre de bar largo —que no parte porque
                 lleva `truncate`— estiraba el botón a 521 px y con él la hoja
                 entera: el QR, el botón de compartir y los nombres se iban
                 fuera de la pantalla. */
              className="flex min-h-[54px] w-full min-w-0 items-center gap-3 rounded-bloque border border-line-soft bg-paper px-3.5 text-left transition-colors active:bg-paper-3"
            >
              <span className="min-w-0 flex-1">
                <span className="text-[12px] block text-ink-faint">
                  {t.mesa.nombreMesa}
                </span>
                <span
                  className={`mt-1 block truncate text-[15px] font-semibold ${
                    place ? "text-ink" : "text-ink-faint"
                  }`}
                >
                  {place || t.mesa.ponleNombre}
                </span>
              </span>
              <svg
                aria-hidden
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-ink-faint"
              >
                <path d="M4 20h4l10-10a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6 4 20Z" />
              </svg>
            </button>
          )}

          {/* --------------------------------------------- el QR y el código */}
          <div className="flex items-center gap-4 rounded-bloque bg-[#f4ece0] p-4">
            <div
              className="h-24 w-24 shrink-0 [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div className="min-w-0">
              <p className="text-[12px] text-[#776a5c]">{t.mesa.comoUnirse}</p>
              <p className="tnum mt-1.5 text-[21px] font-bold tracking-[0.16em] text-[#14100d]">
                {code}
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-[#5c5145]">
                {t.mesa.escanean}
              </p>
            </div>
          </div>

          {/* ----------------------------------------- compartir, y copiar al lado */}
          {/*
            Compartir es lo que se viene a hacer aquí: va en ámbar y ocupa el
            ancho. Copiar es el plan B de quien no tiene WhatsApp a mano, y un
            plan B no merece un segundo botón entero más la URL escrita: es un
            cuadrado con el icono, pegado al principal.
          */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void share()}
              className="flex min-h-[52px] min-w-0 flex-1 items-center justify-center gap-2.5 rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 3v12M12 3 8 7M12 3l4 4" />
                <path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0-1-1v-6" />
              </svg>
              {t.mesa.compartirEnlace}
            </button>
            <button
              type="button"
              onClick={() => void copy()}
              aria-label={copied ? t.mesa.copiado : t.mesa.copiarEnlace}
              title={t.mesa.copiarEnlace}
              className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl border transition-colors ${
                copied ? "border-mint text-mint" : "border-line text-ink active:bg-paper-3"
              }`}
            >
              {copied ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12.5 10 17.5 19 7" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <rect x="9" y="9" width="11" height="11" rx="2.2" />
                  <path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" />
                </svg>
              )}
            </button>
          </div>
          {sinPortapapeles && (
            <p className="tnum -mt-1 truncate text-center text-[13px] text-ink-faint">{url}</p>
          )}

          {/* ------------------------------------------------- quién ya está */}
          {/* El «+» va aquí, a la altura del título, y no como un bloque más:
              meter a un amigo es una acción sobre esta lista. */}
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[12px] text-ink-faint">{t.mesa.quienEsta}</p>
            <button
              type="button"
              onClick={() => setMetiendo(true)}
              aria-label={t.mesa.anadirAmigos}
              className="grid h-9 w-9 place-items-center rounded-full border border-amber/60 text-[22px] font-medium leading-none text-amber transition-colors active:bg-amber/10"
            >
              +
            </button>
          </div>
          {participants.length > 0 && (
            <ul className="-mt-1.5 grid gap-1.5">
              {participants.map((person) => (
                <li
                  key={person.id}
                  className="flex items-center gap-1 rounded-xl border border-line-soft bg-paper py-1 pl-3 pr-1"
                >
                  {/* Toda la fila abre su ficha: la foto y el nombre son la
                      misma persona, y un toque en cualquiera de las dos vale. */}
                  <button
                    type="button"
                    onClick={() => setFichaDe(person)}
                    aria-label={rellena(t.mesa.verPerfil, { name: person.name })}
                    className="flex min-h-[40px] min-w-0 flex-1 items-center gap-2.5 text-left"
                  >
                    <Avatar
                      name={person.name}
                      avatar={person.avatar}
                      color={person.color}
                      size={28}
                    />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-[15px] font-semibold">
                      <span className="truncate">{person.name}</span>
                      {person.id === meId && (
                        <span className="shrink-0 text-[13px] text-amber">
                          {t.mesa.tu}
                        </span>
                      )}
                      {(person.isPayer || person.id === payerId) && (
                        <span className="text-[12px] shrink-0 rounded border border-mint/20 bg-mint/10 px-1.5 py-1 text-mint">
                          {t.mesa.pagadorEtiqueta}
                        </span>
                      )}
                    </span>
                  </button>
                  {puedeQuitar && (
                    <button
                      type="button"
                      onClick={() => onRemove(person.id)}
                      aria-label={rellena(t.mesa.quitarDeLaMesa, {
                        name: person.name,
                      })}
                      className="shrink-0 rounded-lg px-2.5 py-2 text-[13px] text-ink-faint transition-colors hover:text-clay"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Que caduque no puede ser una sorpresa: quien vuelva en dos meses a por
              una cuenta tiene derecho a saber por qué no está. */}
          <p className="text-[12px] text-center text-ink-faint">
            {t.mesa.caduca}
          </p>
        </div>
      </Sheet>

      {metiendo && (
        <MeterAmigosSheet
          amigos={amigos}
          participants={participants}
          conCuenta={Boolean(usuario)}
          onInvitar={onInvitar}
          onClose={() => setMetiendo(false)}
        />
      )}

      {fichaDe && (
        <PerfilMesaSheet
          person={fichaDe}
          esYo={fichaDe.id === meId}
          conCuenta={Boolean(usuario)}
          cuenta={usuario ? (cuentas ? (cuentas[fichaDe.id] ?? null) : undefined) : null}
          amistad={
            cuentas?.[fichaDe.id]
              ? amigos?.find((a) => a.uid === cuentas[fichaDe.id].uid)
              : undefined
          }
          yo={yo}
          onAmigos={setAmigos}
          onClose={() => setFichaDe(null)}
        />
      )}
    </>
  );
}
