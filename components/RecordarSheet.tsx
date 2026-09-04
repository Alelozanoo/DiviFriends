"use client";

import { useState } from "react";
import { recuerdaDeuda, type Recordado } from "@/lib/cuenta";
import { money } from "@/lib/format";
import { rellena, useT } from "@/lib/i18n";
import type { ParticipantBalance } from "@/lib/types";
import { Avatar, CerrarHoja, Sheet } from "./ui";

const TONOS = ["neutro", "serio", "gracioso", "agresivo"] as const;
type Tono = (typeof TONOS)[number];

/**
 * «Recuérdaselo»: el correo de «me debes», con el tono elegido.
 *
 * Quien pagó tiene delante a tres personas que le deben y ninguna gana de
 * escribir tres WhatsApps. Aquí elige el tono —el texto ya está escrito— y
 * DiviFriends manda el correo con la cifra, la mesa y el enlace. Una vez al
 * día por persona: la segunda vez la hoja lo dice, en vez de fingir que ha
 * salido.
 *
 * Si el otro no tiene cuenta, no hay correo al que escribir, y eso se dice
 * tal cual: es la razón más honrada que hay para que se la haga.
 */
export default function RecordarSheet({
  code,
  persona,
  cents,
  currency,
  miAsiento,
  onClose,
}: {
  code: string;
  persona: ParticipantBalance;
  /** Lo que te debe a ti, que es lo que va en el correo. */
  cents: number;
  currency: string;
  miAsiento: string | null;
  onClose: () => void;
}) {
  const t = useT();
  const [tono, setTono] = useState<Tono>("neutro");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<Recordado | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setFallo(null);
    try {
      const r = await recuerdaDeuda(code, persona.participantId, tono, miAsiento);
      setResultado(r.resultado);
    } catch (error) {
      setFallo(error instanceof Error ? error.message : t.recordar.fallo);
    } finally {
      setEnviando(false);
    }
  }

  const dinero = money(cents, currency);

  return (
    <Sheet
      onClose={onClose}
      titulo={rellena(t.recordar.titulo, { name: persona.name })}
      sub={rellena(t.recordar.entradilla, { dinero })}
    >
      {resultado ? (
        <Resultado resultado={resultado} nombre={persona.name} onClose={onClose} />
      ) : (
        <>
          <div className="mt-5 flex items-center gap-3 rounded-pieza bg-paper px-3.5 py-3">
            <Avatar name={persona.name} avatar={persona.avatar} color={persona.color} size={36} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{persona.name}</span>
              <span className="block text-[12px] text-ink-faint">{t.recordar.leLlega}</span>
            </span>
            <span className="tnum shrink-0 text-[17px] font-bold text-amber">{dinero}</span>
          </div>

          {/* El tono: cuatro, con una línea de muestra para no elegir a ciegas. */}
          <p className="mt-5 px-1 text-[12px] text-ink-faint">{t.recordar.tono}</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.recordar.tono}>
            {TONOS.map((opcion) => {
              const activo = opcion === tono;
              return (
                <button
                  key={opcion}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setTono(opcion)}
                  className={`min-h-[64px] rounded-pieza border px-3 py-2.5 text-left transition-colors ${
                    activo ? "border-amber bg-amber/10" : "border-line-soft bg-paper active:bg-paper-3"
                  }`}
                >
                  <span className={`block text-[14px] font-bold ${activo ? "text-amber" : "text-ink"}`}>
                    {t.recordar.tonos[opcion].nombre}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-snug text-ink-faint">
                    {t.recordar.tonos[opcion].muestra}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 px-1 text-[12px] leading-relaxed text-ink-faint">{t.recordar.unaAlDia}</p>

          {fallo && (
            <p className="mt-3 text-[13px] font-semibold text-clay" role="alert">
              {fallo}
            </p>
          )}

          <button
            type="button"
            onClick={() => void enviar()}
            disabled={enviando}
            className="mt-4 min-h-[52px] w-full rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {enviando ? t.recordar.enviando : t.recordar.enviar}
          </button>
          <div className="mt-2">
            <CerrarHoja onClick={onClose}>{t.perfil.cancelar}</CerrarHoja>
          </div>
        </>
      )}
    </Sheet>
  );
}

/**
 * Lo que ha pasado, dicho con la verdad: «enviado» sólo cuando ha salido. Lo
 * demás son razones, y cada una lleva lo que se puede hacer.
 */
function Resultado({
  resultado,
  nombre,
  onClose,
}: {
  resultado: Recordado;
  nombre: string;
  onClose: () => void;
}) {
  const t = useT();
  const bien = resultado === "mandado";
  const texto: Record<Recordado, string> = {
    mandado: t.recordar.mandado,
    repetido: t.recordar.repetido,
    "sin-cuenta": rellena(t.recordar.sinCuenta, { name: nombre }),
    baja: rellena(t.recordar.baja, { name: nombre }),
    tope: t.recordar.tope,
    "sin-correo": t.recordar.fallo,
    fallo: t.recordar.fallo,
  };
  return (
    <div className="mt-5">
      <p className={`text-[15px] font-semibold ${bien ? "text-mint" : "text-ink"}`}>
        {bien ? t.recordar.mandadoTitulo : t.recordar.noMandadoTitulo}
      </p>
      <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{texto[resultado]}</p>
      <div className="mt-5">
        <CerrarHoja onClick={onClose}>{t.cuenta.cerrar}</CerrarHoja>
      </div>
    </div>
  );
}
