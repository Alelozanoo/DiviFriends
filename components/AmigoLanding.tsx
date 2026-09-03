"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { pideAmigo, useCuenta, usuarioActual } from "@/lib/cuenta";
import { useT, rellena } from "@/lib/i18n";
import { Avatar } from "./ui";

/**
 * El enlace de amigo, abierto.
 *
 * Dice quién te lo manda —nombre y cara, que es lo único público— y un botón.
 * Sin cuenta, el botón es entrar con Google; en cuanto entras se pide la
 * amistad sola, que para eso has abierto el enlace. Con cuenta, se pide al
 * momento. En los dos casos el otro tiene que aceptar: aquí sólo se llama.
 */
export default function AmigoLanding({ codigo }: { codigo: string }) {
  const t = useT();
  const { usuario, entrar, ocupado, fallo } = useCuenta();
  const [quien, setQuien] = useState<
    { nombre: string; avatar: string | null; usuario?: string | null } | null | undefined
  >(undefined);
  const [hecho, setHecho] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pidiendo, setPidiendo] = useState(false);

  useEffect(() => {
    fetch(`/api/amigos/${encodeURIComponent(codigo)}`)
      .then(async (r) =>
        r.ok ? ((await r.json()) as { nombre: string; avatar: string | null; usuario?: string | null }) : null,
      )
      .then(setQuien)
      .catch(() => setQuien(null));
  }, [codigo]);

  async function pide() {
    if (pidiendo) return;
    setPidiendo(true);
    setAviso(null);
    try {
      const d = await pideAmigo(codigo);
      setHecho(d.perfil.nombre);
    } catch (e) {
      setAviso((e as Error).message);
    } finally {
      setPidiendo(false);
    }
  }

  /*
    Al entrar desde aquí, se pide sola: para eso se abrió el enlace.

    `entrar()` vuelve cuando Google cierra su ventana, pero el usuario llega
    un instante después por el oyente de Firebase. Se espera a que esté —dos
    segundos como mucho— y se pide, todo dentro del mismo toque y sin efectos.
  */
  async function entraYPide() {
    await entrar();
    for (let i = 0; i < 20 && !usuarioActual(); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (usuarioActual()) await pide();
  }

  if (quien === undefined) return <Marco>…</Marco>;

  if (quien === null) {
    return (
      <Marco>
        <h1 className="text-[26px] font-bold tracking-[-0.03em]">{t.amigos.enlaceRoto}</h1>
        <p className="mt-2 text-ink-soft">{t.amigos.enlaceRotoAviso}</p>
        <Volver />
      </Marco>
    );
  }

  if (hecho) {
    return (
      <Marco>
        <Avatar name={quien.nombre} avatar={quien.avatar ?? undefined} color="#5ec5c0" size={64} />
        <h1 className="mt-4 text-[26px] font-bold tracking-[-0.03em]">{rellena(t.amigos.pedidaA, { name: hecho })}</h1>
        <p className="mt-2 text-ink-soft">{t.amigos.pedidaAviso}</p>
        <Volver />
      </Marco>
    );
  }

  return (
    <Marco>
      <Avatar name={quien.nombre} avatar={quien.avatar ?? undefined} color="#5ec5c0" size={64} />
      <h1 className="mt-4 text-[26px] font-bold tracking-[-0.03em]">
        {rellena(t.amigos.quiereSerTuAmigo, { name: quien.nombre })}
      </h1>
      {quien.usuario && <p className="mt-1 text-[14px] text-ink-faint">@{quien.usuario}</p>}
      <p className="mt-2 text-ink-soft">{t.amigos.paraQue}</p>

      <div className="mt-6 grid gap-2.5">
        {usuario ? (
          <button
            type="button"
            onClick={() => void pide()}
            disabled={pidiendo}
            className="min-h-[52px] rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {rellena(t.amigos.aceptarA, { name: quien.nombre })}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void entraYPide()}
            disabled={ocupado || usuario === undefined}
            className="min-h-[52px] rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {t.amigos.entrarParaAceptar}
          </button>
        )}
        {(aviso || fallo) && (
          <p className="text-[13px] text-clay" role="alert">
            {aviso ?? (fallo ? t.cuenta[fallo] : "")}
          </p>
        )}
        <Link href="/" className="min-h-[46px] rounded-pieza border border-line px-4 py-3 text-center text-[15px] font-semibold text-ink-soft">
          {t.amigos.ahoraNo}
        </Link>
      </div>
    </Marco>
  );
}

function Marco({ children }: { children: React.ReactNode }) {
  return (
    <main id="contenido" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-[var(--gutter)] py-16">
      {children}
    </main>
  );
}

function Volver() {
  return (
    <Link href="/" className="mt-6 inline-block min-h-[46px] rounded-pieza bg-amber px-5 py-3 text-[15px] font-bold text-paper">
      DiviFriends
    </Link>
  );
}
