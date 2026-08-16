"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EV, track } from "@/lib/track";
import { useT } from "@/lib/i18n";
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
  onSuccess?: (receiptId: string | null) => void;
} = {}) {
  const router = useRouter();
  const t = useT();
  /*
    Una sola entrada, sin `capture`.

    Con `capture` el móvil abre la cámara y punto; sin él enseña su propio menú
    —«Hacer foto», «Fototeca», «Archivos»—, que es justo lo que hacían los dos
    botones que había aquí. Dejar que lo ponga el sistema quita un botón de la
    pantalla y encima ofrece más sitios de donde sacar la foto.
  */
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [vista, setVista] = useState<string | null>(null);
  const [pidiendoCodigo, setPidiendoCodigo] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simula un progreso realista mientras la IA analiza la foto
  useEffect(() => {
    if (phase === "idle" || phase === "error") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (phase === "reading") return t.subir.preparando;
    if (phase === "parsing") {
      if (progress < 35) return t.subir.analizando;
      if (progress < 65) return t.subir.leyendo;
      if (progress < 85) return t.subir.extrayendo;
      return t.subir.finalizando;
    }
    return t.subir.titulo;
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
          onSuccess(response.headers.get("x-receipt-id"));
        } else if (data.code) {
          track(EV.creaDivi, { metodo: "foto" });
          router.push(`/t/${data.code}`);
        }
      } catch (cause) {
        setPhase("error");
        setError(cause instanceof Error ? cause.message : "Algo ha ido mal.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {busy ? getDynamicCopy() : t.subir.titulo}
          </span>

          {/* Sólo mientras trabaja: al empezar, la frase de apoyo repetía lo que
              ya dicen el título y los dos botones de debajo. */}
          {busy && (
            <span className="max-w-sm text-sm text-ink-soft">
              {progress < 85 
                ? t.subir.tardo
                : t.subir.cuadrando}
            </span>
          )}

          <div className="mt-1 w-full max-w-xs min-h-[52px]">
            {busy ? (
              <div className="w-full text-left pt-2">
                <div className="mb-2 flex justify-between text-[10px] font-bold tracking-widest text-amber uppercase">
                  <span>{t.subir.progreso}</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div 
                    className="h-full rounded-full bg-amber shadow-[0_0_10px_rgba(232,176,75,0.8)] transition-all duration-300 ease-out" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl bg-amber px-4 py-3.5 font-semibold text-paper transition-colors hover:bg-amber-deep disabled:cursor-wait disabled:opacity-60"
              >
                {t.subir.boton}
              </button>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />

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
          {/*
            En el móvil es una tarjeta con el mismo peso visual que la de la
            foto —sin ser tan grande—, porque ahí sólo hay dos maneras de
            empezar y las dos tienen que verse como tales. Un enlace subrayado
            al pie no se lee como una puerta. En el ordenador se queda como
            estaba: una línea discreta debajo de la tarjeta.
          */}
          <button
            type="button"
            onClick={() => setPidiendoCodigo(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-line bg-paper-2/60 px-4 py-3.5 text-sm font-semibold text-ink-soft transition-colors active:bg-paper-3 lg:mt-4 lg:border-0 lg:bg-transparent lg:py-0 lg:font-normal lg:active:bg-transparent"
          >
            {/* Una sola línea: la pregunta más el enlace se partían en dos en
                390 px y el botón perdía la forma de puerta. Y es un acto, no
                una pregunta, igual que «Subir foto». */}
            <span aria-hidden className="text-amber">#</span>
            {t.subir.conCodigo}
          </button>

          {pidiendoCodigo && (
            <Sheet onClose={() => setPidiendoCodigo(false)}>
              <h2 className="text-xl font-bold tracking-tight">{t.subir.codigoTitulo}</h2>
              <p className="mt-1 text-sm text-ink-soft">{t.subir.codigoAyuda}</p>
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
