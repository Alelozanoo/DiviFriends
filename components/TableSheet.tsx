"use client";

import { useEffect, useState } from "react";
import { EV, track } from "@/lib/track";
import { amigos as cargaAmigos, useCuenta, type Amigo } from "@/lib/cuenta";
import type { Participant } from "@/lib/types";
import { useT, rellena } from "@/lib/i18n";
import { Avatar, CerrarHoja, Sheet } from "./ui";

/**
 * Compartir la mesa: el gesto más importante de toda la app.
 *
 * De aquí sale el enlace que se pega en el grupo de WhatsApp, así que lo
 * primero es el botón de compartir y el QR, y sólo después quién ya está
 * dentro. El nombre de la mesa vive aquí arriba porque es lo que ve quien
 * recibe el enlace: con dos tickets en la misma comanda, «Casa Lola» no dice
 * de qué noche va, y «BBQ 29 de julio» sí.
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
  onUpdateAvatar,
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
  onUpdateAvatar: (participantId: string, avatar: string) => void;
  onRemove: (participantId: string) => void;
  /** Meter a un amigo con cuenta. Sólo existe si quien mira tiene cuenta. */
  onInvitar?: (uid: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const { usuario } = useCuenta();
  const [amigos, setAmigos] = useState<Amigo[] | null>(null);
  const [metidos, setMetidos] = useState<Set<string>>(new Set());
  const [metiendo, setMetiendo] = useState<string | null>(null);
  // Lo que dijo el servidor si no pudo: antes se tragaba y el botón volvía a
  // su sitio como si nada, que es la peor de las respuestas.
  const [falloInvitar, setFalloInvitar] = useState<string | null>(null);

  // La lista sólo se pide con cuenta y cuando se abre la hoja: es una llamada
  // y no hay por qué hacerla a quien nunca la va a ver.
  useEffect(() => {
    if (!usuario || !onInvitar) return;
    let vivo = true;
    cargaAmigos()
      .then(
        (d) =>
          vivo && setAmigos(d.amigos.filter((a) => a.estado === "aceptado")),
      )
      .catch(() => vivo && setAmigos([]));
    return () => {
      vivo = false;
    };
  }, [usuario, onInvitar]);

  // Un amigo que ya está sentado no se ofrece: se mira por nombre, que es lo
  // que la mesa conoce, y por lo que se acaba de meter desde aquí.
  const nombresEnMesa = new Set(participants.map((p) => p.name.toLowerCase()));
  const candidatos = (amigos ?? []).filter(
    (a) => !metidos.has(a.uid) && !nombresEnMesa.has(a.nombre.toLowerCase()),
  );
  const [copied, setCopied] = useState(false);
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [borrador, setBorrador] = useState(place ?? "");

  const emojis = ["🍕", "🍔", "🍟", "🌮", "🍣", "🍻", "🍹", "☕️"];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      track(EV.comparte, { via: "copiar" });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      // Sin permiso de portapapeles queda la URL escrita abajo para copiarla a mano.
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

  return (
    <Sheet onClose={onClose} titulo={t.mesa.titulo} sub={t.mesa.entradilla}>
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
            className="flex min-h-[54px] w-full items-center gap-3 rounded-bloque border border-line-soft bg-paper px-3.5 text-left transition-colors active:bg-paper-3"
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

        {/* Compartir es lo que se viene a hacer aquí: va en ámbar y entero. */}
        <button
          type="button"
          onClick={() => void share()}
          className="flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
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
            <path d="M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6" />
          </svg>
          {t.mesa.compartirEnlace}
        </button>

        <button
          type="button"
          onClick={() => void copy()}
          className={`min-h-[46px] w-full rounded-xl border text-[15px] font-semibold transition-colors ${
            copied
              ? "border-mint text-mint"
              : "border-line text-ink active:bg-paper-3"
          }`}
        >
          {copied ? t.mesa.copiado : t.mesa.copiar}
        </button>

        <p className="tnum truncate text-center text-[13px] text-ink-faint">
          {url}
        </p>

        {/* --------------------------------------------- meter a un amigo */}
        {usuario && onInvitar && amigos !== null && (
          <div className="grid gap-2 rounded-bloque border border-line-soft bg-paper p-3.5">
            <p className="text-[12px] text-ink-faint">{t.mesa.anadeAmigo}</p>
            {amigos.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-ink-faint">
                {t.mesa.sinAmigos}
              </p>
            ) : candidatos.length === 0 ? (
              <p className="text-[13px] leading-relaxed text-ink-faint">
                {t.mesa.todosDentro}
              </p>
            ) : (
              <ul className="grid gap-1.5">
                {candidatos.map((a) => (
                  <li
                    key={a.uid}
                    className="flex min-h-[48px] items-center gap-2.5"
                  >
                    <Avatar
                      name={a.nombre}
                      avatar={a.avatar}
                      color="#5ec5c0"
                      size={26}
                    />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                      {a.nombre}
                    </span>
                    <button
                      type="button"
                      disabled={metiendo !== null}
                      onClick={async () => {
                        setMetiendo(a.uid);
                        setFalloInvitar(null);
                        try {
                          await onInvitar(a.uid);
                          setMetidos((s) => new Set(s).add(a.uid));
                        } catch (error) {
                          setFalloInvitar(
                            error instanceof Error ? error.message : t.mesa.invitarFallo,
                          );
                        } finally {
                          setMetiendo(null);
                        }
                      }}
                      className="min-h-[38px] rounded-pieza bg-amber px-3.5 text-[13px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
                    >
                      {metiendo === a.uid ? "…" : t.mesa.anadir}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {falloInvitar && (
              <p className="text-[13px] leading-relaxed text-clay" role="alert">
                {falloInvitar}
              </p>
            )}
          </div>
        )}

        {/* ------------------------------------------------- quién ya está */}
        {participants.length > 0 && (
          <>
            <p className="text-[12px] mt-1 text-ink-faint">
              {t.mesa.quienEsta}
            </p>
            <ul className="-mt-1 grid gap-1.5">
              {participants.map((person) => (
                <li
                  key={person.id}
                  className="flex flex-col gap-1 rounded-xl border border-line-soft bg-paper px-3 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingAvatarId(
                          editingAvatarId === person.id ? null : person.id,
                        )
                      }
                      className="rounded-full transition-transform hover:scale-110"
                      aria-label={`Cambiar avatar de ${person.name}`}
                    >
                      <Avatar
                        name={person.name}
                        avatar={person.avatar}
                        color={person.color}
                        size={26}
                      />
                    </button>
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
                    {puedeQuitar && (
                      <button
                        type="button"
                        onClick={() => onRemove(person.id)}
                        aria-label={rellena(t.mesa.quitarDeLaMesa, {
                          name: person.name,
                        })}
                        className="rounded-lg px-2 py-2 text-[13px] text-ink-faint transition-colors hover:text-clay"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {editingAvatarId === person.id && (
                    <div className="flex gap-2 overflow-x-auto py-2">
                      {emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            onUpdateAvatar(person.id, emoji);
                            setEditingAvatarId(null);
                          }}
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[15px] transition-all ${
                            person.avatar === emoji
                              ? "scale-110 border-amber bg-amber/10"
                              : "border-transparent bg-paper-3 hover:bg-paper-4"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                      {person.avatar && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateAvatar(person.id, "");
                            setEditingAvatarId(null);
                          }}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-transparent bg-paper-3 text-[13px] font-bold text-ink-soft hover:bg-paper-4"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Que caduque no puede ser una sorpresa: quien vuelva en dos meses a por
            una cuenta tiene derecho a saber por qué no está. */}
        <p className="text-[12px] text-center text-ink-faint">
          {t.mesa.caduca}
        </p>

        <CerrarHoja onClick={onClose}>{t.mesa.cerrar}</CerrarHoja>
      </div>
    </Sheet>
  );
}
