"use client";

import { useState } from "react";
import { ponAvisos, ponUsuario, recargaPendientes, useCuenta } from "@/lib/cuenta";
import { useT, rellena } from "@/lib/i18n";
import { useGlobalProfile } from "@/lib/useGlobalProfile";
import AmigosSheet from "./AmigosSheet";
import BienvenidaSheet from "./BienvenidaSheet";
import { EditNameSheet } from "./EditNameSheet";
import NotificacionesSheet from "./NotificacionesSheet";
import { Avatar, CerrarHoja, Sheet } from "./ui";

/** Dónde se apunta a quién ya se le enseñó la bienvenida en este aparato. */
const SALTADA = "divi.bienvenida";

/**
 * La esquina de la cuenta, en la cabecera de la portada.
 *
 * Sin sesión, una sola cosa: «Entrar» con la G de Google, pequeño porque es
 * opcional. Con sesión, dos: la **campana** con el número de lo que tienes
 * sin ver, y **tu cara con un chevrón**, que es lo que en cualquier app dice
 * «esto es tu menú». Antes era sólo la cara y no estaba claro que se tocara.
 *
 * No enseña nada hasta que Firebase ha decidido si hay alguien: pintar
 * «Entrar» y cambiarlo a tu cara medio segundo después es un parpadeo que se
 * nota en cada visita.
 */
export default function CuentaBoton() {
  const t = useT();
  const { usuario, usuarioNombre, cargada, entrar, salir, borrar, fallo, ocupado, avisos, pendientes } = useCuenta();
  const { profile, saveProfile } = useGlobalProfile();
  const [hoja, setHoja] = useState<null | "cuenta" | "perfil" | "amigos" | "avisos" | "usuario" | "borrar" | "fallo">(null);
  // A quién ya se le preguntó en este móvil. Se guarda el uid y no un «sí»,
  // porque en un móvil prestado entran dos personas y la segunda tiene que
  // ver su bienvenida igual.
  const [saltada, setSaltada] = useState(() =>
    typeof window === "undefined" ? null : localStorage.getItem(SALTADA),
  );

  if (usuario === undefined) return null;

  if (usuario === null) {
    return (
      <>
        <button
          type="button"
          onClick={async () => {
            await entrar();
          }}
          disabled={ocupado}
          className="flex min-h-[40px] items-center gap-2 rounded-pieza border border-line px-3 text-[13px] font-semibold text-ink-soft transition-colors hover:border-amber hover:text-ink disabled:opacity-60 lg:min-h-[44px] lg:px-4 lg:text-[14px]"
        >
          <G />
          <span className="lg:hidden">{t.cuenta.entrar}</span>
          <span className="hidden lg:inline">{t.cuenta.entrarLargo}</span>
        </button>

        {fallo && hoja !== "fallo" && <AbreFallo onAbrir={() => setHoja("fallo")} />}
        {hoja === "fallo" && fallo && (
          <Sheet onClose={() => setHoja(null)} titulo={t.cuenta.falloTitulo} sub={t.cuenta[fallo]}>
            <div className="mt-5">
              <CerrarHoja onClick={() => setHoja(null)}>{t.cuenta.cerrar}</CerrarHoja>
            </div>
          </Sheet>
        )}
      </>
    );
  }

  const nombre = profile?.name || usuario.displayName?.split(" ")[0] || "";
  const sinVer = pendientes.solicitudes + pendientes.avisos;

  /*
    La bienvenida sale mientras no haya usuario elegido, que es lo único de
    la hoja que no se puede rellenar solo y lo que hace falta para que te
    añadan. En cuanto lo eliges deja de salir en todos tus móviles, porque
    vive en la cuenta. Sólo cuando no hay ninguna otra hoja abierta: nadie
    quiere dos ventanas encima.
  */
  const bienvenida = cargada && !usuarioNombre && saltada !== usuario.uid && hoja === null;
  const cierraBienvenida = () => {
    setSaltada(usuario.uid);
    try {
      localStorage.setItem(SALTADA, usuario.uid);
    } catch {
      /* modo incógnito lleno: como mucho vuelve a salir a la próxima */
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 lg:gap-2">
        {/* ── la campana */}
        <button
          type="button"
          onClick={() => setHoja("avisos")}
          aria-label={sinVer ? `${t.notificaciones.titulo} · ${rellena(t.cuenta.sinVer, { n: sinVer })}` : t.notificaciones.titulo}
          className="relative grid h-10 w-10 place-items-center rounded-full text-ink-soft transition-colors hover:bg-paper-2 hover:text-ink"
        >
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" />
            <path d="M10 20.5a2 2 0 0 0 4 0" />
          </svg>
          {sinVer > 0 && (
            <span
              aria-hidden
              className="tnum absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-paper bg-clay px-1 text-[10.5px] font-bold leading-none text-paper"
            >
              {sinVer}
            </span>
          )}
        </button>

        {/* ── tu cara, con el chevrón que dice «menú» */}
        <button
          type="button"
          onClick={() => {
            setHoja("cuenta");
            void recargaPendientes();
          }}
          aria-label={t.cuenta.titulo}
          className="flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-1.5 transition-colors hover:bg-paper-2"
        >
          <Avatar name={nombre || "?"} avatar={profile?.avatar} color="#e8b04b" size={32} />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-ink-faint">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>

      {bienvenida && (
        <BienvenidaSheet
          nombre={nombre}
          avatar={profile?.avatar}
          bizum={profile?.bizum}
          revolut={profile?.revolut}
          onGuardar={(perfil) => saveProfile(perfil)}
          onCerrar={cierraBienvenida}
        />
      )}

      {hoja === "avisos" && <NotificacionesSheet onClose={() => setHoja(null)} />}

      {hoja === "cuenta" && (
        <Sheet onClose={() => setHoja(null)} titulo={t.cuenta.titulo} sub={usuario.email ?? undefined}>
          <div className="mt-5 grid gap-2.5">
            {/* Quién eres, tal y como te verá la mesa, y tu usuario debajo. */}
            <button
              type="button"
              onClick={() => setHoja("usuario")}
              className="flex items-center gap-3 rounded-pieza bg-paper px-3.5 py-3 text-left transition-colors active:bg-paper-3"
            >
              <Avatar name={nombre || "?"} avatar={profile?.avatar} color="#e8b04b" size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{nombre || t.cuenta.sinPerfil}</span>
                <span className={`block text-[13px] ${usuarioNombre ? "text-ink-soft" : "text-amber"}`}>
                  {usuarioNombre ? `@${usuarioNombre}` : t.cuenta.usuarioElige}
                </span>
              </span>
              <span className="shrink-0 text-[12px] text-ink-faint">{t.cuenta.cambiar}</span>
            </button>

            <Opcion onClick={() => setHoja("perfil")}>{t.cuenta.editarPerfil}</Opcion>
            <Opcion
              onClick={() => setHoja("amigos")}
              extra={pendientes.solicitudes > 0 ? rellena(t.cuenta.solicitudes, { n: pendientes.solicitudes }) : undefined}
            >
              {t.cuenta.amigos}
            </Opcion>

            {/* Los correos de la mesa. Encendidos por defecto porque son de
                servicio —te avisan de algo tuyo—, y apagables aquí y desde el
                pie de cada correo, sin entrar. La campana sigue igual. */}
            <button
              type="button"
              role="switch"
              aria-checked={avisos}
              onClick={() => void ponAvisos(!avisos)}
              className="flex min-h-[54px] w-full items-center justify-between gap-3 rounded-pieza border border-line-soft bg-paper px-3.5 text-left text-[15px] font-semibold"
            >
              <span>{t.cuenta.avisos}</span>
              <span className={`text-[13px] font-normal ${avisos ? "text-mint" : "text-ink-faint"}`}>
                {avisos ? t.cuenta.avisosSi : t.cuenta.avisosNo}
              </span>
            </button>
            <p className="-mt-1 px-1 text-[12px] leading-relaxed text-ink-faint">{t.cuenta.avisosNota}</p>

            <Opcion
              onClick={async () => {
                setHoja(null);
                await salir();
              }}
            >
              {t.cuenta.salir}
            </Opcion>
            <p className="-mt-1 px-1 text-[12px] leading-relaxed text-ink-faint">{t.cuenta.salirNota}</p>

            <Opcion tono="clay" onClick={() => setHoja("borrar")}>
              {t.cuenta.borrar}
            </Opcion>

            <CerrarHoja onClick={() => setHoja(null)}>{t.cuenta.cerrar}</CerrarHoja>
          </div>
        </Sheet>
      )}

      {hoja === "usuario" && <UsuarioSheet actual={usuarioNombre} onClose={() => setHoja("cuenta")} />}

      {hoja === "amigos" && <AmigosSheet onClose={() => setHoja("cuenta")} />}

      {hoja === "perfil" && (
        <EditNameSheet
          currentName={nombre}
          currentAvatar={profile?.avatar}
          currentBizum={profile?.bizum}
          currentRevolut={profile?.revolut}
          onSave={async (name, avatar, bizum, revolut) => {
            // Con eso basta: la cuenta escucha el perfil del móvil y lo sube.
            saveProfile({ name, avatar, bizum, revolut });
          }}
          onClose={() => setHoja("cuenta")}
        />
      )}

      {hoja === "borrar" && (
        <Sheet onClose={() => setHoja("cuenta")} titulo={t.cuenta.borrarTitulo} sub={t.cuenta.borrarAviso}>
          <div className="mt-5 grid gap-2.5">
            <button
              type="button"
              onClick={async () => {
                setHoja(null);
                await borrar();
              }}
              className="min-h-[52px] rounded-pieza bg-clay text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
            >
              {t.cuenta.borrarSi}
            </button>
            <CerrarHoja onClick={() => setHoja("cuenta")}>{t.cuenta.borrarNo}</CerrarHoja>
          </div>
        </Sheet>
      )}
    </>
  );
}

/**
 * Elegir el usuario. Único, y es lo que se enseña a tus amigos en vez del
 * código: `@alelozano`. El servidor comprueba que esté libre.
 */
function UsuarioSheet({ actual, onClose }: { actual: string | null; onClose: () => void }) {
  const t = useT();
  const [valor, setValor] = useState(actual ?? "");
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const limpio = valor.trim().replace(/^@/, "").toLowerCase();
  const vale = /^[a-z0-9_]{3,20}$/.test(limpio);

  return (
    <Sheet onClose={onClose} titulo={t.cuenta.usuario} sub={t.cuenta.usuarioAyuda}>
      <form
        className="mt-5 grid gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!vale || ocupado) return;
          setOcupado(true);
          setAviso(null);
          try {
            await ponUsuario(limpio);
            onClose();
          } catch (fallo) {
            setAviso((fallo as Error).message);
          } finally {
            setOcupado(false);
          }
        }}
      >
        <label className="flex min-h-[52px] items-center gap-1 rounded-pieza border border-line bg-paper px-4 transition-colors focus-within:border-amber">
          <span className="text-[16px] font-semibold text-ink-soft">@</span>
          <input
            autoFocus
            value={valor.replace(/^@/, "")}
            onChange={(e) => setValor(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
            placeholder="alelozano"
            aria-label={t.cuenta.usuario}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full min-w-0 bg-transparent text-[16px] font-semibold focus:outline-none"
          />
        </label>
        {aviso && (
          <p className="text-[13px] text-clay" role="alert">
            {aviso}
          </p>
        )}
        <button
          type="submit"
          disabled={!vale || ocupado || limpio === actual}
          className="min-h-[52px] rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {t.cuenta.usuarioGuardar}
        </button>
        <CerrarHoja onClick={onClose}>{t.perfil.cancelar}</CerrarHoja>
      </form>
    </Sheet>
  );
}

/**
 * Cuando entrar falla, la hoja se abre sola: el botón de la esquina no tiene
 * sitio para explicar nada. Es un componente y no un efecto en el de arriba
 * para que abrirla una sola vez por fallo no dependa de un `useEffect` con
 * el estado de la hoja dentro.
 */
function AbreFallo({ onAbrir }: { onAbrir: () => void }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto) {
    setAbierto(true);
    onAbrir();
  }
  return null;
}

function Opcion({
  children,
  onClick,
  tono = "normal",
  extra,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tono?: "normal" | "clay";
  /** Un dato vivo a la derecha —«2 por aceptar»—; nunca decoración. */
  extra?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[54px] w-full items-center justify-between gap-3 rounded-pieza border bg-paper px-3.5 text-left text-[15px] font-semibold transition-colors active:bg-paper-3 ${
        tono === "clay" ? "border-clay/30 text-clay" : "border-line-soft text-ink"
      }`}
    >
      <span>{children}</span>
      {extra && <span className="tnum shrink-0 text-[12px] font-bold text-clay">{extra}</span>}
    </button>
  );
}

/** La G de Google, como la pide Google: sus cuatro colores y nada más. */
function G() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden width="15" height="15" className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
