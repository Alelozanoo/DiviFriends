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
import { CerrarHoja, Sheet } from "./ui";

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

/** La ficha de una mesa, tal y como la manda /api/admin/mesa/CÓDIGO. */
interface FichaMesa {
  code: string;
  place: string | null;
  creada: string;
  actualizada: string;
  cerrada: boolean;
  moneda: string;
  total: number;
  asignado: number;
  sinDueno: number;
  pendiente: number;
  completo: boolean;
  tickets: number;
  lineas: { total: number; repartidas: number };
  pagador: string | null;
  personas: { nombre: string; color: string; esPagador: boolean; suyo: number; debe: number; saldado: boolean }[];
  pagos: { de: string | null; a: string | null; cents: number; via: string; estado: "dice" | "ok"; at: string }[];
  cambios: { at: string; kind: string; by: string; what: string; cents: number }[];
}

const CAMBIOS: Record<string, string> = {
  "item.remove": "quitó",
  "item.add": "añadió",
  "total.edit": "cambió el total a",
  "payer.set": "puso de pagador a",
  "pago.ok": "cobró",
  "mesa.nombre": "renombró la mesa a",
  "cobro.edit": "cambió cómo se le paga",
};

const CADA_MS = 60_000;
/** Sin tocar el panel este rato, se deja de preguntar hasta que se vuelva a tocar. */
const QUIETO_MS = 15 * 60_000;
const SISTEMA = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif';

export default function Admin({ onComoUsuario }: { onComoUsuario: () => void }) {
  const t = useT();
  const [datos, setDatos] = useState<Resumen | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);
  const [hace, setHace] = useState(0);
  /** Cuándo se tocó el panel por última vez; pasado un rato se deja de preguntar. */
  const [ultimoToque, setUltimoToque] = useState(() => Date.now());
  const [enPausa, setEnPausa] = useState(false);
  /** La mesa abierta en la ficha, y su contenido cuando llega. */
  const [abierta, setAbierta] = useState<string | null>(null);
  const [ficha, setFicha] = useState<FichaMesa | null>(null);
  const [fichaFallo, setFichaFallo] = useState<string | null>(null);

  const abre = useCallback(async (code: string) => {
    setAbierta(code);
    setFicha(null);
    setFichaFallo(null);
    try {
      setFicha(await llama<FichaMesa>(`/api/admin/mesa/${code}`));
    } catch (error) {
      setFichaFallo(error instanceof Error ? error.message : "No se ha podido abrir.");
    }
  }, []);
  const cierra = () => {
    setAbierta(null);
    setFicha(null);
  };

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
    // Sólo con la pestaña a la vista y con alguien delante: un panel olvidado
    // en una tablet no tiene que estar leyendo Firestore toda la tarde.
    const cada = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - ultimoToque > QUIETO_MS) {
        setEnPausa(true);
        return;
      }
      void carga();
    }, CADA_MS);
    const reloj = setInterval(() => setHace((s) => s + 1), 1000);
    const alVolver = () => {
      if (document.visibilityState === "visible") despierta();
    };
    const despierta = () => {
      setUltimoToque(Date.now());
      setEnPausa((estaba) => {
        if (estaba) void carga();
        return false;
      });
    };
    document.addEventListener("visibilitychange", alVolver);
    window.addEventListener("pointerdown", despierta);
    window.addEventListener("keydown", despierta);
    return () => {
      clearInterval(cada);
      clearInterval(reloj);
      document.removeEventListener("visibilitychange", alVolver);
      window.removeEventListener("pointerdown", despierta);
      window.removeEventListener("keydown", despierta);
    };
  }, [carga, ultimoToque]);

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
          {enPausa
            ? "En pausa: toca para seguir"
            : datos
              ? `Actualizado hace ${hace} s · cada minuto mientras lo miras`
              : fallo
                ? fallo
                : "Cargando…"}
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
            <Cifra etiqueta="Divis hoy" valor={datos.m.hoy} nota={`${datos.m.semana} en 7 días · ${datos.m.total} desde el principio`} tono="text-amber" />
            <Cifra etiqueta="Gente apuntada hoy" valor={datos.m.personas.hoy} nota={`${datos.m.personas.total} en 14 días · ${datos.m.personas.media.toFixed(1)} por divi`} />
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
          <Grupo titulo="Últimas mesas" nota="Las treinta más recientes de los últimos catorce días">
            {datos.mesas.map((mesa) => (
              <button
                key={mesa.code}
                type="button"
                onClick={() => void abre(mesa.code)}
                className="flex w-full items-center gap-3 border-t border-line-soft px-4 py-2.5 text-left first:border-t-0 active:bg-paper-3"
              >
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
              </button>
            ))}
          </Grupo>

          {/* ── lo demás, en cifras */}
          <Grupo titulo="Hasta dónde llegan" nota="De los divis de los últimos catorce días">
            <Escalera pasos={datos.m.embudo} />
            <Nota>
              El escalón que importa es el segundo. Un divi creado sólo dice que alguien le hizo
              una foto a un ticket; uno donde alguien coge algo dice que hubo una mesa de verdad
              repartiendo. Lo que se cae entre esos dos son los que se asomaron y se fueron.
            </Nota>
          </Grupo>

          {/* ── lo que decide si esto crece solo */}
          <Grupo titulo="Cuánta gente entra por divi" nota="El número que decide si esto crece solo">
            <div className="grid grid-cols-2 gap-2.5 p-2.5">
              <Mini etiqueta="De media" valor={datos.m.personas.media.toFixed(1)} tono="text-amber" />
              <Mini etiqueta="Se queda en uno" valor={`${datos.m.personas.solo}%`} tono="text-clay" />
              <Mini etiqueta="Dos o más" valor={`${datos.m.personas.dosOMas}%`} />
              <Mini etiqueta="Tres o más" valor={`${datos.m.personas.tresOMas}%`} tono="text-mint" />
            </div>
            <Nota>
              Cada divi que se queda en una sola persona es alguien que lo abrió y no llegó a
              pasárselo a nadie. Ese porcentaje bajando es la señal de que la app se entiende.
            </Nota>
          </Grupo>

          <Grupo titulo="Los que sólo miran" nota="Lo que no llegó a ser una mesa">
            <div className="grid grid-cols-3 gap-2.5 p-2.5">
              <Mini etiqueta="Nadie cogió nada" valor={`${datos.m.curiosos.vacios}%`} tono="text-clay" />
              <Mini etiqueta="No se volvió a tocar" valor={`${datos.m.curiosos.efimeros}%`} tono="text-clay" />
              <Mini etiqueta="Minutos de vida" valor={String(datos.m.curiosos.medianaMinutos)} />
            </div>
            <Nota>
              Los minutos son la <b className="text-ink">mediana</b> entre que se crea la comanda
              y su último cambio: una mesa de verdad se toca durante un rato largo, la del
              curioso muere en el mismo minuto en que nació.
            </Nota>
          </Grupo>

          <Grupo titulo="Dos cosas que se pueden hacer" nota="Y cuánta gente las hace">
            <div className="grid grid-cols-2 gap-2.5 p-2.5">
              <Mini etiqueta="Divis con más de un ticket" valor={`${datos.m.recibos.conVarios}%`} />
              <Mini etiqueta="Se ponen foto" valor={`${datos.m.avatares}%`} />
            </div>
            <Nota>
              Cuentan cosas distintas. La primera es de <b className="text-ink">divis</b>: mesas
              que juntan dos papeles, la cena y luego las copas. La segunda es de{" "}
              <b className="text-ink">personas</b>: de toda la gente que se ha apuntado alguna
              vez, cuántos se pusieron foto o emoji en vez de quedarse con sus iniciales.
            </Nota>
          </Grupo>

          {datos.m.acciones.length > 0 && (
            <Grupo titulo="Qué hacen dentro" nota="Los cambios que quedan grabados">
              <Escalera pasos={datos.m.acciones} />
            </Grupo>
          )}

          <Grupo titulo="Cuándo se usa" nota="La hora de la mesa, no la del servidor">
            <Barras datos={datos.m.porDiaSemana} />
            <div className="grid grid-cols-4 gap-2.5 p-2.5 pt-0">
              <Mini etiqueta="Mañana" valor={String(datos.m.porFranja.mañana)} />
              <Mini etiqueta="Tarde" valor={String(datos.m.porFranja.tarde)} />
              <Mini etiqueta="Noche" valor={String(datos.m.porFranja.noche)} tono="text-amber" />
              <Mini etiqueta="Madrugada" valor={String(datos.m.porFranja.madrugada)} />
            </div>
          </Grupo>

          {/* ── las cuentas, por dentro */}
          <Grupo titulo="Qué hacen con la cuenta" nota={`De las ${datos.c.cuentas.total}`}>
            <Escalera
              pasos={[
                { etiqueta: "con foto", n: datos.c.cuentas.conFoto, pct: pct(datos.c.cuentas.conFoto, datos.c.cuentas.total) },
                { etiqueta: "con Bizum o Revolut", n: datos.c.cuentas.conBizum, pct: pct(datos.c.cuentas.conBizum, datos.c.cuentas.total) },
                { etiqueta: "con usuario elegido", n: datos.c.cuentas.conUsuario, pct: pct(datos.c.cuentas.conUsuario, datos.c.cuentas.total) },
                { etiqueta: "con los correos apagados", n: datos.c.cuentas.correosApagados, pct: pct(datos.c.cuentas.correosApagados, datos.c.cuentas.total) },
              ]}
            />
          </Grupo>

          <Grupo titulo="Amigos y mesas" nota="Lo que sólo pasa con cuenta">
            <div className="grid grid-cols-3 gap-2.5 p-2.5">
              <Mini etiqueta="Amistades" valor={String(datos.c.amigos.amistades)} tono="text-amber" />
              <Mini etiqueta="Sin aceptar" valor={String(datos.c.amigos.pendientes)} />
              <Mini etiqueta="Metidos por un amigo" valor={String(datos.c.mesas.invitados)} />
            </div>
            <Nota>
              De los {datos.c.mesas.invitados} metidos por un amigo,{" "}
              <b className="text-ink">{datos.c.mesas.abiertos}</b> llegaron a abrir la mesa.
              Además, {datos.c.mesas.propios} se sentaron ellos mismos con su cuenta.
            </Nota>
          </Grupo>

          <Grupo titulo="Correos" nota={`${datos.c.correos.semana} en 7 días · ${datos.c.correos.total} en total`}>
            <div className="grid gap-2.5 p-2.5">
              <div>
                <p className="mb-1 px-1 text-[11.5px] text-ink-faint">Qué pasó con cada uno</p>
                <Escalera pasos={datos.c.correos.porEstado} />
              </div>
              <div>
                <p className="mb-1 px-1 text-[11.5px] text-ink-faint">De qué eran</p>
                <Escalera pasos={datos.c.correos.porTipo} />
              </div>
            </div>
            <Nota>
              El freno global de hoy va por{" "}
              <b className={datos.c.correos.tope.hechos >= datos.c.correos.tope.max * 0.8 ? "text-clay" : "text-ink"}>
                {datos.c.correos.tope.hechos} de {datos.c.correos.tope.max}
              </b>
              . Si se llena, los siguientes se quedan en la campana y no salen por correo hasta
              el día siguiente.
            </Nota>
          </Grupo>

          <Grupo titulo="Lo que cuesta" nota="Leer tickets es el único gasto que crece con la gente">
            <div className="grid grid-cols-3 gap-2.5 p-2.5">
              <Mini etiqueta="Hoy" valor={`${datos.m.coste.hoy.toFixed(2)} $`} tono="text-amber" />
              <Mini etiqueta="7 días" valor={`${datos.m.coste.semana.toFixed(2)} $`} />
              <Mini etiqueta="14 días" valor={`${datos.m.coste.total.toFixed(2)} $`} />
            </div>
            <Nota>
              Cada papel que pasa por {datos.modelo} cuesta{" "}
              <b className="text-ink">{(datos.m.coste.porLectura * 100).toFixed(2)} ¢</b>:{" "}
              {datos.m.coste.lecturas.total.toLocaleString("es-ES")} papeles en 14 días,{" "}
              {datos.m.coste.lecturas.hoy.toLocaleString("es-ES")} hoy.{" "}
              <b className="text-ink">Es un techo, no una factura:</b> una comanda escrita a mano
              no llama a nadie y aquí cuenta igual, y las fotos que el modelo no supo leer se
              pagaron sin dejar divi. El número exacto es el contador del tope:{" "}
              <b className="text-ink">{datos.lecturas.hechas.toLocaleString("es-ES")}</b> de{" "}
              {datos.lecturas.tope.toLocaleString("es-ES")} que caben en un día.
            </Nota>
          </Grupo>

          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Cifra etiqueta="Correos hoy" valor={datos.c.correos.hoy} nota={`${datos.c.correos.tope.hechos} de ${datos.c.correos.tope.max} del tope · ${datos.c.correos.total} en total`} />
            <Cifra etiqueta="Amistades" valor={datos.c.amigos.amistades} nota={`${datos.c.amigos.pendientes} solicitudes sin aceptar`} />
            <Cifra etiqueta="Coste 7 días" valor={`${datos.m.coste.semana.toFixed(2)} $`} nota={`${datos.m.coste.total.toFixed(2)} $ en 14 días`} />
            <Cifra etiqueta="Mesas sin nada" valor={datos.m.nonatas.hoy} nota={`${datos.m.nonatas.total} en 14 días: fotos que no llegaron a mesa`} tono={datos.m.nonatas.hoy > 3 ? "text-clay" : undefined} />
          </div>

          {abierta && (
            <Sheet
              onClose={cierra}
              titulo={ficha?.place ?? abierta}
              sub={ficha ? `${abierta} · ${cuando(ficha.creada, t)}${ficha.cerrada ? " · cerrada" : ""}` : "Cargando…"}
            >
              {fichaFallo && <p className="mt-4 text-[13px] text-clay">{fichaFallo}</p>}
              {ficha && (
                <div className="mt-4 grid gap-4">
                  <div className="grid grid-cols-3 gap-2">
                    <Mini etiqueta="Total" valor={money(ficha.total, ficha.moneda)} />
                    <Mini etiqueta="Repartido" valor={money(ficha.asignado, ficha.moneda)} tono={ficha.sinDueno === 0 ? "text-mint" : undefined} />
                    <Mini etiqueta="Falta devolver" valor={money(ficha.pendiente, ficha.moneda)} tono={ficha.pendiente === 0 ? "text-mint" : "text-amber"} />
                  </div>
                  <p className="text-[13px] text-ink-faint">
                    {ficha.personas.length} {ficha.personas.length === 1 ? "persona" : "personas"} · {ficha.lineas.repartidas} de {ficha.lineas.total} líneas con dueño ·{" "}
                    {ficha.tickets} {ficha.tickets === 1 ? "ticket" : "tickets"}
                    {ficha.pagador ? ` · pagó ${ficha.pagador}` : " · nadie marcado como pagador"}
                  </p>

                  <div>
                    <p className="mb-1.5 text-[13px] font-semibold text-ink-soft">Quién ha entrado</p>
                    <div className="overflow-hidden rounded-pieza bg-paper">
                      {ficha.personas.length === 0 && <p className="px-3.5 py-3 text-[13px] text-ink-faint">Nadie todavía.</p>}
                      {ficha.personas.map((p) => (
                        <div key={p.nombre + p.suyo} className="flex items-center gap-3 border-t border-line-soft px-3.5 py-2.5 first:border-t-0">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold text-paper" style={{ background: p.color }}>
                            {p.nombre.slice(0, 1).toUpperCase()}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold">
                              {p.nombre}
                              {p.esPagador && <span className="ml-1.5 text-[12px] font-normal text-amber">puso la tarjeta</span>}
                            </span>
                            <span className="block text-[12px] text-ink-faint">lo suyo: {money(p.suyo, ficha.moneda)}</span>
                          </span>
                          <span className={`shrink-0 text-[13px] font-semibold ${p.saldado || p.debe <= 0 ? "text-mint" : "text-amber"}`}>
                            {p.esPagador ? (ficha.pendiente === 0 ? "cobrado" : `le deben ${money(ficha.pendiente, ficha.moneda)}`) : p.saldado ? "ha pagado" : p.debe > 0 ? `debe ${money(p.debe, ficha.moneda)}` : "en paz"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {ficha.pagos.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[13px] font-semibold text-ink-soft">Pagos anunciados</p>
                      <div className="overflow-hidden rounded-pieza bg-paper">
                        {ficha.pagos.map((pg, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 border-t border-line-soft px-3.5 py-2.5 text-[13px] first:border-t-0">
                            <span className="min-w-0 truncate">
                              {pg.de ?? "?"} → {pg.a ?? "?"} <span className="text-ink-faint">por {pg.via} · {cuando(pg.at, t)}</span>
                            </span>
                            <span className={`shrink-0 font-semibold ${pg.estado === "ok" ? "text-mint" : "text-amber"}`}>
                              {money(pg.cents, ficha.moneda)} {pg.estado === "ok" ? "✓" : "dice"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ficha.cambios.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[13px] font-semibold text-ink-soft">Lo último que se tocó</p>
                      <div className="overflow-hidden rounded-pieza bg-paper">
                        {ficha.cambios.map((c) => (
                          <div key={c.at} className="border-t border-line-soft px-3.5 py-2 text-[13px] first:border-t-0">
                            <span className="font-semibold">{c.by}</span> {CAMBIOS[c.kind] ?? c.kind} {c.what}
                            {c.cents ? <span className="text-ink-faint"> · {money(c.cents, ficha.moneda)}</span> : null}
                            <span className="block text-[11.5px] text-ink-faint">{cuando(c.at, t)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <CerrarHoja onClick={cierra}>Cerrar</CerrarHoja>
                </div>
              )}
            </Sheet>
          )}

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

function Mini({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono?: string }) {
  return (
    <div className="rounded-pieza bg-paper px-3 py-2.5">
      <p className="text-[11.5px] text-ink-faint">{etiqueta}</p>
      <p className={`mt-0.5 text-[15px] font-semibold [font-variant-numeric:tabular-nums] ${tono ?? ""}`}>{valor}</p>
    </div>
  );
}

const pct = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte / total) * 100));

/** Una lista con su barra: el embudo, los correos, lo que hace la gente. */
function Escalera({ pasos }: { pasos: { etiqueta: string; n: number; pct?: number }[] }) {
  const max = Math.max(1, ...pasos.map((p) => p.n));
  return (
    <div className="px-4 py-3">
      {pasos.map((p) => (
        <div key={p.etiqueta} className="flex items-center gap-3 py-1.5 text-[14px]">
          <span className="w-[42%] truncate text-ink-soft">{p.etiqueta}</span>
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-paper-3">
            <span
              className="block h-full rounded-full bg-amber"
              style={{ width: `${p.pct ?? Math.round((p.n / max) * 100)}%` }}
            />
          </span>
          <span className="w-12 text-right font-semibold [font-variant-numeric:tabular-nums]">{p.n}</span>
        </div>
      ))}
    </div>
  );
}

/** El párrafo que explica una cifra. Sin él, un porcentaje no dice nada. */
function Nota({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-t border-line-soft px-4 py-3 text-[12px] leading-relaxed text-ink-faint">
      {children}
    </p>
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
