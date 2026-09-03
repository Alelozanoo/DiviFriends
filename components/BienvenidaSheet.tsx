"use client";

import { useRef, useState } from "react";
import { processImageToAvatarBase64 } from "@/lib/avatarUpload";
import { ponUsuario } from "@/lib/cuenta";
import { useT } from "@/lib/i18n";
import { Avatar, Sheet } from "./ui";

/**
 * Lo que sale la primera vez que entras con cuenta.
 *
 * Antes no salía nada: pulsabas «Entrar con Google», la ventana se cerraba y
 * ahí acababa todo. La cuenta quedaba creada y vacía, y las tres cosas que la
 * hacen útil —el usuario con el que te añaden, y el móvil o el tag con el que
 * te devuelven el dinero— vivían detrás de dos toques que nadie da si no sabe
 * que están.
 *
 * Sale mientras no tengas usuario elegido, que es la única de las tres que no
 * se puede rellenar sola. En cuanto lo eliges, no vuelve —tampoco en otro
 * móvil, porque el usuario vive en la cuenta y no aquí—. Y «lo hago luego» la
 * calla en este aparato: quien acaba de entrar ya está dentro, y obligarle a
 * rellenar un formulario para seguir es la forma más rápida de que se vaya.
 *
 * El nombre y la foto llegan puestos —de Google si la cuenta es nueva, o de
 * este móvil si ya habías usado la app—, así que para la mayoría esto es
 * confirmar y elegir usuario.
 */
export default function BienvenidaSheet({
  nombre,
  avatar: avatarInicial,
  bizum: bizumInicial,
  revolut: revolutInicial,
  onGuardar,
  onCerrar,
}: {
  nombre: string;
  avatar?: string;
  bizum?: string;
  revolut?: string;
  onGuardar: (perfil: {
    name: string;
    avatar?: string;
    bizum?: string;
    revolut?: string;
  }) => void;
  onCerrar: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(nombre);
  const [avatar, setAvatar] = useState(avatarInicial ?? "");
  const [usuario, setUsuario] = useState("");
  const [bizum, setBizum] = useState(bizumInicial ?? "");
  const [revolut, setRevolut] = useState(revolutInicial ?? "");
  const [busy, setBusy] = useState(false);
  const [fallo, setFallo] = useState<string | null>(null);
  const foto = useRef<HTMLInputElement>(null);

  /*
    Guardar es una sola cosa para quien lo usa, dos por dentro: el perfil vive
    en el móvil y sube solo, y el usuario tiene que pedirse al servidor porque
    es el único dato que puede estar cogido. Por eso el usuario va el último:
    si falla, el nombre y la foto ya están a salvo y sólo hay que corregir esa
    línea.
  */
  async function guardar() {
    if (busy) return;
    setFallo(null);
    setBusy(true);
    try {
      onGuardar({
        name: name.trim() || nombre,
        avatar: avatar || undefined,
        bizum: bizum.trim() || undefined,
        revolut: revolut.trim() || undefined,
      });
      const elegido = usuario.trim().replace(/^@/, "");
      if (elegido) await ponUsuario(elegido);
      onCerrar();
    } catch (error) {
      setFallo(error instanceof Error ? error.message : t.comanda.errorGuardar);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet onClose={onCerrar} titulo={t.bienvenida.titulo} sub={t.bienvenida.entradilla}>
      {/* Quién eres: la foto y el nombre, ya puestos. */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => foto.current?.click()}
          aria-label={avatar ? t.perfil.cambiarFoto : t.perfil.ponerFoto}
          className="relative shrink-0 rounded-full transition-transform active:scale-95"
        >
          <Avatar name={name || "?"} avatar={avatar} color="#e8b04b" size={52} />
          <span
            aria-hidden
            className="absolute -bottom-0.5 -right-0.5 grid h-[22px] w-[22px] place-items-center rounded-full border-2 border-paper-2 bg-amber text-paper"
          >
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
          className="min-h-[52px] w-full min-w-0 rounded-pieza border border-line bg-paper px-4 text-[16px] font-semibold focus:border-amber focus:outline-none"
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

      {/* El usuario, que es lo único que no se puede adivinar. */}
      <p className="mt-5 text-[15px] font-semibold">{t.cuenta.usuarioElige}</p>
      <div className="mt-2 flex items-center rounded-pieza border border-line bg-paper px-3.5">
        <span className="text-[16px] text-ink-faint">@</span>
        <input
          value={usuario}
          onChange={(event) =>
            setUsuario(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20))
          }
          placeholder={t.bienvenida.usuarioEjemplo}
          aria-label={t.cuenta.usuario}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="min-h-[52px] w-full min-w-0 bg-transparent px-1 text-[16px] font-semibold focus:outline-none"
        />
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-faint">{t.bienvenida.usuarioAyuda}</p>

      {/* Cómo te pagan. Opcional, y dicho por qué conviene. */}
      <p className="mt-5 text-[15px] font-semibold">{t.bienvenida.comoTePagan}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">{t.bienvenida.comoTePaganAyuda}</p>
      <div className="mt-2 grid gap-2">
        <input
          value={bizum}
          onChange={(event) => setBizum(event.target.value)}
          placeholder={t.cobro.tuBizum}
          aria-label={t.cobro.tuBizum}
          inputMode="tel"
          maxLength={20}
          className="min-h-[52px] w-full rounded-pieza border border-line bg-paper px-4 text-[16px] focus:border-amber focus:outline-none"
        />
        <div className="flex items-center rounded-pieza border border-line bg-paper px-3.5">
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

      {fallo && <p className="mt-3 text-[13px] font-semibold text-clay">{fallo}</p>}

      <button
        type="button"
        onClick={() => void guardar()}
        disabled={busy}
        className="mt-6 min-h-[52px] w-full rounded-pieza bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
      >
        {t.bienvenida.guardar}
      </button>
      <button
        type="button"
        onClick={onCerrar}
        disabled={busy}
        className="mt-2 min-h-[46px] w-full rounded-pieza text-[15px] font-semibold text-ink-faint transition-colors active:bg-paper-3"
      >
        {t.bienvenida.luego}
      </button>
    </Sheet>
  );
}
