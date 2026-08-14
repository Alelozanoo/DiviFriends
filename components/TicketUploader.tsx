"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EV, track } from "@/lib/track";
import JoinByCode from "./JoinByCode";
import { Sheet } from "./ui";

/**
 * Reduce la foto antes de subirla. Además de ahorrar ancho de banda, el canvas
 * reescribe cualquier formato que el navegador sepa pintar (HEIC en iOS,
 * incluido) como JPEG, que es lo que acepta la API de visión.
 */
async function toJpegBase64(
  file: File,
  maxEdge = 2000,
): Promise<{ base64: string; vista: string }> {
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
  // Se devuelve también la imagen entera para poder enseñarla mientras se lee.
  // Va la del canvas y no el archivo original a propósito: aquí ya es un JPEG
  // que cualquier navegador pinta, y el HEIC del iPhone no lo sería.
  return { base64: dataUrl.slice(dataUrl.indexOf(",") + 1), vista: dataUrl };
}

type Phase = "idle" | "reading" | "parsing" | "error";

export default function TicketUploader({
  targetCode,
  onSuccess,
}: {
  targetCode?: string;
  onSuccess?: () => void;
} = {}) {
  const router = useRouter();
  // Dos entradas separadas: `capture` abre la cámara directamente, y sin él el
  // sistema enseña el carrete. Con una sola no se puede tener ambas cosas.
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [vista, setVista] = useState<string | null>(null);
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simula un progreso realista mientras la IA analiza la foto
  useEffect(() => {
    if (phase === "idle" || phase === "error") {
      setProgress(0);
      return;
    }
    if (phase === "reading") {
      setProgress(5);
      return;
    }
    if (phase === "parsing") {
      setProgress(15);
      let current = 15;
      const interval = setInterval(() => {
        // Incrementa de forma asintótica hacia el 95%
        current += (96 - current) * 0.08;
        setProgress(Math.floor(current));
      }, 400);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const getDynamicCopy = () => {
    if (phase === "reading") return "Preparando la foto…";
    if (phase === "parsing") {
      if (progress < 35) return "Analizando foto…";
      if (progress < 65) return "Leyendo comandas…";
      if (progress < 85) return "Extrayendo precios…";
      return "Finalizando…";
    }
    return "Sube la foto del ticket";
  };

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setVista(null);
      setPhase("reading");
      try {
        const { base64, vista } = await toJpegBase64(file);
        setVista(vista);
        setPhase("parsing");

        const endpoint = targetCode ? `/api/tickets/${targetCode}/receipts` : "/api/tickets";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
        });
        const data = (await response.json()) as { code?: string; error?: string };

        if (!response.ok || (!data.code && !targetCode)) {
          throw new Error(data.error ?? "No se ha podido leer el ticket.");
        }
        
        if (targetCode && onSuccess) {
          track(EV.anadeTicket, { origen: "foto" });
          onSuccess();
        } else if (data.code) {
          track(EV.creaDivi, { metodo: "foto" });
          router.push(`/t/${data.code}`);
        }
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
        <div className="flex w-full flex-col items-center gap-4 rounded-2xl bg-paper-2 px-6 py-8 text-center sm:py-10">
          {/*
            En cuanto la foto está lista se enseña con el escáner encima. Leer
            un ticket tarda varios segundos y un icono parpadeando no dice nada:
            ver tu propia foto con la línea pasando por encima cuenta que se
            está trabajando sobre ella, y que la que has hecho vale.
          */}
          {vista ? (
            <Escaner src={vista} />
          ) : (
            <span
              className={`grid h-16 w-16 place-items-center rounded-2xl bg-amber text-paper ${
                busy ? "animate-pulse" : ""
              }`}
              aria-hidden
            >
              <CameraIcon />
            </span>
          )}

          <span className="text-xl font-semibold tracking-tight sm:text-2xl">
            {busy ? getDynamicCopy() : "Sube la foto del ticket"}
          </span>

          {/* Sólo mientras trabaja: al empezar, la frase de apoyo repetía lo que
              ya dicen el título y los dos botones de debajo. */}
          {busy && (
            <span className="max-w-sm text-sm text-ink-soft">
              {progress < 85 
                ? "Tardo unos segundos en reconocer cada línea."
                : "La IA está cuadrando los totales."}
            </span>
          )}

          <div className="mt-1 flex w-full max-w-xs flex-col gap-2 sm:flex-row">
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="flex-1 rounded-xl bg-amber px-4 py-3 font-semibold text-paper transition-colors hover:bg-ink disabled:cursor-wait disabled:opacity-60"
            >
              Hacer foto
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
              className="flex-1 rounded-xl border border-line px-4 py-3 font-semibold text-ink-soft transition-colors hover:border-amber hover:text-amber disabled:cursor-wait disabled:opacity-60"
            >
              De la galería
            </button>
          </div>
        </div>

        <input
          ref={cameraRef}
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
        <input
          ref={galleryRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />

        {busy && (
          <div className="absolute inset-x-6 bottom-5">
            <div className="mb-2 flex justify-between text-[10px] font-bold tracking-widest text-amber uppercase">
              <span>Progreso</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div 
                className="h-full rounded-full bg-amber shadow-[0_0_10px_rgba(232,176,75,0.8)] transition-all duration-300 ease-out" 
                style={{ width: `${progress}%` }}
              />
            </div>
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

      {/*
        Quien llega con un enlace o un QR de una mesa que ya existe no tiene que
        subir ninguna foto: sólo meter el código. Antes eso vivía en un bloque
        aparte siempre abierto, y le robaba sitio al único botón que importa la
        primera vez. Ahora se pide al pulsar.
      */}
      {!targetCode && (
        <>
          <p className="mt-4 text-center text-sm text-ink-soft">
            ¿Ya tienes un Divi?{" "}
            <button
              type="button"
              onClick={() => setPidiendoCodigo(true)}
              className="text-amber underline underline-offset-4 hover:text-ink"
            >
              Introduce el código
            </button>
          </p>

          {pidiendoCodigo && (
            <Sheet onClose={() => setPidiendoCodigo(false)}>
              <h2 className="text-xl font-bold tracking-tight">El código de la mesa</h2>
              <p className="mt-1 text-sm text-ink-soft">
                Seis caracteres. Están en el ticket impreso o te los pasa quien creó el Divi.
              </p>
              <div className="mt-4">
                <JoinByCode />
              </div>
            </Sheet>
          )}
        </>
      )}
    </div>
  );
}

/**
 * La foto que acabas de hacer, con una línea recorriéndola de arriba abajo.
 *
 * Las esquinas en ángulo son las del visor de una cámara: encuadran la foto sin
 * taparla y dicen «esto se está mirando». La imagen se atenúa un poco para que
 * la línea destaque sobre un ticket blanco, que es lo normal.
 */
function Escaner({ src }: { src: string }) {
  return (
    <div className="relative h-40 w-32 overflow-hidden rounded-xl border border-line bg-paper sm:h-48 sm:w-36">
      {/* Es un data URL efímero de la propia sesión: `next/image` no aporta nada. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-cover opacity-70" />

      {/* la línea que barre */}
      <div
        aria-hidden
        className="absolute inset-x-0 h-16 animate-[escaneo_2.2s_ease-in-out_infinite] motion-reduce:hidden"
        style={{
          background:
            "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--amber) 26%, transparent) 62%, var(--amber) 96%, transparent)",
        }}
      />

      {/* esquinas de visor */}
      <div aria-hidden className="absolute inset-0">
        {[
          "left-1.5 top-1.5 border-l-2 border-t-2",
          "right-1.5 top-1.5 border-r-2 border-t-2",
          "left-1.5 bottom-1.5 border-b-2 border-l-2",
          "right-1.5 bottom-1.5 border-b-2 border-r-2",
        ].map((esquina) => (
          <span key={esquina} className={`absolute h-4 w-4 rounded-sm border-amber ${esquina}`} />
        ))}
      </div>
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
