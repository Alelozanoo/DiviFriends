"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  aceptaAmigo,
  amigos as cargaAmigos,
  avisos as cargaAvisos,
  marcaLeidos,
  quitaAmigo,
  recargaPendientes,
  type Amigo,
  type AvisoCampana,
} from "@/lib/cuenta";
import { useT, rellena } from "@/lib/i18n";
import { cuando } from "@/lib/misDivis";
import { Avatar, CerrarHoja, Sheet } from "./ui";

/**
 * La campana: lo que ha pasado con tus mesas y tus amigos.
 *
 * Son los mismos avisos que salen por correo —te han metido en una mesa, se
 * ha cerrado, te han pagado, te piden amistad—, leídos del mismo registro.
 * Así lo que ves aquí y lo que te llega al buzón es exactamente lo mismo, y
 * quien apaga los correos sigue enterándose por aquí.
 *
 * Abrirla es leerlos: el número de la campana se apaga al entrar, no al tocar
 * cada uno. Las solicitudes se aceptan desde aquí mismo.
 *
 * Dos cosas que fallaban y se arreglaron el 3 de septiembre de 2026: el punto
 * de «nuevo» se quedaba encendido aunque tocaras el aviso —ahora se apaga al
 * tocarlo, que es lo que uno espera—, y el enlace guardado era una dirección
 * absoluta que en los avisos anteriores al 1 de septiembre apuntaba a la
 * dirección interna del contenedor, así que tocarlos no llevaba a ningún
 * sitio. Se usa sólo la ruta, que siempre es de esta web.
 */
export default function NotificacionesSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [avisos, setAvisos] = useState<AvisoCampana[] | null>(null);
  const [solicitudes, setSolicitudes] = useState<Amigo[]>([]);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    Promise.all([cargaAvisos(), cargaAmigos()])
      .then(([a, m]) => {
        if (!vivo) return;
        setAvisos(a.avisos);
        setSolicitudes(m.amigos.filter((x) => x.estado === "pendiente" && x.pedidoPor !== m.yo));
      })
      .catch(() => vivo && setAvisos([]))
      // Vistos: el número de la campana se apaga, y la lista los enseña con
      // el punto de «nuevo» todavía puesto, que es lo que se acaba de leer.
      .finally(() => void marcaLeidos().then(recargaPendientes));
    return () => {
      vivo = false;
    };
  }, []);

  async function resuelve(accion: () => Promise<{ amigos: Amigo[] }>) {
    setOcupado(true);
    try {
      await accion();
      // Tras aceptar o rechazar, lo que quede pendiente lo dice la lista nueva.
      const m = await cargaAmigos();
      setSolicitudes(m.amigos.filter((x) => x.estado === "pendiente" && x.pedidoPor !== m.yo));
      void recargaPendientes();
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Sheet onClose={onClose} titulo={t.notificaciones.titulo} sub={t.notificaciones.entradilla}>
      <div className="mt-5 grid gap-3">
        {solicitudes.length > 0 && (
          <div>
            <p className="mb-1.5 px-1 text-[12px] text-ink-faint">{t.notificaciones.teLoPiden}</p>
            <ul className="grid gap-1.5">
              {solicitudes.map((a) => (
                <li key={a.uid} className="flex min-h-[54px] items-center gap-3 rounded-pieza bg-paper px-3">
                  <Avatar name={a.nombre} avatar={a.avatar} color="#5ec5c0" size={30} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{a.nombre}</span>
                    {a.usuario && <span className="block text-[12px] text-ink-faint">@{a.usuario}</span>}
                  </span>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void resuelve(() => aceptaAmigo(a.uid))}
                    className="min-h-[38px] rounded-pieza bg-amber px-3.5 text-[13px] font-bold text-paper"
                  >
                    {t.amigos.aceptar}
                  </button>
                  <button
                    type="button"
                    disabled={ocupado}
                    onClick={() => void resuelve(() => quitaAmigo(a.uid))}
                    aria-label={rellena(t.amigos.rechazarA, { name: a.nombre })}
                    className="min-h-[38px] rounded-pieza px-2.5 text-[13px] text-ink-faint hover:text-clay"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          {solicitudes.length > 0 && (
            <p className="mb-1.5 px-1 text-[12px] text-ink-faint">{t.notificaciones.avisos}</p>
          )}
          {avisos === null ? (
            <p className="px-1 py-3 text-[13px] text-ink-faint">…</p>
          ) : avisos.length === 0 ? (
            <p className="px-1 py-3 text-[13px] leading-relaxed text-ink-faint">{t.notificaciones.vacio}</p>
          ) : (
            <ul className="grid gap-1.5">
              {avisos.map((a) => (
                <li key={a.id}>
                  <Link
                    href={rutaDe(a.url)}
                    onClick={() => {
                      setAvisos((lista) =>
                        lista ? lista.map((x) => (x.id === a.id ? { ...x, leido: true } : x)) : lista,
                      );
                      onClose();
                    }}
                    className={`flex min-h-[56px] items-center gap-3 rounded-pieza px-3 py-2 transition-colors active:bg-paper-3 ${
                      a.leido ? "bg-paper" : "bg-clay/[0.10]"
                    }`}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-paper-3 text-ink-soft">
                      <Icono tipo={a.tipo} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-semibold leading-snug">{a.asunto}</span>
                      <span className="block text-[12px] text-ink-faint">{cuando(a.cuando, t)}</span>
                    </span>
                    {!a.leido && <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-clay" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <CerrarHoja onClick={onClose}>{t.notificaciones.cerrar}</CerrarHoja>
      </div>
    </Sheet>
  );
}

/**
 * Sólo la ruta del aviso, nunca su dominio: el aviso se creó en el servidor
 * con la dirección que él veía, y detrás del proxy no siempre era la pública.
 */
function rutaDe(url: string): string {
  try {
    const u = new URL(url, "https://divifriends.es");
    return `${u.pathname}${u.search}`;
  } catch {
    return "/";
  }
}

/* Un dibujo por tipo. Trazo de 1,9, como los del menú de la mesa. */
function Icono({ tipo }: { tipo: AvisoCampana["tipo"] }) {
  const comun = {
    width: 17,
    height: 17,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (tipo) {
    case "solicitud":
      return (
        <svg {...comun}>
          <circle cx="10" cy="8" r="3.4" />
          <path d="M3.5 20a6.5 6.5 0 0 1 13 0M18 8v6M15 11h6" />
        </svg>
      );
    case "pago":
      return (
        <svg {...comun}>
          <circle cx="12" cy="12" r="9" />
          <path d="M9 9.5c0-1.2 1.3-2 3-2s3 .8 3 2-1.3 2-3 2-3 .8-3 2 1.3 2 3 2 3-.8 3-2M12 6v1.5M12 16.5V18" />
        </svg>
      );
    case "cierre":
      return (
        <svg {...comun}>
          <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
          <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
        </svg>
      );
    default:
      return (
        <svg {...comun}>
          <path d="M5 3.5h14v17l-2.3-1.6-2.35 1.6L12 19l-2.35 1.5-2.35-1.6L5 20.5z" />
          <path d="M8.5 9h7M8.5 13h4.5" />
        </svg>
      );
  }
}
