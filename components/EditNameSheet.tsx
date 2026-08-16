"use client";

import { useState, useRef } from "react";
import { useT } from "@/lib/i18n";
import { Sheet } from "./ui";
import { Avatar } from "./ui";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold tracking-tight mb-4">{t.perfil.titulo}</h2>
      
      <p className="stamp text-ink-faint">{t.perfil.tuNombre}</p>
      <form
        className="flex flex-col gap-4 mt-2"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim() || busy) return;
          setBusy(true);
          await onSave(name.trim(), avatar || undefined, bizum.trim() || undefined, revolut.trim().replace(/^@/, '') || undefined);
          setBusy(false);
          onClose();
        }}
      >
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t.entrar.tuNombre}
            autoCapitalize="words"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={20}
            className="w-full min-w-0 rounded-xl border border-line bg-paper px-4 py-3 font-semibold focus:border-amber focus:outline-none"
          />
        </div>

        <p className="stamp text-ink-faint mt-1">{t.perfil.datosPago}</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 focus-within:border-amber transition-colors">
            <MarcaBizum height={14} className="shrink-0" />
            <span className="text-ink-soft font-semibold">+34</span>
            <input
              value={bizum}
              onChange={(event) => setBizum(event.target.value.replace(/^\+34|^\+/, ''))}
              placeholder="600 000 000"
              type="tel"
              className="w-full min-w-0 bg-transparent font-semibold focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-line bg-paper px-4 py-3 focus-within:border-amber transition-colors">
            <MarcaRevolut height={14} className="shrink-0" />
            <span className="text-ink-soft font-semibold">@</span>
            <input
              value={revolut}
              onChange={(event) => setRevolut(event.target.value.replace(/^@/, ''))}
              placeholder="tu_tag"
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full min-w-0 bg-transparent font-semibold focus:outline-none"
            />
          </div>
        </div>

        <p className="stamp text-ink-faint mt-2">{t.perfil.tuFoto}</p>
        <div className="flex gap-3">
          <div className="shrink-0 flex items-center justify-center">
            <Avatar name={name || "Yo"} avatar={avatar} color="#e8b04b" size={56} />
          </div>
          <div className="flex flex-col gap-2 flex-1 justify-center">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-xl border border-line bg-paper px-4 py-2 text-sm font-semibold transition-colors hover:bg-paper-2 active:bg-paper-3"
            >
              {t.perfil.subirFoto}
            </button>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const base64 = await processImageToAvatarBase64(file);
                  setAvatar(base64);
                } catch (error) {
                  console.error("Error processing image", error);
                }
              }}
            />
            {avatar && (
              <button
                type="button"
                onClick={() => setAvatar("")}
                className="w-full rounded-xl border border-transparent bg-paper-2 px-4 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-paper-3 active:bg-paper-4"
              >
                {t.perfil.quitarFoto}
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="mt-2 w-full rounded-xl bg-amber py-3.5 font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {t.cobro.guardar}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="w-full rounded-xl border border-line py-3 text-sm font-semibold text-ink-soft transition-colors active:bg-paper-3"
        >
          {t.perfil.cancelar}
        </button>
      </form>
    </Sheet>
  );
}
