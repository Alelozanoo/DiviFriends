"use client";

import { useState, useRef } from "react";
import { useT } from "@/lib/i18n";
import { Avatar, CerrarHoja, Sheet } from "./ui";
import { processImageToAvatarBase64 } from "@/lib/avatarUpload";
import { MarcaBizum, MarcaRevolut } from "./marcas";

export function EditNameSheet({
  currentName,
  currentAvatar,
  currentBizum,
  currentRevolut,
  onSave,
  onClose,
}: {
  currentName: string;
  currentAvatar?: string;
  currentBizum?: string;
  currentRevolut?: string;
  onSave: (name: string, avatar?: string, bizum?: string, revolut?: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const t = useT();
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(currentAvatar || "");
  const [bizum, setBizum] = useState(currentBizum || "");
  const [revolut, setRevolut] = useState(currentRevolut || "");
  const [busy, setBusy] = useState(false);
  const [preguntandoSalir, setPreguntandoSalir] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /*
    Si has tocado algo, cerrar no puede ser gratis.

    Aquí se edita el nombre, la foto y por dónde te pagan, y todo eso se pierde
    con un toque fuera de la hoja —el gesto más fácil de hacer sin querer de
    toda la pantalla—. Así que antes se pregunta.
  */
  const sucio =
    name !== currentName ||
    avatar !== (currentAvatar || "") ||
    bizum !== (currentBizum || "") ||
    revolut !== (currentRevolut || "");

  const intentarCerrar = () => (sucio ? setPreguntandoSalir(true) : onClose());

  if (preguntandoSalir) {
    return (
      <Sheet
        onClose={() => setPreguntandoSalir(false)}
        titulo={t.perfil.sinGuardarTitulo}
        sub={t.perfil.sinGuardarAviso}
      >
        <div className="mt-5 grid gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[52px] rounded-xl bg-clay text-[15px] font-bold text-paper transition-transform active:scale-[0.98]"
          >
            {t.perfil.salirSinGuardar}
          </button>
          <CerrarHoja onClick={() => setPreguntandoSalir(false)}>
            {t.perfil.seguirEditando}
          </CerrarHoja>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet onClose={intentarCerrar} titulo={t.perfil.titulo}>
      <form
        className="mt-5 flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          await onSave(
            name.trim(),
            avatar || undefined,
            bizum.trim() || undefined,
            revolut.trim().replace(/^@/, "") || undefined,
          );
          setBusy(false);
          onClose();
        }}
      >
        {/*
          La foto, pegada al nombre y sin sección propia.

          Vivía abajo del todo, detrás de un rótulo que decía «(opcional)» y de
          dos botones. Una foto de perfil no se explica: es el círculo que hay
          al lado de tu nombre, y se toca.
        */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
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
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.entrar.tuNombre}
            aria-label={t.perfil.tuNombre}
            autoCapitalize="words"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            className="min-h-[52px] w-full min-w-0 rounded-xl border border-line bg-paper px-4 text-[15px] font-semibold focus:border-amber focus:outline-none"
          />
        </div>

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              setAvatar(await processImageToAvatarBase64(file));
            } catch (error) {
              console.error("Error processing image", error);
            }
          }}
        />

        {/* Quitar la foto sólo existe cuando hay una. */}
        {avatar && (
          <button
            type="button"
            onClick={() => setAvatar("")}
            className="-mt-2 self-start text-[13px] text-ink-faint underline decoration-line underline-offset-4 transition-colors hover:text-ink"
          >
            {t.perfil.quitarFoto}
          </button>
        )}

        <p className="stamp mt-1 text-ink-faint">{t.perfil.datosPago}</p>
        <div className="-mt-2 flex flex-col gap-2">
          {/*
            Sin el «+34» delante. Es un móvil español y el prefijo no se teclea
            nunca, así que lo único que hacía era robarle sitio al número y
            hacer dudar de si había que escribirlo. Si alguien lo pega, se cae
            solo al escribir.
          */}
          <div className="flex min-h-[52px] items-center gap-2.5 rounded-xl border border-line bg-paper px-4 transition-colors focus-within:border-amber">
            <MarcaBizum height={14} className="shrink-0" />
            <input
              value={bizum}
              onChange={(event) => setBizum(event.target.value.replace(/^(\+34|0034|34)/, ""))}
              placeholder="600 000 000"
              type="tel"
              aria-label="Bizum"
              className="w-full min-w-0 bg-transparent text-[15px] font-semibold focus:outline-none"
            />
          </div>
          <div className="flex min-h-[52px] items-center gap-2.5 rounded-xl border border-line bg-paper px-4 transition-colors focus-within:border-amber">
            <MarcaRevolut height={14} className="shrink-0" />
            <span className="text-[15px] font-semibold text-ink-soft">@</span>
            <input
              value={revolut}
              onChange={(event) => setRevolut(event.target.value.replace(/^@/, ""))}
              placeholder="tu_tag"
              aria-label="Revolut"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full min-w-0 bg-transparent text-[15px] font-semibold focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="mt-1 min-h-[52px] w-full rounded-xl bg-amber text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {t.cobro.guardar}
        </button>
        <CerrarHoja onClick={intentarCerrar}>{t.perfil.cancelar}</CerrarHoja>
      </form>
    </Sheet>
  );
}
