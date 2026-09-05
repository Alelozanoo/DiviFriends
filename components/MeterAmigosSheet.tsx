"use client";

import { useState } from "react";
import type { Amigo } from "@/lib/cuenta";
import type { Participant } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { Avatar, Sheet } from "./ui";

/**
 * Meter a un amigo en la mesa: la hoja que abre el «+» de «Quién está».
 *
 * Antes la lista de amigos iba incrustada en la hoja de la mesa, entre el
 * enlace y la gente, y la alargaba hasta esconder el botón de cerrar. Ahora
 * la mesa se ve entera de una, y esto sale sólo cuando se pide. Se enseñan
 * todos tus amigos, también los que ya están sentados —con «Dentro ✓»—, para
 * que se vea que la lista está completa y no que faltan.
 */
export default function MeterAmigosSheet({
  amigos,
  participants,
  conCuenta,
  onInvitar,
  onClose,
}: {
  /** Tu lista entera; null mientras llega. */
  amigos: Amigo[] | null;
  participants: Participant[];
  /** Sin cuenta no hay lista: se dice, en vez de enseñar una hoja vacía. */
  conCuenta: boolean;
  onInvitar?: (uid: string) => Promise<void>;
  onClose: () => void;
}) {
  const t = useT();
  const [metidos, setMetidos] = useState<Set<string>>(new Set());
  const [metiendo, setMetiendo] = useState<string | null>(null);
  // Lo que dijo el servidor si no pudo: antes se tragaba y el botón volvía a
  // su sitio como si nada, que es la peor de las respuestas.
  const [fallo, setFallo] = useState<string | null>(null);

  // Un amigo que ya está sentado se reconoce por nombre, que es lo que la
  // mesa conoce, y por lo que se acaba de meter desde aquí.
  const nombresEnMesa = new Set(participants.map((p) => p.name.toLowerCase()));
  const aceptados = (amigos ?? []).filter((a) => a.estado === "aceptado");

  async function mete(a: Amigo) {
    if (!onInvitar) return;
    setMetiendo(a.uid);
    setFallo(null);
    try {
      await onInvitar(a.uid);
      setMetidos((s) => new Set(s).add(a.uid));
    } catch (error) {
      setFallo(error instanceof Error ? error.message : t.mesa.invitarFallo);
    } finally {
      setMetiendo(null);
    }
  }

  return (
    <Sheet onClose={onClose} titulo={t.mesa.anadeAmigo} sub={t.mesa.meteAmigoSub} cierre>
      <div className="mt-4 grid gap-2">
        {!conCuenta ? (
          <p className="text-[13px] leading-relaxed text-ink-faint">{t.mesa.sinCuentaMete}</p>
        ) : amigos === null ? (
          <p className="px-1 py-2 text-[13px] text-ink-faint">…</p>
        ) : aceptados.length === 0 ? (
          <p className="text-[13px] leading-relaxed text-ink-faint">{t.mesa.sinAmigos}</p>
        ) : (
          <ul className="grid gap-1.5">
            {aceptados.map((a) => {
              const dentro = metidos.has(a.uid) || nombresEnMesa.has(a.nombre.toLowerCase());
              return (
                <li key={a.uid} className="flex min-h-[54px] items-center gap-3 rounded-pieza bg-paper px-3">
                  <Avatar name={a.nombre} avatar={a.avatar} color="#5ec5c0" size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{a.nombre}</span>
                    {a.usuario && (
                      <span className="block truncate text-[12px] text-ink-faint">@{a.usuario}</span>
                    )}
                  </span>
                  {dentro ? (
                    <span className="shrink-0 text-[13px] font-semibold text-mint">{t.mesa.anadido}</span>
                  ) : (
                    <button
                      type="button"
                      disabled={metiendo !== null || !onInvitar}
                      onClick={() => void mete(a)}
                      className="min-h-[38px] shrink-0 rounded-pieza bg-amber px-3.5 text-[13px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
                    >
                      {metiendo === a.uid ? "…" : t.mesa.anadir}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {fallo && (
          <p className="text-[13px] leading-relaxed text-clay" role="alert">
            {fallo}
          </p>
        )}
      </div>
    </Sheet>
  );
}
