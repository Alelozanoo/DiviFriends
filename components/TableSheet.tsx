"use client";

import { useState } from "react";
import { EV, track } from "@/lib/track";
import type { Participant } from "@/lib/types";
import { useT, rellena } from "@/lib/i18n";
import { Avatar, Sheet } from "./ui";

/**
 * Quién está en la mesa y cómo se mete el resto: por QR o por enlace.
 *
 * Apuntar a alguien escribiendo su nombre se hace ahora desde la hoja de cada
 * línea, al repartir un plato, que es cuando de verdad hace falta. Aquí sobraba
 * un formulario más entre la lista y el QR.
 */
export default function TableSheet({
  code,
  url,
  qrSvg,
  participants,
  payerId,
  meId,
  onUpdateAvatar,
  onRemove,
  onClose,
}: {
  code: string;
  url: string;
  qrSvg: string;
  participants: Participant[];
  payerId?: string | null;
  meId: string | null;
  onUpdateAvatar: (participantId: string, avatar: string) => void;
  onRemove: (participantId: string) => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null);
  const t = useT();
  
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
    // En el móvil esto abre WhatsApp directamente, que es como se comparte esto
    // de verdad. En escritorio no existe y se cae al portapapeles.
    if (navigator.share) {
      try {
        await navigator.share({ title: "Repartir la cuenta", text: `Comanda ${code}`, url });
        track(EV.comparte, { via: "sistema" });
      } catch {
        // cancelado por quien comparte: no hay nada que hacer
      }
      return;
    }
    await copy();
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">{t.mesa.titulo}</h2>
      <p className="mt-1 text-sm text-ink-soft">
        {t.mesa.entradilla}
      </p>

      {participants.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {participants.map((person) => (
            <li key={person.id} className="flex flex-col gap-1 rounded-xl bg-paper px-3 py-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingAvatarId(editingAvatarId === person.id ? null : person.id)}
                  className="rounded-full transition-transform hover:scale-110"
                  aria-label={`Cambiar avatar de ${person.name}`}
                >
                  <Avatar name={person.name} avatar={person.avatar} color={person.color} size={26} />
                </button>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold flex items-center gap-1.5">
                  <span className="truncate">{person.name}</span>
                  {person.id === meId && <span className="shrink-0 text-xs text-amber">{t.mesa.tu}</span>}
                  {(person.isPayer || person.id === payerId) && (
                    <span className="shrink-0 text-[0.65rem] uppercase tracking-wider font-bold text-mint px-1.5 py-0.5 rounded bg-mint/10 border border-mint/20">
                      {t.mesa.pagadorEtiqueta}
                    </span>
                  )}
                </span>
                {(!(payerId || participants.find(p => p.isPayer)) || meId === (payerId || participants.find(p => p.isPayer)?.id) || person.id === meId) && (
                  <button
                    type="button"
                    onClick={() => onRemove(person.id)}
                    aria-label={rellena(t.mesa.quitarDeLaMesa, { name: person.name })}
                    className="rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors hover:text-clay"
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
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-sm transition-all ${
                        person.avatar === emoji ? "border-amber bg-amber/10 scale-110" : "border-transparent bg-paper-3 hover:bg-paper-4"
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
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-transparent bg-paper-3 text-xs font-bold text-ink-soft hover:bg-paper-4"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6" />

      {/* ------------------------------------------------- que entren ellos */}
      <p className="stamp text-ink-faint uppercase tracking-wider text-[0.7rem] font-bold">{t.mesa.comoUnirse}</p>
      <div className="mt-2.5 flex items-center gap-4 rounded-2xl bg-[#f4ece0] p-4">
        <div
          className="h-28 w-28 shrink-0 [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div className="min-w-0">
          <p className="tnum text-lg font-bold tracking-[0.2em] text-[#14100d]">{code}</p>
          <p className="mt-1 text-xs leading-snug text-[#776a5c]">
            {t.mesa.escanean}
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void share()}
          className="flex-1 rounded-xl bg-mint py-3 font-bold text-paper active:scale-[0.98] transition-transform"
        >
          {t.mesa.compartirEnlace}
        </button>
        <button
          type="button"
          onClick={() => void copy()}
          className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors ${
            copied
              ? "border-mint text-mint"
              : "border-line text-ink-soft hover:border-mint hover:text-mint"
          }`}
        >
          {copied ? t.mesa.copiado : t.mesa.copiar}
        </button>
      </div>

      <p className="tnum mt-3 truncate text-center text-xs text-ink-faint">{url}</p>

      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full rounded-xl py-2 text-sm text-ink-faint"
      >
        {t.mesa.cerrar}
      </button>
    </Sheet>
  );
}
