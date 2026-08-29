"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EV, track } from "@/lib/track";
import { useT } from "@/lib/i18n";
import JoinByCode from "./JoinByCode";
import { useGlobalProfile } from "@/lib/useGlobalProfile";

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

/**
 * Las pantallas del subidor.
 *
 * `quien` es la que esconde la espera: la foto se está leyendo por detrás
 * mientras se pregunta el nombre, que es algo que había que preguntar de todas
 * formas y que se tarda en contestar más de lo que tarda la IA en leer.
 */
type Phase = "idle" | "reading" | "parsing" | "quien" | "entrando" | "error";

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
  const [nombre, setNombre] = useState("");
  const { profile, saveProfile } = useGlobalProfile();
  /*
    La lectura, que sigue viva mientras se pregunta el nombre.

    Es una promesa guardada y no un `await`: eso es todo el truco. La petición
    se manda al elegir la foto y nadie la espera; para cuando alguien ha
    terminado de escribir «Alejandro» y darle a entrar, hace rato que llegó.
  */
  const lectura = useRef<Promise<{ code: string }> | null>(null);

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
        const peticion = fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
        }).then(async (response) => {
          const data = (await response.json()) as { code?: string; error?: string };
          if (!response.ok || (!data.code && !targetCode)) {
            throw new Error(data.error ?? "No se ha podido leer el ticket.");
          }
          return { code: data.code ?? "", receiptId: response.headers.get("x-receipt-id") };
        });

        // Añadir un ticket a una mesa que ya existe no tiene nada que esconder:
        // quien lo hace ya está dentro y ya sabe quién es.
        if (targetCode) {
          const { receiptId } = await peticion;
          track(EV.anadeTicket, { origen: "foto" });
          onSuccess?.(receiptId);
          return;
        }

        /*
          Mesa nueva: aquí se deja de esperar.

          Antes esto era un `await` y una barra de progreso, y la barra llegaba
          al 95 % en diez segundos y ahí se quedaba. Ahora la pregunta que
          venía después —quién eres— se adelanta a la espera, y para cuando
          está contestada la comanda está leída. Si falla, se ve al momento
          aunque nadie estuviera mirando.
        */
        lectura.current = peticion.then(({ code }) => ({ code }));
        lectura.current.catch((cause) => {
          setPhase("error");
          setError(cause instanceof Error ? cause.message : "Algo ha ido mal.");
        });
        setNombre(profile?.name ?? "");
        setPhase("quien");
      } catch (cause) {
        setPhase("error");
        setError(cause instanceof Error ? cause.message : "Algo ha ido mal.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, profile],
  );

  /**
   * Se apunta a quien acaba de subir la foto y le lleva a la mesa con el QR
   * abierto.
   *
   * Se une desde aquí y no en la comanda a propósito: así llega dentro, sin
   * volver a ver «¿quién eres?» al otro lado, y lo primero que se encuentra es
   * el código para pasárselo a los demás.
   */
  async function entrar() {
    const limpio = nombre.trim();
    if (!limpio || !lectura.current || phase === "entrando") return;
    saveProfile({ name: limpio });
    setPhase("entrando");
    try {
      const { code } = await lectura.current;
      track(EV.creaDivi, { metodo: "foto" });
      try {
        const alta = await fetch(`/api/tickets/${code}/participants`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: limpio,
            avatar: profile?.avatar,
            bizum: profile?.bizum,
            revolut: profile?.revolut,
          }),
        });
        const id = alta.headers.get("x-participant-id");
        if (alta.ok && id) {
          window.localStorage.setItem(`divifriends:me:${code}`, id);
          track(EV.seApunta, { con_avatar: Boolean(profile?.avatar) });
        }
      } catch {
        // Si apuntarse falla, la mesa existe igual: al llegar le saldrá la
        // pantalla de siempre preguntándole el nombre. Mejor eso que quedarse
        // aquí con la comanda ya hecha y sin poder entrar.
      }
      router.push(`/t/${code}?compartir=1`);
    } catch (cause) {
      setPhase("error");
      setError(cause instanceof Error ? cause.message : "Algo ha ido mal.");
    }
  }

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
        className={`relative overflow-hidden rounded-[20px] border transition-colors ${
          dragging ? "border-amber bg-amber/5" : "border-line-soft bg-paper-2"
        }`}
      >
        {/*
          La misma tarjeta, dos puertas.

          El código se pedía en una hoja que subía por encima de todo, y para
          una sola casilla de seis letras era mucho aparato: tapabas la portada
          entera para escribir un código. Ahora la tarjeta se da la vuelta en su
          sitio y el pie de abajo cambia de palabra para volver.
        */}
        {phase === "quien" || phase === "entrando" ? (
          /*
            La pantalla que tapa la espera.

            Enseña la foto con el escáner encima —para que se vea que se está
            trabajando en ella y que la que has hecho vale— y pide el nombre,
            que es lo que la comanda iba a preguntar de todas formas nada más
            entrar. Lo que se gana no es tiempo: es que el tiempo esté ocupado.
          */
          <div className="flex w-full flex-col items-center gap-3.5 px-[var(--gutter)] py-7 text-center">
            {vista && <Escaner src={vista} />}
            <span className="text-[21px] font-bold leading-tight tracking-[-0.025em]">
              {t.entrar.titulo}
            </span>
            <span className="max-w-xs text-[13px] leading-relaxed text-ink-faint">
              {t.subir.mientrasLee}
            </span>
            <form
              className="w-full"
              onSubmit={(event) => {
                event.preventDefault();
                void entrar();
              }}
            >
              <input
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder={t.entrar.tuNombre}
                maxLength={40}
                aria-label={t.entrar.tuNombre}
                autoFocus
                autoComplete="given-name"
                className="min-h-[52px] w-full rounded-xl border border-line bg-paper px-4 text-center text-[16px] font-semibold focus:border-amber focus:outline-none"
              />
              <button
                type="submit"
                disabled={!nombre.trim() || phase === "entrando"}
                className="mt-2.5 min-h-[52px] w-full rounded-xl bg-amber px-4 text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:opacity-40"
              >
                {phase === "entrando" ? t.subir.preparandoMesa : t.entrar.entrar}
              </button>
            </form>
          </div>
        ) : pidiendoCodigo ? (
          <div className="flex w-full flex-col items-center gap-3.5 px-[var(--gutter)] py-7 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber text-[26px] font-bold text-paper" aria-hidden>
              #
            </span>
            <span className="text-[21px] font-bold leading-tight tracking-[-0.025em]">
              {t.subir.codigoTitulo}
            </span>
            <span className="max-w-xs text-[13px] leading-relaxed text-ink-faint">
              {t.subir.codigoAyuda}
            </span>
            <div className="w-full">
              <JoinByCode />
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-3.5 px-[var(--gutter)] py-7 text-center">
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
                className={`grid h-14 w-14 place-items-center rounded-2xl bg-amber text-paper ${
                  busy ? "animate-pulse" : ""
                }`}
                aria-hidden
              >
                <CameraIcon />
              </span>
            )}

            <span className="text-[21px] font-bold leading-tight tracking-[-0.025em]">
              {busy ? getDynamicCopy() : t.subir.titulo}
            </span>

            {/* Sólo mientras trabaja: al empezar, la frase de apoyo repetía lo que
                ya dicen el título y los dos botones de debajo. */}
            {busy && (
              <span className="max-w-sm text-[13px] leading-relaxed text-ink-soft">
                {progress < 85 ? t.subir.tardo : t.subir.cuadrando}
              </span>
            )}

            <div className="min-h-[52px] w-full">
              {busy ? (
                <div className="w-full pt-2 text-left">
                  <div className="stamp mb-2 flex justify-between text-amber">
                    <span>{t.subir.progreso}</span>
                    <span className="tnum">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-amber transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="min-h-[52px] w-full rounded-xl bg-amber px-4 text-[15px] font-bold text-paper transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                >
                  {t.subir.boton}
                </button>
              )}
            </div>
          </div>
        )}

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

        {/*
          La otra puerta, dentro de la misma tarjeta y detrás del filete.

          Quien llega con un enlace o un QR no tiene que subir ninguna foto:
          sólo meter el código. Estaba en una segunda tarjeta debajo, y dos
          cajas seguidas hacían dudar de si eran lo mismo o dos sitios
          distintos. Aquí se lee lo que es: la misma puerta, la otra manera.
        */}
        {!targetCode && !busy && (
          <>
            <div className="rule" />
            <button
              type="button"
              onClick={() => setPidiendoCodigo(!pidiendoCodigo)}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap px-4 text-[15px] font-semibold text-ink-soft transition-colors active:bg-paper-3"
            >
              {/* Una sola línea: la pregunta más el enlace se partían en dos en
                  390 px y el botón perdía la forma de puerta. Y es un acto, no
                  una pregunta, igual que «Subir foto». */}
              <span aria-hidden className="text-amber">{pidiendoCodigo ? "\u2190" : "#"}</span>
              {pidiendoCodigo ? t.subir.conFoto : t.subir.conCodigo}
            </button>
          </>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-clay/40 bg-clay/10 px-4 py-3 text-[13px] leading-relaxed text-clay"
        >
          {error}
        </p>
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
