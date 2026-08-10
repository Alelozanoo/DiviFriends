"use client";

import Link from "next/link";
import { useState } from "react";
import type { Participant } from "@/lib/types";
import { Avatar, Sheet } from "./ui";

/**
 * Quién está en la mesa, y las dos maneras de que crezca esa lista.
 *
 * La rápida es apuntarlos tú: en una mesa de ocho no vas a esperar a que los
 * ocho saquen el móvil, así que escribes los nombres y vas marcando lo que ha
 * tomado cada uno desde la hoja de cada línea. La otra es que entren ellos por
 * QR o por enlace, que es mejor cuando la mesa colabora.
 */
export default function TableSheet({
  code,
  url,
  qrSvg,
  participants,
  meId,
  onAdd,
  onRemove,
  onClose,
}: {
  code: string;
  url: string;
  qrSvg: string;
  participants: Participant[];
  meId: string | null;
  /** Devuelve la ficha creada, pero aquí no hace falta: sólo se apunta. */
  onAdd: (name: string) => Promise<unknown>;
  onRemove: (participantId: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
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
      } catch {
        // cancelado por quien comparte: no hay nada que hacer
      }
      return;
    }
    await copy();
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight">La mesa</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Apunta a quien esté contigo y ve marcando lo que ha tomado cada uno.
      </p>

      {participants.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {participants.map((person) => (
            <li key={person.id} className="flex items-center gap-2.5 rounded-xl bg-paper px-3 py-2">
              <Avatar name={person.name} color={person.color} size={26} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {person.name}
                {person.id === meId && <span className="ml-1.5 text-xs text-amber">(tú)</span>}
              </span>
              <button
                type="button"
                onClick={() => onRemove(person.id)}
                aria-label={`Quitar a ${person.name} de la mesa`}
                className="rounded-lg px-2 py-1 text-xs text-ink-faint transition-colors hover:text-clay"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-3 flex gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          await onAdd(name.trim());
          setName("");
          setBusy(false);
        }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Añade a alguien"
          maxLength={40}
          aria-label="Nombre de quien se sienta en la mesa"
          className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-4 py-2.5 focus:border-amber focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="shrink-0 rounded-xl bg-amber px-5 text-sm font-bold text-paper disabled:opacity-30"
        >
          Añadir
        </button>
      </form>

      <div className="rule my-5" />

      {/* ------------------------------------------------- que entren ellos */}
      <p className="stamp text-ink-faint">O que se metan ellos</p>
      <div className="mt-2.5 flex items-center gap-4 rounded-2xl bg-[#f4ece0] p-4">
        <div
          className="h-28 w-28 shrink-0 [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <div className="min-w-0">
          <p className="tnum text-lg font-bold tracking-[0.2em] text-[#14100d]">{code}</p>
          <p className="mt-1 text-xs leading-snug text-[#776a5c]">
            Escanean el QR y marcan lo suyo. No hace falta instalar nada.
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void share()}
          className="flex-1 rounded-xl bg-mint py-3 font-bold text-paper active:scale-[0.98] transition-transform"
        >
          Compartir enlace
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
          {copied ? "Copiado ✓" : "Copiar"}
        </button>
      </div>

      <p className="tnum mt-3 truncate text-center text-xs text-ink-faint">{url}</p>

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
