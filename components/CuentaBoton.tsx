"use client";

import Link from "next/link";
import { useState } from "react";
import { ponAvisos, ponNovedades, ponUsuario, recargaPendientes, useCuenta } from "@/lib/cuenta";
import { useT, rellena } from "@/lib/i18n";
import { useGlobalProfile } from "@/lib/useGlobalProfile";
import AmigosSheet from "./AmigosSheet";
import { EnlaceBorrado } from "./BorrarCuenta";
import { EditNameSheet } from "./EditNameSheet";
import NotificacionesSheet from "./NotificacionesSheet";
import { Avatar, AvisoTerminos, CerrarHoja, Sheet } from "./ui";

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
  const { usuario, usuarioNombre, usuarioCambiado, entrar, salir, fallo, falloCodigo, ocupado, avisos, novedades, pendientes } = useCuenta();
  const { profile, saveProfile } = useGlobalProfile();
  const [hoja, setHoja] = useState<null | "cuenta" | "perfil" | "amigos" | "avisos" | "privacidad" | "entrar" | "fallo">(null);
  if (usuario === undefined) return null;

  if (usuario === null) {
    return (
      <>
        <button
          type="button"
          onClick={() => setHoja("entrar")}
          disabled={ocupado}
          className="flex min-h-[40px] items-center gap-2 rounded-full border border-line px-3.5 text-[13px] font-semibold text-ink-soft transition-colors hover:border-amber hover:text-ink disabled:opacity-60 lg:min-h-[44px] lg:px-4 lg:text-[14px]"
        >
          <G />
          <span className="lg:hidden">{t.cuenta.entrar}</span>
          <span className="hidden lg:inline">{t.cuenta.entrarLargo}</span>
        </button>

        {/*
          Entrar desde la cabecera abre una hoja en vez de llamar a Google de
          golpe. No es ceremonia: es el único sitio de los tres donde se podía
          entrar sin leer que al hacerlo se aceptan los términos, y un botón de
          cuarenta píxeles en una esquina no tiene dónde ponerlo.
        */}
        {hoja === "entrar" && (
          <Sheet onClose={() => setHoja(null)} titulo={t.cuenta.entrarLargo} sub={t.registro.entradilla}>
            <button
              type="button"
              onClick={async () => {
                setHoja(null);
                await entrar();
              }}
              disabled={ocupado}
              className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-pieza bg-ink text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              <G />
              {t.registro.google}
            </button>
            <AvisoTerminos />
            <div className="mt-4">
              <CerrarHoja onClick={() => setHoja(null)}>{t.registro.luego}</CerrarHoja>
            </div>
          </Sheet>
        )}

        {fallo && hoja !== "fallo" && <AbreFallo onAbrir={() => setHoja("fallo")} />}
        {hoja === "fallo" && fallo && (
          <Sheet onClose={() => setHoja(null)} titulo={t.cuenta.falloTitulo} sub={t.cuenta[fallo]}>
            {/* El código, en pequeño: es lo que hay que leer en voz alta
                cuando alguien dice «a mí no me deja». */}
            {falloCodigo && <p className="tnum mt-3 text-[12px] text-ink-faint">{falloCodigo}</p>}
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

      {hoja === "avisos" && <NotificacionesSheet onClose={() => setHoja(null)} />}

      {hoja === "cuenta" && (
        <Sheet onClose={() => setHoja(null)} titulo={t.cuenta.titulo} sub={usuario.email ?? undefined}>
          {/*
            Cuatro cosas y ya. Estaba lleno: tus números (que ya se ven en la
            portada), el usuario aparte del perfil, dos interruptores de
            correo, tres páginas legales, cerrar, salir y borrar. Se pidió
            simplificarlo el 4 de septiembre de 2026: lo tuyo, tus amigos,
            salir en rojo, y todo lo legal y los correos detrás de una sola
            puerta al final.
          */}
          <div className="mt-5 grid gap-2.5">
            {/* Quién eres, tal y como te verá la mesa, y tu usuario debajo.
                Tocarlo edita el perfil, que es donde vive también el usuario. */}
            <button
              type="button"
              onClick={() => setHoja("perfil")}
              className="flex items-center gap-3 rounded-pieza bg-paper px-3.5 py-3 text-left transition-colors active:bg-paper-3"
            >
              <Avatar name={nombre || "?"} avatar={profile?.avatar} color="#e8b04b" size={44} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{nombre || t.cuenta.sinPerfil}</span>
                <span className={`block text-[13px] ${usuarioNombre ? "text-ink-soft" : "text-amber"}`}>
                  {usuarioNombre ? `@${usuarioNombre}` : t.cuenta.usuarioElige}
                </span>
              </span>
            </button>

            <Opcion onClick={() => setHoja("perfil")}>{t.cuenta.editarPerfil}</Opcion>
            <Opcion
              onClick={() => setHoja("amigos")}
              extra={pendientes.solicitudes > 0 ? rellena(t.cuenta.solicitudes, { n: pendientes.solicitudes }) : undefined}
            >
              {t.cuenta.amigos}
            </Opcion>
            <Opcion
              tono="clay"
              onClick={async () => {
                setHoja(null);
                await salir();
              }}
            >
              {t.cuenta.salir}
            </Opcion>

            {/* Lo legal y los correos, detrás de una sola puerta, al final. */}
            <button
              type="button"
              onClick={() => setHoja("privacidad")}
              className="mt-1 block py-2 text-center text-[12.5px] text-ink-faint underline underline-offset-2 transition-colors active:text-ink-soft"
            >
              {t.cuenta.privacidad}
            </button>
          </div>
        </Sheet>
      )}

      {hoja === "privacidad" && (
        <Sheet onClose={() => setHoja("cuenta")} titulo={t.cuenta.privacidad} sub={t.cuenta.notificacionesSub}>
          <div className="mt-5 grid gap-2.5">
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

            {/* Las novedades: lo que se marcó (o no) al registrarse, y la
                baja en un toque, que es lo que promete el pie de los correos. */}
            <button
              type="button"
              role="switch"
              aria-checked={novedades}
              onClick={() => void ponNovedades(!novedades)}
              className="flex min-h-[54px] w-full items-center justify-between gap-3 rounded-pieza border border-line-soft bg-paper px-3.5 text-left text-[15px] font-semibold"
            >
              <span>{t.cuenta.novedades}</span>
              <span className={`text-[13px] font-normal ${novedades ? "text-mint" : "text-ink-faint"}`}>
                {novedades ? t.cuenta.avisosSi : t.cuenta.avisosNo}
              </span>
            </button>
            <p className="-mt-1 px-1 text-[12px] leading-relaxed text-ink-faint">{t.cuenta.novedadesNota}</p>


            <EnlaceHoja href="/terminos">{t.cuenta.terminos}</EnlaceHoja>
            <EnlaceHoja href="/privacidad">{t.cookies.privacidad}</EnlaceHoja>
            <EnlaceHoja href="/aviso-legal">{t.cookies.avisoLegal}</EnlaceHoja>

            <CerrarHoja onClick={() => setHoja("cuenta")}>{t.cuenta.cerrar}</CerrarHoja>

            {/* Borrar la cuenta, en gris y al final de todo, que no hay
                papelera que valga si se pulsa sin querer. */}
            <EnlaceBorrado onIr={() => setHoja(null)} />
          </div>
        </Sheet>
      )}

      {hoja === "amigos" && <AmigosSheet onClose={() => setHoja("cuenta")} />}

      {hoja === "perfil" && (
        <EditNameSheet
          usuario={{ actual: usuarioNombre, cambiado: usuarioCambiado, onGuardar: ponUsuario }}
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

    </>
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

/** Una fila de la hoja que lleva a otra página, con el mismo aspecto que las opciones. */
function EnlaceHoja({ href, children }: { href: "/terminos" | "/privacidad" | "/aviso-legal"; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex min-h-[54px] w-full items-center justify-between gap-3 rounded-pieza border border-line-soft bg-paper px-3.5 text-[15px] font-semibold text-ink transition-colors active:bg-paper-3"
    >
      <span>{children}</span>
      <span aria-hidden className="text-ink-faint">›</span>
    </Link>
  );
}

/** La G de Google, como la pide Google: sus cuatro colores y nada más. */
export function G() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden width="15" height="15" className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
