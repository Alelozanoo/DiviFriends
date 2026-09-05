"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { processImageToAvatarBase64 } from "@/lib/avatarUpload";
import { ponNovedades, ponUsuario, useCuenta } from "@/lib/cuenta";
import { useT } from "@/lib/i18n";
import { useGlobalProfile } from "@/lib/useGlobalProfile";
import { G } from "./CuentaBoton";
import { Avatar } from "./ui";

/**
 * El registro: la primera pantalla después de entrar con Google.
 *
 * Antes era una hoja que se podía saltar («Lo hago luego»), y la cuenta se
 * quedaba a medias: sin usuario no te podían añadir y sin Bizum no te podían
 * pagar. Desde el 4 de septiembre de 2026 es una página, se pasa una vez, y
 * para guardar hay que aceptar los términos. La portada manda aquí a quien
 * tiene sesión y todavía no los ha aceptado.
 *
 * Lo que se pide: la foto y el nombre (ya vienen de Google), el usuario, y
 * cómo te pagan. Y dos casillas: los términos, obligatoria, y las novedades,
 * opcional y **sin marcar de antemano**, que es lo que exige la ley para que
 * el consentimiento valga. Lo que se puede hacer es explicarla bien.
 */
const SISTEMA = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, "Segoe UI", Roboto, sans-serif';

export default function Registro() {
  const t = useT();
  const router = useRouter();
  const { usuario, cargada, usuarioNombre, entrar, ocupado } = useCuenta();
  const { profile, saveProfile } = useGlobalProfile();

  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [user, setUser] = useState("");
  const [bizum, setBizum] = useState("");
  const [revolut, setRevolut] = useState("");
  const [novedades, setNovedades] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const [precargado, setPrecargado] = useState(false);
  const foto = useRef<HTMLInputElement>(null);

  // Lo que ya se sabe —la foto y el nombre de Google, lo que hubiera en este
  // móvil— llega después de pintar, así que se vuelca una sola vez.
  useEffect(() => {
    if (precargado || !profile) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(profile.name ?? "");
    setAvatar(profile.avatar ?? "");
    setBizum(profile.bizum ?? "");
    setRevolut(profile.revolut ?? "");
    setPrecargado(true);
  }, [profile, precargado]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (usuarioNombre) setUser((v) => v || usuarioNombre);
  }, [usuarioNombre]);

  /*
    Quien ya pasó por aquí no vuelve: a sus mesas.

    La llave era haber aceptado los términos, y dejó de servir el 6 de
    septiembre de 2026: ahora se aceptan al entrar con Google, debajo del
    botón, así que todo el mundo los tiene desde el primer segundo y esta
    página no habría vuelto a salir. La llave es el usuario, que es lo único
    de aquí que no se puede rellenar solo y lo que hace falta para que te
    añadan.
  */
  /*
    A dónde se vuelve al acabar: a tus mesas, o a la mesa desde la que se
    entró con Google (`?volver=/t/ABC123`). Sólo rutas de la casa: una
    dirección completa no se acepta, que un enlace de registro no puede
    llevar a nadie fuera.
  */
  const destino = () => {
    const v = new URLSearchParams(window.location.search).get("volver");
    return v && v.startsWith("/") && !v.startsWith("//") ? v : "/";
  };

  useEffect(() => {
    if (usuario && cargada && usuarioNombre) router.replace(destino());
  }, [usuario, cargada, usuarioNombre, router]);

  async function guardar() {
    setFallo(null);
    if (!name.trim()) return setFallo(t.cuentaNueva.faltaNombre);
    if (!user) return setFallo(t.cuentaNueva.faltaUsuario);
    setBusy(true);
    try {
      saveProfile({
        name: name.trim(),
        avatar: avatar || undefined,
        bizum: bizum.trim() || undefined,
        revolut: revolut.trim() || undefined,
      });
      // El usuario primero: si está cogido, se corrige y se vuelve a guardar
      // sin haber dejado nada a medias por el camino.
      if (user !== usuarioNombre) await ponUsuario(user);
      await ponNovedades(novedades);
      router.replace(destino());
    } catch (error) {
      setFallo(error instanceof Error ? error.message : t.comanda.errorGuardar);
    } finally {
      setBusy(false);
    }
  }

  if (usuario === undefined) return null;

  return (
    <main id="contenido" className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-12" style={{ fontFamily: SISTEMA }}>
      {usuario === null ? (
        /* Se llega aquí sin sesión —un enlace guardado, un atrás del
           navegador— y lo primero es entrar. */
        <section className="flex flex-1 flex-col items-center justify-center text-center">
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">{t.cuentaNueva.sinSesionTitulo}</h1>
          <p className="mt-2 max-w-[30ch] text-[15px] leading-[1.45] text-ink-soft">{t.cuentaNueva.sinSesionTexto}</p>
          <button
            type="button"
            onClick={() => void entrar()}
            disabled={ocupado}
            className="mt-6 flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-ink px-6 text-[16px] font-semibold text-paper disabled:opacity-60"
          >
            <G />
            {t.cuentaNueva.google}
          </button>
        </section>
      ) : (
        <>
          <header className="pt-6">
            <h1 className="text-[30px] font-bold leading-[1.1] tracking-[-0.5px]">{t.cuentaNueva.titulo}</h1>
            <p className="mt-2 text-[15px] leading-[1.45] text-ink-soft">{t.cuentaNueva.entradilla}</p>
          </header>

          {/* ── quién eres: la foto y el nombre, ya puestos */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => foto.current?.click()}
              aria-label={avatar ? t.perfil.cambiarFoto : t.perfil.ponerFoto}
              className="relative shrink-0 rounded-full transition-transform active:scale-95"
            >
              <Avatar name={name || "?"} avatar={avatar} color="#e8b04b" size={56} />
              <span aria-hidden className="absolute -bottom-0.5 -right-0.5 grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-paper bg-amber text-paper">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8.5h3l1.5-2h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
              </span>
            </button>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.perfil.tuNombre}
              aria-label={t.perfil.tuNombre}
              autoCapitalize="words"
              maxLength={20}
              className="min-h-[52px] w-full min-w-0 rounded-pieza border border-line-soft bg-paper-2 px-4 text-[16px] font-semibold focus:border-amber focus:outline-none"
            />
          </div>
          <input
            type="file"
            accept="image/*"
            ref={foto}
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              try {
                setAvatar(await processImageToAvatarBase64(file));
              } catch {
                /* una foto que el navegador no sabe abrir: se queda la inicial */
              }
            }}
          />

          {/* ── el usuario, que es lo único que no se puede adivinar */}
          <p className="mt-6 text-[15px] font-semibold">{t.cuenta.usuarioElige}</p>
          <div className="mt-2 flex items-center rounded-pieza border border-line-soft bg-paper-2 px-3.5">
            <span className="text-[16px] text-ink-faint">@</span>
            <input
              value={user}
              onChange={(event) => setUser(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))}
              placeholder={t.bienvenida.usuarioEjemplo}
              aria-label={t.cuenta.usuario}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-h-[52px] w-full min-w-0 bg-transparent px-1 text-[16px] font-semibold focus:outline-none"
            />
          </div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-faint">
            {t.bienvenida.usuarioAyuda} {t.cuenta.usuarioNota14}
          </p>

          {/* ── cómo te pagan */}
          <p className="mt-6 text-[15px] font-semibold">{t.bienvenida.comoTePagan}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">{t.bienvenida.comoTePaganAyuda}</p>
          <div className="mt-2 grid gap-2">
            <input
              value={bizum}
              onChange={(event) => setBizum(event.target.value)}
              placeholder={t.cobro.tuBizum}
              aria-label={t.cobro.tuBizum}
              inputMode="tel"
              maxLength={20}
              className="min-h-[52px] w-full rounded-pieza border border-line-soft bg-paper-2 px-4 text-[16px] focus:border-amber focus:outline-none"
            />
            <div className="flex items-center rounded-pieza border border-line-soft bg-paper-2 px-3.5">
              <span className="shrink-0 text-[15px] text-ink-faint">revolut.me/</span>
              <input
                value={revolut}
                onChange={(event) => setRevolut(event.target.value)}
                placeholder={t.cobro.ejemploRevolut}
                aria-label={t.cobro.tuRevolut}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={32}
                className="min-h-[52px] w-full min-w-0 bg-transparent px-1 text-[16px] focus:outline-none"
              />
            </div>
          </div>

          {/*
            Una sola casilla, y sin marcar.

            La de los términos ya no está: se aceptan al entrar con Google,
            debajo del botón, y volver a pedirlos aquí sería preguntar dos
            veces lo mismo. Queda la de las novedades, que es un consentimiento
            distinto —publicidad— y por eso tiene que ir aparte, a mano y en
            blanco: una casilla de marketing premarcada no vale nada en la UE
            desde la sentencia Planet49. Lo que sí se puede hacer es explicar
            qué te va a llegar y cada cuánto, que es lo que de verdad decide
            si alguien la marca.

            Va al final a propósito: quien acaba de rellenar el usuario y cómo
            le pagan está en modo «completar». Arriba sería un peaje.
          */}
          <div className="mt-7">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={novedades}
                onChange={(event) => setNovedades(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[#e8b04b]"
              />
              <span className="text-[15px] leading-[1.45]">
                {t.cuentaNueva.novedades}
                <span className="block text-[13px] text-ink-faint">{t.cuentaNueva.novedadesNota}</span>
              </span>
            </label>
          </div>

          {fallo && (
            <p role="alert" className="mt-4 text-[13px] font-semibold text-clay">
              {fallo}
            </p>
          )}

          <button
            type="button"
            onClick={() => void guardar()}
            disabled={busy || !name.trim() || !user}
            className="mt-6 min-h-[52px] w-full rounded-[14px] bg-amber text-[17px] font-semibold text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            {t.cuentaNueva.guardar}
          </button>
          <p className="mt-3 text-center text-[12.5px] leading-relaxed text-ink-faint">
            {t.cuentaNueva.yaAceptados}{" "}
            <Link href="/terminos" target="_blank" rel="noopener" className="underline underline-offset-2">
              {t.cuentaNueva.terminosEnlace}
            </Link>{" "}
            {t.varios.y}{" "}
            <Link href="/privacidad" target="_blank" rel="noopener" className="underline underline-offset-2">
              {t.cookies.privacidad}
            </Link>
            .
          </p>
        </>
      )}
    </main>
  );
}
