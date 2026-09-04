"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { llama } from "@/lib/cuenta";
import { money } from "@/lib/format";
import { cuando } from "@/lib/misDivis";
import { useT } from "@/lib/i18n";
import type { Metricas } from "@/lib/metricas";
import type { MetricasCuentas } from "@/lib/metricasCuentas";
import CuentaBoton from "./CuentaBoton";

/**
 * El panel de la casa: lo que ve hola@divifriends.es al entrar.
 *
 * Es /metricas sin la llave en la URL y con lo que aquélla no enseña: quién
 * se ha registrado —con su correo— y las últimas mesas. Se pide al servidor
 * cada veinte segundos y al volver a la pestaña, que para mirar cómo va el
 * día es tiempo real de sobra sin abrir Firestore al navegador. Sólo en
 * castellano: es de Alejandro, no de los usuarios.
 */
interface Resumen {
  generado: string;
  modelo: string;
  m: Metricas;
  c: MetricasCuentas;
  lecturas: { hechas: number; tope: number; desde: string | null };
  usuarios: {
    uid: string;
    nombre: string | null;
    correo: string | null;
    usuario: string | null;
    novedades: boolean;
    terminos: string | null;
    creada: string | null;
    divis: number;
  }[];
  mesas: {
    code: string;
    place: string | null;
    creada: string;
    personas: number;
    lineas: number;
    total: number;
    currency: string;
    cerrada: boolean;
  }[];
}

const CADA_MS = 30_000;
const SISTEMA = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif';

export default function Admin({ onComoUsuario }: { onComoUsuario: () => void }) {
  const t = useT();
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [hace, setHace] = useState(0);

  const carga = useCallback(async () => {
    try {
      const r = await llama<Resumen>("/api/admin/resumen");
      setDatos(r);
      setFallo(null);
      setHace(0);
    } catch (error) {
      setFallo(error instanceof Error ? error.message : "No se ha podido cargar.");
    }
  }, []);

  useEffect(() => {
    // La primera carga nada más entrar; el estado llega por la red, no de aquí.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void carga();
    // Sólo con la pestaña a la vista: un panel olvidado en segundo plano no
    // tiene que estar leyendo Firestore toda la tarde.
    const cada = setInterval(() => {
      if (document.visibilityState === "visible") void carga();
    }, CADA_MS);
    const reloj = setInterval(() => setHace((s) => s + 1), 1000);
    const alVolver = () => {
      if (document.visibilityState === "visible") void carga();
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(cada);
      clearInterval(reloj);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [carga]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col pb-10" style={{ fontFamily: SISTEMA }}>
      <header className="flex items-start justify-between px-4 pt-4">
        <div className="pt-2">
          <p className="text-[13px] font-semibold text-ink-faint">Hola, admin</p>
          <h1 className="mt-0.5 text-[34px] font-bold leading-[1.1] tracking-[-0.5px]">La casa</h1>
        </div>
        <div className="pt-2">
          <CuentaBoton />
        </div>
      </header>

      <div className="mt-2 flex items-center justify-between px-4 text-[13px] text-ink-faint">
        <span>
          {datos ? `Actualizado hace ${hace} s · cada ${CADA_MS / 1000} s` : fallo ? fallo : "Cargando…"}
        </span>
        <button type="button" onClick={() => void carga()} className="-mr-2 min-h-[32px] px-2 font-semibold text-amber">
          Ahora
        </button>
      </div>

      {datos && (
        <div className="px-4">
          {/* ── lo de hoy, de un vistazo */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Cifra etiqueta="Registros hoy" valor={datos.c.cuentas.hoy} nota={`${datos.c.cuentas.semana} en 7 días · ${datos.c.cuentas.total} en total`} tono="text-mint" />
            <Cifra etiqueta="Divis hoy" valor={datos.m.hoy} nota={`${datos.m.semana} en 7 días · ${datos.m.total} en total`} tono="text-amber" />
            <Cifra etiqueta="Gente apuntada hoy" valor={datos.m.personas.hoy} nota={`${datos.m.personas.media.toFixed(1)} por divi · ${datos.m.personas.dosOMas} % con dos o más`} />
            <Cifra
              etiqueta="Coste hoy"
              valor={`${datos.m.coste.hoy.toFixed(2)} $`}
              nota={`${datos.lecturas.hechas} de ${datos.lecturas.tope} lecturas del día · ${datos.modelo}`}
              tono={datos.lecturas.hechas > datos.lecturas.tope * 0.8 ? "text-clay" : undefined}
            />
          </div>

          <Grupo titulo="Divis por día" nota="Últimos catorce días">
            <Barras datos={datos.m.porDia} />
          </Grupo>

          <Grupo titulo="Registros por día" nota="Últimos catorce días">
            <Barras datos={datos.c.cuentas.porDia} />
          </Grupo>

          {/* ── quién se ha registrado */}
          <Grupo titulo="Registrados" nota={`${datos.usuarios.length} cuentas · ${datos.usuarios.filter((u) => u.novedades).length} quieren novedades`}>
            {datos.usuarios.length === 0 ? (
              <p className="px-4 py-3 text-[14px] text-ink-faint">Nadie todavía.</p>
            ) : (
              datos.usuarios.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 border-t border-line-soft px-4 py-2.5 first:border-t-0">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber text-[14px] font-bold text-paper">
                    {(u.nombre ?? u.correo ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                      {u.nombre ?? "Sin nombre"}
                      {u.usuario && <span className="ml-1.5 font-normal text-ink-faint">@{u.usuario}</span>}
                    </span>
                    <span className="block truncate text-[12.5px] text-ink-faint">{u.correo ?? "sin correo"}</span>
                  </span>
                  <span className="shrink-0 text-right text-[12px] text-ink-faint">
                    <span className={`block font-semibold ${u.novedades ? "text-mint" : "text-ink-faint"}`}>
                      {u.novedades ? "novedades" : u.terminos ? "sin novedades" : "sin registrar"}
                    </span>
                    {u.creada ? cuando(u.creada, t) : ""}
                    {u.divis > 0 ? ` · ${u.divis} divis` : ""}
                  </span>
                </div>
              ))
            )}
          </Grupo>

          {/* ── las últimas mesas */}
          <Grupo titulo="Últimas mesas" nota="Las treinta más recientes">
            {datos.mesas.map((mesa) => (
              <Link key={mesa.code} href={`/t/${mesa.code}`} className="flex items-center gap-3 border-t border-line-soft px-4 py-2.5 first:border-t-0 active:bg-paper-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {mesa.place ?? mesa.code}
                    <span className="ml-1.5 font-mono text-[12px] font-normal text-ink-faint">{mesa.code}</span>
                  </span>
                  <span className="block text-[12.5px] text-ink-faint">
                    {cuando(mesa.creada, t)} · {mesa.personas} {mesa.personas === 1 ? "persona" : "personas"} · {mesa.lineas} líneas
                    {mesa.cerrada ? " · cerrada" : ""}
                  </span>
                </span>
                <span className="shrink-0 text-[15px] font-semibold [font-variant-numeric:tabular-nums]">{money(mesa.total, mesa.currency)}</span>
              </Link>
            ))}
          </Grupo>

          {/* ── lo demás, en cifras */}
          <Grupo titulo="Hasta dónde llegan" nota="Cuántos divis alcanzan cada paso">
            <div className="px-4 py-3">
              {datos.m.embudo.map((p) => (
                <div key={p.etiqueta} className="flex items-center gap-3 py-1.5 text-[14px]">
                  <span className="w-[42%] text-ink-soft">{p.etiqueta}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3">
                    <span className="block h-full rounded-full bg-amber" style={{ width: `${p.pct}%` }} />
                  </span>
                  <span className="w-12 text-right font-semibold [font-variant-numeric:tabular-nums]">{p.n}</span>
                </div>
              ))}
            </div>
          </Grupo>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Cifra etiqueta="Correos hoy" valor={datos.c.correos.hoy} nota={`${datos.c.correos.tope.hechos} de ${datos.c.correos.tope.max} del tope · ${datos.c.correos.total} en total`} />
            <Cifra etiqueta="Amistades" valor={datos.c.amigos.amistades} nota={`${datos.c.amigos.pendientes} solicitudes sin aceptar`} />
            <Cifra etiqueta="Coste 7 días" valor={`${datos.m.coste.semana.toFixed(2)} $`} nota={`${datos.m.coste.total.toFixed(2)} $ desde el principio`} />
            <Cifra etiqueta="Mesas sin nada" valor={datos.m.nonatas.hoy} nota={`${datos.m.nonatas.total} en total: fotos que no llegaron a mesa`} tono={datos.m.nonatas.hoy > 3 ? "text-clay" : undefined} />
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[13px] text-ink-faint">
            <button type="button" onClick={onComoUsuario} className="py-2 font-semibold text-amber">
              Ver mis mesas
            </button>
            <Link href="/metricas" className="py-2 underline underline-offset-2">
              La página larga de métricas
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Cifra({ etiqueta, valor, nota, tono }: { etiqueta: string; valor: number | string; nota?: string; tono?: string }) {
  return (
    <div className="rounded-pieza bg-paper-2 px-4 py-3.5">
      <p className="text-[13px] text-ink-faint">{etiqueta}</p>
      <p className={`mt-1 text-[26px] font-semibold tracking-[-0.02em] [font-variant-numeric:tabular-nums] ${tono ?? ""}`}>
        {typeof valor === "number" ? valor.toLocaleString("es-ES") : valor}
      </p>
      {nota && <p className="mt-1 text-[12px] leading-snug text-ink-faint">{nota}</p>}
    </div>
  );
}

function Grupo({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 px-4 text-[13px] text-ink-faint">
        <span className="font-semibold text-ink-soft">{titulo}</span>
        {nota && <span className="truncate">{nota}</span>}
      </div>
      <div className="overflow-hidden rounded-pieza bg-paper-2">{children}</div>
    </section>
  );
}

/** Barras sencillas: la más alta llena la altura, las demás a escala. */
function Barras({ datos }: { datos: { etiqueta: string; n: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.n));
  return (
    <div className="flex h-28 items-end gap-1 px-4 pb-3 pt-4">
      {datos.map((d) => (
        <div key={d.etiqueta} className="flex flex-1 flex-col items-center gap-1" title={`${d.etiqueta}: ${d.n}`}>
          <span className="text-[10px] font-semibold text-ink-soft [font-variant-numeric:tabular-nums]">{d.n || ""}</span>
          <span className="w-full rounded-t-[3px] bg-amber" style={{ height: `${Math.max(2, (d.n / max) * 72)}px`, opacity: d.n ? 1 : 0.25 }} />
          <span className="text-[9px] text-ink-faint">{d.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}
