"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useCuenta } from "@/lib/cuenta";
import { money } from "@/lib/format";
import { useT, rellena } from "@/lib/i18n";
import { cuando, useMisDivis, type DiviGuardado } from "@/lib/misDivis";
import { useGlobalProfile } from "@/lib/useGlobalProfile";
import CuentaBoton from "./CuentaBoton";
import TicketUploader, { type TicketUploaderHandle } from "./TicketUploader";

/**
 * La portada de quien entra con cuenta.
 *
 * No es la web de venta: quien ya tiene cuenta no viene a leer qué es esto,
 * viene a dos cosas, «¿cuánto me deben?» y «¿ya he pagado?». Así que esto es
 * una pantalla de producto, con la estructura de una app y no de una web:
 * título grande, las dos cifras, las mesas agrupadas en bloques redondeados,
 * y el botón de la foto flotando abajo a la derecha, que es donde llega el
 * pulgar. Sin pie de web, sin titular de venta, sin barra de pestañas
 * —que en un navegador chocaba con la suya—. Se decidió el 3 de septiembre
 * de 2026 después de seis rondas de maquetas.
 *
 * Va en la letra del sistema a propósito, como la maqueta que se aprobó: es
 * lo que hace que en un iPhone se lea como una pantalla y no como una página.
 * La mesa sigue en la letra de la casa; si el salto entre las dos molesta, se
 * cambia aquí en una línea.
 *
 * Los datos son los de siempre: `useMisDivis`, que con cuenta ya viene
 * fundido con la nube. Abiertas son las que tienen dinero de por medio;
 * cuadradas, las demás.
 */
const SISTEMA = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif';

export default function Inicio() {
  const t = useT();
  const { usuario } = useCuenta();
  const { profile } = useGlobalProfile();
  const { divis, quitar } = useMisDivis();
  const [editando, setEditando] = useState(false);
  /** El botón flotante, para abrir su selector de la foto desde el botón grande del estado vacío. */
  const subida = useRef<TicketUploaderHandle>(null);

  const nombre = profile?.name || usuario?.displayName?.split(" ")[0] || "";
  const lista = divis ?? [];
  const abiertas = lista.filter((d) => !d.saldado && d.cents !== 0);
  const cuadradas = lista.filter((d) => d.saldado || d.cents === 0);
  const teDeben = abiertas.reduce((s, d) => s + (d.cents < 0 ? -d.cents : 0), 0);
  const debes = abiertas.reduce((s, d) => s + (d.cents > 0 ? d.cents : 0), 0);
  const moneda = lista[0]?.currency ?? "EUR";

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col" style={{ fontFamily: SISTEMA }}>
      {/* ── la cabecera: quién eres, y a la derecha la campana y tu cara */}
      <header className="flex items-start justify-between px-4 pt-4">
        <div className="pt-2">
          <p className="text-[13px] font-semibold text-ink-faint">{rellena(t.inicio.hola, { name: nombre })}</p>
          <h1 className="mt-0.5 text-[34px] font-bold leading-[1.1] tracking-[-0.5px]">{t.inicio.titulo}</h1>
        </div>
        <div className="pt-2">
          <CuentaBoton />
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 pb-28">
        {divis === null ? null : lista.length === 0 ? (
          /*
            Cuenta nueva: ni una mesa todavía.

            El vacío de una app, no el de una web: el símbolo del ticket en
            grande y en gris, el título, una frase y el botón, centrados en el
            hueco. Es lo que hacen Cartera o Fotos cuando no hay nada, y es
            distinto a propósito de la portada de venta, que aquí sobra: quien
            ve esto ya tiene cuenta.
          */
          <section className="flex flex-1 flex-col items-center justify-center px-2 pb-6 text-center">
            <svg
              width="76"
              height="76"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.1"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
              className="text-ink-faint"
            >
              <path d="M6 3.5h12v15.5l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2-2 1.2z" />
              <path d="M9.5 8h5M9.5 11.5h5" />
            </svg>
            <h2 className="mt-4 text-[24px] font-semibold tracking-[-0.02em]">{t.inicio.primerTitulo}</h2>
            <p className="mt-2 max-w-[30ch] text-[15px] leading-[1.45] text-ink-soft">{t.inicio.primerTexto}</p>
            <button
              type="button"
              onClick={() => subida.current?.abrirFoto()}
              className="mt-6 flex min-h-[50px] items-center justify-center gap-2.5 rounded-full bg-amber px-7 text-[17px] font-semibold text-paper transition-transform active:scale-[0.98]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 8.5h3l1.5-2h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
              {t.subir.boton}
            </button>
          </section>
        ) : (
          <>
            {abiertas.length > 0 ? (
              /* ── las dos cifras */
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <Cifra etiqueta={t.inicio.teDeben} valor={money(teDeben, moneda)} tono="text-mint" />
                <Cifra etiqueta={t.inicio.debes} valor={money(debes, moneda)} tono="text-amber" />
              </div>
            ) : (
              /* ── nada abierto, pero hay mesas de antes */
              <section className="mt-7 px-1">
                <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{t.inicio.todoCuadrado}</h2>
                <p className="mt-2 max-w-[30ch] text-[15px] leading-[1.45] text-ink-soft">{t.inicio.todoCuadradoTexto}</p>
              </section>
            )}

            {abiertas.length > 0 && (
              <Grupo
                titulo={t.inicio.abiertas}
                extra={String(abiertas.length)}
                editando={editando}
                onEditar={() => setEditando((v) => !v)}
                t={t}
              >
                {abiertas.map((d) => (
                  <Fila key={d.code} divi={d} editando={editando} onQuitar={() => quitar(d.code)} t={t} />
                ))}
              </Grupo>
            )}

            {cuadradas.length > 0 && (
              <Grupo
                titulo={t.inicio.cuadradas}
                editando={editando}
                onEditar={abiertas.length > 0 ? undefined : () => setEditando((v) => !v)}
                t={t}
              >
                {cuadradas.map((d) => (
                  <Fila key={d.code} divi={d} editando={editando} onQuitar={() => quitar(d.code)} t={t} />
                ))}
              </Grupo>
            )}
          </>
        )}

      </div>

      {/* ── el botón flotante, con la foto y el código dentro. Lo legal no va
          aquí: está en la hoja de tu cuenta, encima de cerrar la sesión. */}
      <TicketUploader ref={subida} variante="flotante" />
    </div>
  );
}

function Cifra({ etiqueta, valor, tono }: { etiqueta: string; valor: string; tono: string }) {
  return (
    <div className="rounded-pieza bg-paper-2 px-4 py-3.5">
      <p className="text-[13px] text-ink-faint">{etiqueta}</p>
      <p className={`mt-1 text-[26px] font-semibold tracking-[-0.02em] [font-variant-numeric:tabular-nums] ${tono}`}>{valor}</p>
    </div>
  );
}

function Grupo({
  titulo,
  extra,
  editando,
  onEditar,
  t,
  children,
}: {
  titulo: string;
  extra?: string;
  editando: boolean;
  onEditar?: () => void;
  t: ReturnType<typeof useT>;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-1.5 flex items-center justify-between px-4 text-[13px] text-ink-faint">
        <span>{titulo}{extra ? ` · ${extra}` : ""}</span>
        {onEditar && (
          <button type="button" onClick={onEditar} className="-mr-2 min-h-[32px] px-2 font-semibold text-amber">
            {editando ? t.inicio.listo : t.inicio.editar}
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-pieza bg-paper-2">{children}</div>
    </section>
  );
}

/**
 * Una mesa: dónde, cuándo y con quién a la izquierda; la cifra a la derecha.
 * En modo editar sale la ✕, y cerrar pide confirmación ahí mismo, porque
 * tiene que quedar claro que sólo se quita de esta lista.
 */
function Fila({
  divi,
  editando,
  onQuitar,
  t,
}: {
  divi: DiviGuardado;
  editando: boolean;
  onQuitar: () => void;
  t: ReturnType<typeof useT>;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const cobras = !divi.saldado && divi.cents < 0;
  const debes = !divi.saldado && divi.cents > 0;
  const nombres = divi.gente.map((p) => p.name);
  const con =
    nombres.length === 0
      ? ""
      : nombres.length <= 3
        ? nombres.join(", ").replace(/, ([^,]*)$/, ` ${t.inicio.y} $1`)
        : rellena(t.inicio.personas, { n: nombres.length });

  if (confirmando) {
    return (
      <div className="border-t border-line-soft px-4 py-3 first:border-t-0">
        <p className="text-[15px] font-semibold">{t.misDivis.cerrarTitulo} {divi.place || divi.code}?</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{t.misDivis.cerrarAviso}</p>
        <div className="mt-2.5 flex gap-2">
          <button type="button" onClick={onQuitar} className="min-h-[38px] flex-1 rounded-pieza bg-clay text-[13px] font-bold text-paper">
            {t.misDivis.cerrarSi}
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className="min-h-[38px] flex-1 rounded-pieza border border-line text-[13px] font-semibold text-ink-soft">
            {t.misDivis.cerrarNo}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center border-t border-line-soft first:border-t-0">
      <Link href={`/t/${divi.code}`} className="flex min-h-[58px] min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 pr-3 active:bg-paper-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-semibold tracking-[-0.01em]">{divi.place || divi.code}</span>
          <span className="mt-0.5 block truncate text-[13px] text-ink-faint">
            {cuando(divi.at, t)}
            {con ? ` · ${con}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-right">
          {cobras || debes ? (
            <>
              <span className={`block text-[17px] font-semibold [font-variant-numeric:tabular-nums] ${cobras ? "text-mint" : "text-amber"}`}>
                {money(Math.abs(divi.cents), divi.currency)}
              </span>
              <span className="block text-[12px] text-ink-faint">
                {cobras ? t.misDivis.teDeben : divi.aQuien ? `${t.misDivis.a} ${divi.aQuien}` : t.misDivis.loTuyo}
              </span>
            </>
          ) : (
            <span className="text-[15px] font-semibold text-mint">{t.inicio.cuadrada}</span>
          )}
        </span>
        {!editando && (
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="ml-1 shrink-0 text-line">
            <path d="m1 1 6 6-6 6" />
          </svg>
        )}
      </Link>
      {editando && (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          aria-label={`${t.misDivis.cerrarTitulo} ${divi.place || divi.code}`}
          className="mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[13px] text-clay"
        >
          ✕
        </button>
      )}
    </div>
  );
}
