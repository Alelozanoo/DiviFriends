"use client";

import { useState } from "react";
import {
  aceptaAmigo,
  pideAmigoPorUid,
  recargaPendientes,
  type Amigo,
  type PerfilPublico,
} from "@/lib/cuenta";
import type { Participant } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { Avatar, Sheet } from "./ui";

/**
 * La ficha de alguien de la mesa: se abre tocándole en «Quién está».
 *
 * Su cara grande, su nombre y su @usuario, y debajo lo único que se puede
 * hacer con esa persona desde aquí: pedirle amistad. Hasta ahora los amigos
 * sólo se hacían por enlace; la mesa es el otro sitio natural, porque la
 * gente con la que compartes cuenta es justo la que quieres tener en la lista
 * para la próxima. El otro sigue teniendo que aceptar, igual que por enlace.
 *
 * El nombre y la cara son los de la mesa, no los de la cuenta: es como le
 * conoce quien está sentado con él.
 */
export default function PerfilMesaSheet({
  person,
  esYo,
  conCuenta,
  cuenta,
  amistad,
  yo,
  onAmigos,
  onClose,
}: {
  person: Participant;
  esYo: boolean;
  /** Si quien mira tiene cuenta: sin ella no hay amigos que pedir. */
  conCuenta: boolean;
  /** La cuenta de esta persona: `undefined` mientras llega, `null` si no tiene. */
  cuenta: PerfilPublico | null | undefined;
  /** Lo que hay entre vosotros, si hay algo. */
  amistad: Amigo | undefined;
  /** Tu cuenta, para saber si la petición pendiente es tuya o suya. */
  yo: string | null;
  /** La lista de amigos, tal y como la devuelve el servidor tras cada cambio. */
  onAmigos: (lista: Amigo[]) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [hecho, setHecho] = useState<"pedido" | "aceptado" | null>(null);

  async function haz(accion: () => Promise<{ amigos: Amigo[] }>, luego: "pedido" | "aceptado") {
    setOcupado(true);
    setAviso(null);
    try {
      const d = await accion();
      onAmigos(d.amigos);
      setHecho(luego);
      void recargaPendientes();
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  // Debajo del nombre: su usuario, o por qué no lo hay.
  const linea = !conCuenta
    ? null
    : cuenta === undefined
      ? "…"
      : cuenta === null
        ? t.perfilMesa.sinCuenta
        : cuenta.usuario
          ? `@${cuenta.usuario}`
          : t.perfilMesa.sinUsuario;

  // Lo que se puede hacer con esta persona, en orden de lo que manda.
  let accion: React.ReactNode = null;
  if (esYo) {
    accion = <p className="text-[13px] text-ink-faint">{t.perfilMesa.eresTu}</p>;
  } else if (!conCuenta) {
    accion = <p className="text-[13px] leading-relaxed text-ink-faint">{t.perfilMesa.conCuenta}</p>;
  } else if (cuenta) {
    if (hecho === "aceptado" || amistad?.estado === "aceptado") {
      accion = <p className="text-[15px] font-semibold text-mint">{t.perfilMesa.yaAmigos}</p>;
    } else if (hecho === "pedido" || (amistad && amistad.pedidoPor === yo)) {
      accion = <p className="text-[13px] leading-relaxed text-ink-faint">{t.perfilMesa.pedido}</p>;
    } else if (amistad) {
      accion = (
        <>
          <p className="text-[13px] text-ink-faint">{t.perfilMesa.teLoPide}</p>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void haz(() => aceptaAmigo(cuenta.uid), "aceptado")}
            className="mt-2 min-h-[48px] w-full rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {t.perfilMesa.aceptar}
          </button>
        </>
      );
    } else {
      accion = (
        <button
          type="button"
          disabled={ocupado}
          onClick={() => void haz(() => pideAmigoPorUid(cuenta.uid), "pedido")}
          className="min-h-[48px] w-full rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {ocupado ? "…" : t.perfilMesa.anadirAmigo}
        </button>
      );
    }
  }

  return (
    <Sheet onClose={onClose} cierre>
      <div className="flex flex-col items-center gap-3 px-2 pb-1 pt-5 text-center">
        <Avatar
          name={person.name}
          avatar={person.avatar || cuenta?.avatar}
          color={person.color}
          size={88}
        />
        <div className="min-w-0 max-w-full">
          <p className="truncate text-[21px] font-bold leading-tight tracking-[-0.025em]">{person.name}</p>
          {linea && <p className="tnum mt-1 truncate text-[13px] text-ink-faint">{linea}</p>}
        </div>
        {accion && <div className="mt-1 w-full">{accion}</div>}
        {aviso && (
          <p className="text-[13px] leading-relaxed text-clay" role="alert">
            {aviso}
          </p>
        )}
      </div>
    </Sheet>
  );
}
