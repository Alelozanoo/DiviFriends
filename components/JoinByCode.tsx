"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";

/** Los mismos que genera `ticketCode`: sin I, O, 0 ni 1. */
const ALFABETO = /[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]/;
const LARGO = 6;

/**
 * Dos tonos, porque se pinta en dos sitios: dentro del papel crema del
 * escritorio, y sobre el café oscuro de la portada del móvil. Las casillas
 * y el botón cambian de tinta; el campo de detrás es el mismo.
 */
export default function JoinByCode({ tono = "papel" }: { tono?: "papel" | "oscuro" } = {}) {
  const t = useT();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [foco, setFoco] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** El último código que se preguntó al servidor, para no preguntarlo dos veces. */
  const probado = useRef<string | null>(null);
  /** Si hay una comprobación en vuelo: el estado de React llega tarde para esto. */
  const enVuelo = useRef(false);

  /*
    Se entra sola al escribir la sexta letra.

    Había un botón «Entrar» debajo de las casillas, y era un toque de más:
    un código de seis letras no admite más que una respuesta, y la gente lo
    escribe y se queda esperando. Se pidió el 3 de septiembre de 2026 que
    no hiciera falta pulsar nada. Sigue valiendo la tecla Intro, para quien
    la use, y pegar el código desde WhatsApp también dispara la comprobación,
    porque llega a seis letras igual.

    Si el código no existe, se queda escrito con el aviso debajo: borrar una
    letra y corregirla vuelve a comprobar. Lo que no se hace es preguntar dos
    veces por el mismo código seguido.
  */
  async function comprueba(clean: string) {
    if (enVuelo.current) return;
    enVuelo.current = true;
    probado.current = clean;
    setChecking(true);
    setError(null);
    try {
      const response = await fetch(`/api/tickets/${clean}`);
      if (!response.ok) {
        setError(t.varios.codigoNoExiste);
        return;
      }
      router.push(`/t/${clean}`);
    } catch {
      setError(t.cuenta.sinRed);
    } finally {
      enVuelo.current = false;
      setChecking(false);
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < LARGO) {
      setError(t.varios.codigoCorto);
      return;
    }
    void comprueba(clean);
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
          onChange={(event) => {
            const limpio = event.target.value
              .toUpperCase()
              .split("")
              .filter((c) => ALFABETO.test(c))
              .join("")
              .slice(0, LARGO);
            setCode(limpio);
            setError(null);
            if (limpio.length === LARGO && limpio !== probado.current) void comprueba(limpio);
          }}
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
                /* Tinta sobre papel, como el resto de la hoja: esto sólo se
                   pinta dentro del ticket crema, y con los colores del tema
                   oscuro las casillas salían como seis bloques negros. */
                className={`tnum grid h-14 flex-1 place-items-center rounded-pieza border-[1.5px] text-[22px] font-bold transition-colors ${
                  tono === "oscuro"
                    ? `text-ink ${activa ? "border-amber bg-amber/[0.07]" : "border-line-soft bg-paper-2"}`
                    : `text-[#14100d] ${activa ? "border-[#14100d] bg-white" : "border-[#c9bda9] bg-[#fbf6ee]"}`
                }`}
              >
                {code[i] ?? ""}
              </span>
            );
          })}
        </div>
      </div>

      {/* Una sola línea debajo de las casillas: «Buscando…» mientras se
          pregunta, y el aviso si no existe. Con alto mínimo para que las
          casillas no bailen cuando aparece. */}
      <p
        role={error ? "alert" : undefined}
        aria-live="polite"
        className={`min-h-[20px] text-center text-[13px] leading-relaxed ${
          error ? "text-clay" : tono === "oscuro" ? "text-ink-soft" : "text-[#6b5f52]"
        }`}
      >
        {error ?? (checking ? t.codigo.buscando : "")}
      </p>
    </form>
  );
}
