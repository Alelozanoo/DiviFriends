"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useT } from "@/lib/i18n";

/** Los mismos que genera `ticketCode`: sin I, O, 0 ni 1. */
const ALFABETO = /[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/;
const LARGO = 6;

export default function JoinByCode() {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [foco, setFoco] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < LARGO) {
      setError(t.varios.codigoCorto);
      return;
    }
    setChecking(true);
    setError(null);
    const response = await fetch(`/api/tickets/${clean}`);
    setChecking(false);
    if (!response.ok) {
      setError(t.varios.codigoNoExiste);
      return;
    }
    router.push(`/t/${clean}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-2.5">
      {/*
        Seis casillas, y detrás un solo campo de verdad.

        Seis <input> sueltos parecen lo mismo y traen media docena de problemas
        —pegar el código desde WhatsApp, borrar hacia atrás, el autorrelleno—
        que hay que resolver a mano y casi nunca del todo. Aquí el que escribe
        es uno solo, invisible encima de las casillas, y las casillas sólo
        pintan lo que lleva.

        Y filtra por el alfabeto del generador: una comanda nunca lleva I, O, 0
        ni 1, justo para que no se confundan al dictarla, así que teclear una de
        ésas es siempre un error y no vale la pena dejarla entrar.
      */}
      <div className="relative">
        <input
          autoFocus
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value
                .toUpperCase()
                .split("")
                .filter((c) => ALFABETO.test(c))
                .join("")
                .slice(0, LARGO),
            )
          }
          onFocus={() => setFoco(true)}
          onBlur={() => setFoco(false)}
          maxLength={LARGO}
          autoCapitalize="characters"
          autoComplete="one-time-code"
          spellCheck={false}
          aria-label={t.codigo.etiqueta}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer text-transparent caret-transparent opacity-0 outline-none"
        />
        <div aria-hidden className="flex gap-1.5">
          {Array.from({ length: LARGO }, (_, i) => {
            const activa =
              foco && (i === code.length || (i === LARGO - 1 && code.length === LARGO));
            return (
              <span
                key={i}
                className={`tnum grid h-14 flex-1 place-items-center rounded-xl border text-[21px] font-bold transition-colors ${
                  activa ? "border-amber bg-amber/[0.06]" : "border-line-soft bg-paper"
                }`}
              >
                {code[i] ?? ""}
              </span>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={checking || code.length < LARGO}
        className="min-h-[52px] w-full rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        {checking ? t.codigo.buscando : t.codigo.entrar}
      </button>

      {error && (
        <p role="alert" className="text-[13px] leading-relaxed text-clay">
          {error}
        </p>
      )}
    </form>
  );
}
