"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Creador } from "@/lib/tiktok";

/**
 * La pantalla de publicar en TikTok.
 *
 * El orden de arriba abajo no es estético: es el que exigen las normas de
 * TikTok. Primero en qué cuenta se publica, después el vídeo, después los
 * ajustes que esa cuenta permite —privacidad, comentarios, dúos, stitches— y
 * la declaración de contenido comercial, y solo al final el botón. Nada se
 * publica sin que el creador haya visto y elegido todo eso.
 */

const NOMBRE_PRIVACIDAD: Record<string, string> = {
  PUBLIC_TO_EVERYONE: "Todo el mundo",
  MUTUAL_FOLLOW_FRIENDS: "Amigos (seguimiento mutuo)",
  FOLLOWER_OF_CREATOR: "Mis seguidores",
  SELF_ONLY: "Solo yo",
};

type Estado =
  | { fase: "quieto" }
  | { fase: "subiendo" }
  | { fase: "procesando"; publishId: string }
  | { fase: "hecho" }
  | { fase: "fallo"; motivo: string };

export default function Publicador({ aviso }: { aviso?: string }) {
  const [creador, setCreador] = useState<Creador | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(aviso ?? "");

  const [video, setVideo] = useState<File | null>(null);
  const [titulo, setTitulo] = useState("");
  const [privacidad, setPrivacidad] = useState("");
  const [comentarios, setComentarios] = useState(true);
  const [duetos, setDuetos] = useState(true);
  const [stitches, setStitches] = useState(true);
  const [comercial, setComercial] = useState(false);
  const [marcaPropia, setMarcaPropia] = useState(false);
  const [estado, setEstado] = useState<Estado>({ fase: "quieto" });
  const refFichero = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/tiktok/publicar")
      .then((r) => r.json())
      .then((d) => {
        if (d.conectado) setCreador(d.creador);
        if (d.aviso) setError(d.aviso);
      })
      .catch(() => setError("No pude hablar con TikTok."))
      .finally(() => setCargando(false));
  }, []);

  // Mientras TikTok procesa el vídeo se pregunta cada cinco segundos. Publicar
  // no es instantáneo y dejar la pantalla muda haría pensar que se colgó.
  const seguir = useCallback((publishId: string) => {
    const reloj = setInterval(async () => {
      const r = await fetch("/api/tiktok/publicar", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publishId }),
      });
      const d = await r.json();
      if (d.estado === "PUBLISH_COMPLETE") {
        clearInterval(reloj);
        setEstado({ fase: "hecho" });
      } else if (d.estado === "FAILED") {
        clearInterval(reloj);
        setEstado({ fase: "fallo", motivo: d.motivo || "TikTok lo rechazó." });
      }
    }, 5000);
    return () => clearInterval(reloj);
  }, []);

  useEffect(() => {
    if (estado.fase === "procesando") return seguir(estado.publishId);
  }, [estado, seguir]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!video || !privacidad) return;
    setEstado({ fase: "subiendo" });

    const form = new FormData();
    form.set("video", video);
    form.set("titulo", titulo);
    form.set("privacidad", privacidad);
    form.set("comentarios", comentarios ? "1" : "0");
    form.set("duetos", duetos ? "1" : "0");
    form.set("stitches", stitches ? "1" : "0");
    form.set("comercial", comercial ? "1" : "0");
    form.set("marcaPropia", marcaPropia ? "1" : "0");

    const r = await fetch("/api/tiktok/publicar", { method: "POST", body: form });
    const d = await r.json();
    if (!r.ok) return setEstado({ fase: "fallo", motivo: d.error || "No se pudo publicar." });
    setEstado({ fase: "procesando", publishId: d.publishId });
  }

  if (cargando) return <p className="text-[15px] text-ink-soft">Un momento…</p>;

  if (!creador) {
    return (
      <div>
        {error && <Aviso>{error}</Aviso>}
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Conecta la cuenta de TikTok en la que quieres publicar. Te llevamos a TikTok
          para que des permiso y vuelves aquí.
        </p>
        <a
          href="/api/tiktok/entrar"
          className="mt-6 inline-flex h-12 items-center rounded-full bg-ink px-6 font-semibold text-paper"
        >
          Conectar con TikTok
        </a>
      </div>
    );
  }

  // Solo se ofrece lo que la cuenta permite de verdad. Un interruptor que no
  // hace nada es peor que no tenerlo.
  const permitidos = creador.privacidades.filter((p) => NOMBRE_PRIVACIDAD[p]);

  return (
    <form onSubmit={enviar} className="space-y-8">
      {error && <Aviso>{error}</Aviso>}

      <section>
        <Rotulo>Publicas en</Rotulo>
        <div className="mt-2 flex items-center gap-3 rounded-2xl border border-line p-3">
          {creador.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={creador.avatar} alt="" className="size-11 rounded-full" />
          )}
          <div>
            <p className="font-semibold">{creador.nombre}</p>
            <p className="text-[13px] text-ink-soft">@{creador.usuario}</p>
          </div>
          <a href="/api/tiktok/salir" className="ml-auto text-[13px] underline">
            Cambiar
          </a>
        </div>
      </section>

      <section>
        <Rotulo>El vídeo</Rotulo>
        <input
          ref={refFichero}
          type="file"
          accept="video/mp4,video/quicktime"
          onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-[15px]"
          required
        />
        {creador.segundosMax > 0 && (
          <p className="mt-1 text-[13px] text-ink-soft">
            Tu cuenta admite hasta {creador.segundosMax} segundos.
          </p>
        )}
      </section>

      <section>
        <Rotulo>Descripción</Rotulo>
        <textarea
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          rows={3}
          maxLength={2200}
          className="mt-2 w-full rounded-2xl border border-line p-3 text-[15px]"
          placeholder="Lo que se lee debajo del vídeo"
        />
      </section>

      <section>
        <Rotulo>Quién puede verlo</Rotulo>
        <div className="mt-2 space-y-2">
          {permitidos.map((p) => (
            <label key={p} className="flex items-center gap-3 text-[15px]">
              <input
                type="radio"
                name="privacidad"
                value={p}
                checked={privacidad === p}
                onChange={() => setPrivacidad(p)}
                required
              />
              {NOMBRE_PRIVACIDAD[p]}
            </label>
          ))}
        </div>
      </section>

      <section>
        <Rotulo>Interacción</Rotulo>
        <div className="mt-2 space-y-2">
          <Casilla
            marcada={comentarios} cambiar={setComentarios}
            bloqueada={creador.comentarioBloqueado} texto="Permitir comentarios"
          />
          <Casilla
            marcada={duetos} cambiar={setDuetos}
            bloqueada={creador.duetoBloqueado} texto="Permitir dúos"
          />
          <Casilla
            marcada={stitches} cambiar={setStitches}
            bloqueada={creador.stitchBloqueado} texto="Permitir stitches"
          />
        </div>
      </section>

      <section>
        <Rotulo>Contenido comercial</Rotulo>
        <div className="mt-2 space-y-2">
          <Casilla
            marcada={comercial} cambiar={setComercial}
            texto="Esto promociona un producto o una marca"
          />
          {comercial && (
            <div className="ml-6 space-y-2">
              <Casilla
                marcada={marcaPropia} cambiar={setMarcaPropia}
                texto="Es mi propia marca"
              />
              <p className="text-[13px] text-ink-soft">
                Al publicarlo aceptas las{" "}
                <a className="underline" href="https://www.tiktok.com/legal/page/global/bc-policy/es">
                  Normas de contenido de marca
                </a>{" "}
                de TikTok.
              </p>
            </div>
          )}
        </div>
      </section>

      <div>
        <button
          type="submit"
          disabled={!video || !privacidad || estado.fase === "subiendo" || estado.fase === "procesando"}
          className="h-12 rounded-full bg-ink px-6 font-semibold text-paper disabled:opacity-40"
        >
          {estado.fase === "subiendo" ? "Subiendo el vídeo…"
            : estado.fase === "procesando" ? "TikTok lo está procesando…"
            : "Publicar en TikTok"}
        </button>

        {estado.fase === "hecho" && (
          <p className="mt-3 text-[15px] font-semibold">Publicado. Ya está en tu perfil.</p>
        )}
        {estado.fase === "fallo" && <Aviso>{estado.motivo}</Aviso>}
      </div>
    </form>
  );
}

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
      {children}
    </h2>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <p className="my-3 rounded-2xl border border-line bg-[color-mix(in_srgb,var(--amber)_12%,transparent)] p-3 text-[14px]">
      {children}
    </p>
  );
}

function Casilla({
  marcada, cambiar, texto, bloqueada,
}: {
  marcada: boolean;
  cambiar: (v: boolean) => void;
  texto: string;
  bloqueada?: boolean;
}) {
  return (
    <label className={`flex items-center gap-3 text-[15px] ${bloqueada ? "opacity-40" : ""}`}>
      <input
        type="checkbox"
        checked={marcada && !bloqueada}
        disabled={bloqueada}
        onChange={(e) => cambiar(e.target.checked)}
      />
      {texto}
      {bloqueada && <span className="text-[13px] text-ink-soft">(tu cuenta no lo permite)</span>}
    </label>
  );
}
