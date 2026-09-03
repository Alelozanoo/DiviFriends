"use client";

import { useEffect, useState } from "react";
import { aceptaAmigo, amigos as cargaAmigos, pideAmigo, quitaAmigo, recargaPendientes, type Amigo } from "@/lib/cuenta";
import { useT, rellena } from "@/lib/i18n";
import { EV, track } from "@/lib/track";
import { Avatar, CerrarHoja, Sheet } from "./ui";

/**
 * Tus amigos: quién es, quién te lo pide, y cómo hacer más.
 *
 * Los amigos se hacen por enlace y no buscando por correo, y es a propósito:
 * buscar por correo le diría a cualquiera si una persona tiene cuenta. Aquí
 * cada uno tiene un enlace y lo manda por WhatsApp; el otro lo abre, pide, y
 * tú aceptas. Nadie entra en tu lista sin que digas que sí.
 */
export default function AmigosSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [lista, setLista] = useState<Amigo[] | null>(null);
  const [yo, setYo] = useState<string>("");
  const [codigo, setCodigo] = useState<string>("");
  const [miUsuario, setMiUsuario] = useState<string | null>(null);
  const [escrito, setEscrito] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    let vivo = true;
    cargaAmigos()
      .then((d) => {
        if (!vivo) return;
        setLista(d.amigos);
        setYo(d.yo);
        setCodigo(d.codigo);
        setMiUsuario(d.usuario);
      })
      .catch((e: Error) => vivo && setAviso(e.message));
    return () => {
      vivo = false;
    };
  }, []);

  // Con usuario elegido el enlace lo lleva a él —se lee y se recuerda—; si
  // no, el código, que vale igual.
  const enlace =
    typeof window !== "undefined" && (miUsuario || codigo)
      ? `${window.location.origin}/amigo/${miUsuario || codigo}`
      : "";

  async function comparte() {
    if (!enlace) return;
    const texto = t.amigos.invitacion;
    if (navigator.share) {
      try {
        await navigator.share({ title: "DiviFriends", text: texto, url: enlace });
        track(EV.comparte, { via: "amigo" });
      } catch {
        // lo cerró
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(enlace);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2200);
    } catch {
      // queda escrito debajo
    }
  }

  async function haz(accion: () => Promise<{ amigos: Amigo[] }>, bien?: string) {
    setOcupado(true);
    setAviso(null);
    try {
      const d = await accion();
      setLista(d.amigos);
      void recargaPendientes();
      if (bien) setAviso(bien);
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  const pendientesDeMi = lista?.filter((a) => a.estado === "pendiente" && a.pedidoPor !== yo) ?? [];
  const aceptados = lista?.filter((a) => a.estado === "aceptado") ?? [];
  const esperando = lista?.filter((a) => a.estado === "pendiente" && !pendientesDeMi.includes(a)) ?? [];

  return (
    <Sheet onClose={onClose} titulo={t.amigos.titulo} sub={t.amigos.entradilla}>
      <div className="mt-5 grid gap-3">
        {/* ------------------------------------------- tu enlace, lo primero */}
        <div className="grid gap-2.5 rounded-bloque bg-[#f4ece0] p-4 text-[#14100d]">
          <p className="text-[12px] text-[#6b5f52]">{t.amigos.tuEnlace}</p>
          <p className="tnum truncate text-[13px] font-semibold">{enlace || "…"}</p>
          <button
            type="button"
            onClick={() => void comparte()}
            disabled={!enlace}
            className="min-h-[48px] rounded-pieza bg-[#14100d] text-[15px] font-bold text-[#f4ece0] transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {copiado ? t.amigos.copiado : t.amigos.compartirEnlace}
          </button>
        </div>

        {/* ------------------------------------------- o pega el de otro */}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const c = escrito.trim();
            if (!c || ocupado) return;
            void haz(
              () => pideAmigo(c).then((d) => ({ amigos: d.amigos })),
              t.amigos.pedida,
            ).then(() => setEscrito(""));
          }}
        >
          <input
            value={escrito}
            onChange={(e) => setEscrito(e.target.value)}
            placeholder={t.amigos.pegaCodigo}
            aria-label={t.amigos.pegaCodigo}
            maxLength={40}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="tnum min-h-[48px] min-w-0 flex-1 rounded-pieza border border-line bg-paper px-4 text-[16px] font-semibold focus:border-amber focus:outline-none"
          />
          <button
            type="submit"
            disabled={!escrito.trim() || ocupado}
            className="min-h-[48px] rounded-pieza border border-line px-4 text-[15px] font-semibold text-ink transition-colors active:bg-paper-3 disabled:opacity-50"
          >
            {t.amigos.pedir}
          </button>
        </form>

        {aviso && <p className="text-[13px] text-ink-soft">{aviso}</p>}

        {/* ---------------------------------------------- quién te lo pide */}
        {pendientesDeMi.length > 0 && (
          <Bloque titulo={t.amigos.teLoPiden}>
            {pendientesDeMi.map((a) => (
              <Fila key={a.uid} amigo={a}>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void haz(() => aceptaAmigo(a.uid))}
                  className="min-h-[38px] rounded-pieza bg-amber px-3.5 text-[13px] font-bold text-paper"
                >
                  {t.amigos.aceptar}
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void haz(() => quitaAmigo(a.uid))}
                  aria-label={rellena(t.amigos.rechazarA, { name: a.nombre })}
                  className="min-h-[38px] rounded-pieza px-2.5 text-[13px] text-ink-faint hover:text-clay"
                >
                  ✕
                </button>
              </Fila>
            ))}
          </Bloque>
        )}

        {/* --------------------------------------------------- tus amigos */}
        <Bloque titulo={t.amigos.tusAmigos}>
          {lista === null ? (
            <p className="px-1 py-2 text-[13px] text-ink-faint">…</p>
          ) : aceptados.length === 0 ? (
            <p className="px-1 py-2 text-[13px] leading-relaxed text-ink-faint">{t.amigos.ninguno}</p>
          ) : (
            aceptados.map((a) => (
              <Fila key={a.uid} amigo={a}>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => void haz(() => quitaAmigo(a.uid))}
                  aria-label={rellena(t.amigos.quitarA, { name: a.nombre })}
                  className="min-h-[38px] rounded-pieza px-2.5 text-[13px] text-ink-faint hover:text-clay"
                >
                  ✕
                </button>
              </Fila>
            ))
          )}
        </Bloque>

        {esperando.length > 0 && (
          <Bloque titulo={t.amigos.esperando}>
            {esperando.map((a) => (
              <Fila key={a.uid} amigo={a}>
                <span className="text-[12px] text-ink-faint">{t.amigos.sinAceptar}</span>
              </Fila>
            ))}
          </Bloque>
        )}

        <p className="text-[12px] leading-relaxed text-ink-faint">{t.amigos.queVen}</p>
        <CerrarHoja onClick={onClose}>{t.amigos.cerrar}</CerrarHoja>
      </div>
    </Sheet>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 px-1 text-[12px] text-ink-faint">{titulo}</p>
      <ul className="grid gap-1.5">{children}</ul>
    </div>
  );
}

function Fila({ amigo, children }: { amigo: Amigo; children: React.ReactNode }) {
  return (
    <li className="flex min-h-[54px] items-center gap-3 rounded-pieza bg-paper px-3">
      <Avatar name={amigo.nombre} avatar={amigo.avatar} color="#5ec5c0" size={30} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{amigo.nombre}</span>
        {amigo.usuario && <span className="block truncate text-[12px] text-ink-faint">@{amigo.usuario}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1">{children}</span>
    </li>
  );
}
