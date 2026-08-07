"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/**
 * Reduce la foto antes de subirla. Además de ahorrar ancho de banda, el canvas
 * reescribe cualquier formato que el navegador sepa pintar (HEIC en iOS,
 * incluido) como JPEG, que es lo que acepta la API de visión.
 */
async function toJpegBase64(file: File, maxEdge = 2000): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no puede procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

type Phase = "idle" | "reading" | "parsing" | "error";

const PHASE_COPY: Record<string, string> = {
  reading: "Preparando la foto…",
  parsing: "Leyendo el ticket…",
};

export default function TicketUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setPhase("reading");
      try {
        const base64 = await toJpegBase64(file);
        setPhase("parsing");

        const response = await fetch("/api/tickets", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
        });
        const data = (await response.json()) as { code?: string; error?: string };

        if (!response.ok || !data.code) {
          throw new Error(data.error ?? "No se ha podido leer el ticket.");
        }
        router.push(`/t/${data.code}`);
      } catch (cause) {
        setPhase("error");
        setError(cause instanceof Error ? cause.message : "Algo ha ido mal.");
      }
    },
    [router],
  );

  const busy = phase === "reading" || phase === "parsing";

  return (
    <div className="w-full">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files?.[0];
          if (file) void upload(file);
        }}
        className={`relative rounded-3xl border-2 border-dashed p-2 transition-colors ${
          dragging ? "border-amber bg-amber/5" : "border-line"
        }`}
      >
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="group flex w-full flex-col items-center gap-4 rounded-2xl bg-paper-2 px-6 py-10 text-center transition-colors hover:bg-paper-3 disabled:cursor-wait sm:py-14"
        >
          <span
            className={`grid h-16 w-16 place-items-center rounded-2xl bg-amber text-paper transition-transform ${
              busy ? "animate-pulse" : "group-hover:-rotate-6 group-hover:scale-105"
            }`}
            aria-hidden
          >
            <CameraIcon />
          </span>

          <span className="text-xl font-semibold tracking-tight sm:text-2xl">
            {busy ? PHASE_COPY[phase] : "Sube la foto del ticket"}
          </span>

          <span className="max-w-sm text-sm text-ink-soft">
            {busy
              ? "Tardo unos segundos en reconocer cada línea."
              : "Hazle una foto al papel. Reconozco los platos, los precios y el total."}
          </span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />

        {busy && (
          <div className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-line">
            <div className="h-full w-1/3 animate-[rise_1.2s_ease-in-out_infinite] rounded-full bg-amber" />
          </div>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-clay/40 bg-clay/10 px-4 py-3 text-sm text-clay"
        >
          {error}
        </p>
      )}

      <p className="mt-4 text-center text-sm text-ink-soft">
        ¿No tienes el ticket a mano?{" "}
        <Link href="/nueva" className="text-amber underline underline-offset-4 hover:text-ink">
          Escribe la comanda a mano
        </Link>
      </p>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </svg>
  );
}
