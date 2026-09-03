"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EV, track } from "@/lib/track";
import { useLang, useT } from "@/lib/i18n";
import JoinByCode from "./JoinByCode";

/**
 * Reduce la foto antes de subirla. Además de ahorrar ancho de banda, el canvas
 * reescribe cualquier formato que el navegador sepa pintar (HEIC en iOS,
 * incluido) como JPEG, que es lo que acepta la API de visión.
 *
 * 1400 px y no 2000 desde el 29 de agosto de 2026, y el motivo es que medirlo
 * sorprendió: el modelo cobra **los mismos 1232 tokens de entrada** con la foto
 * a 2000, a 1400, a 1000 y a 700 px, porque la reescala él a su propia rejilla
 * antes de mirarla. Los píxeles de más no los llega a ver nadie; lo único que
 * hacen es tardar en subir. De 118 KB a 70, que en el 4G de un bar lleno es
 * medio segundo largo. Por debajo de 1400 empezaría a preocuparme la letra
 * pequeña de un ticket arrugado de verdad, y eso ya no lo prueba una foto
 * dibujada por mí.
 */
async function toJpegBase64(
  file: File,
  maxEdge = 1400,
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

/**
 * Lo que se tarda en entrar en la mesa. A propósito, y ni un milisegundo menos.
 *
 * Abrir la comanda vacía tarda unos novecientos milisegundos, y saltar de golpe
 * a la sala se siente a tirón, no a rápido: no da tiempo a ver que ha pasado
 * algo. Tres segundos es lo que dura el gesto que se quiere — la barra sale,
 * se llena entera y estás dentro—, y con margen para que la foto se termine de
 * leer detrás sin que la mesa aparezca a medias.
 *
 * Antes eran 1300 (segundo y medio menos los ~200 ms que tarda en pintarse la
 * comanda tras el `push`). Se subió a tres segundos el 3 de septiembre de 2026
 * porque en la calle entrar tan pronto se veía precipitado.
 *
 * Si el servidor tarda más, manda el servidor: esto es un suelo, no un techo.
 */
const ENTRADA_MS = 3000;

/**
 * Los tres tonos del papel, los mismos que usa `PaperTicket`.
 *
 * El secundario no es el `#776a5c` de allí: sobre el crema mide 4,47:1 y el
 * mínimo para texto pequeño es 4,5. Allí pasa porque se usa en cifras grandes;
 * aquí lleva frases de trece píxeles, así que baja a `#6b5f52`, que mide 5,29.
 */
const PAPEL = "bg-[#f4ece0] text-[#14100d]";
const TINTA_SUAVE = "text-[#6b5f52]";

export default function TicketUploader({
  targetCode,
  onSuccess,
}: {
  targetCode?: string;
  onSuccess?: (receiptId: string | null) => void;
} = {}) {
  const router = useRouter();
  const t = useT();
  const lang = useLang();
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
  /** Cuándo se tocó el botón: la barra se mide desde ahí, no desde cada fase. */
  const arranque = useRef(0);

  // Simula un progreso realista mientras la IA analiza la foto
  useEffect(() => {
    if (phase === "idle" || phase === "error") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(0);
      return;
    }
    /*
      Mesa nueva: la barra mide el camino entero y llega al final justo al
      entrar. Puede hacerlo porque el camino se conoce —abrir un documento— y
      dura lo que dura `ENTRADA_MS`; no hay nada que adivinar, así que la barra
      no tiene que mentir.
    */
    if (!targetCode) {
      const interval = setInterval(() => {
        setProgress(Math.min(100, Math.round(((Date.now() - arranque.current) / ENTRADA_MS) * 100)));
      }, 40);
      return () => clearInterval(interval);
    }

    if (phase === "reading") {
      setProgress(5);
      return;
    }
    if (phase === "parsing") {
      // Añadir un ticket a una mesa que existe sí espera a la IA, y ahí no se
      // sabe cuánto falta: la barra se acerca al 95 % sin llegar nunca.
      setProgress(15);
      let current = 15;
      const interval = setInterval(() => {
        current += (96 - current) * 0.08;
        setProgress(Math.floor(current));
      }, 400);
      return () => clearInterval(interval);
    }
  }, [phase, targetCode]);

  const getDynamicCopy = () => {
    if (phase === "reading") return t.subir.preparando;
    // Aquí ya no se está leyendo el ticket —eso pasa dentro de la mesa—, así
    // que decir «extrayendo precios» sería contar una película.
    if (phase === "parsing" && !targetCode) return t.subir.abriendoMesa;
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
      arranque.current = Date.now();
      setError(null);
      setVista(null);
      setPhase("reading");
      try {
        const { base64, vista } = await toJpegBase64(file);
        setVista(vista);
        setPhase("parsing");

        // Añadir un ticket a una mesa que ya existe se hace aquí y esperando:
        // quien lo hace ya está dentro, ya sabe quién es y ya ve la comanda.
        if (targetCode) {
          setPhase("parsing");
          const response = await fetch(`/api/tickets/${targetCode}/receipts`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
          });
          const data = (await response.json()) as { error?: string };
          if (!response.ok) throw new Error(data.error ?? "No se ha podido leer el ticket.");
          track(EV.anadeTicket, { origen: "foto" });
          onSuccess?.(response.headers.get("x-receipt-id"));
          return;
        }

        /*
          Mesa nueva: primero la sala, después el ticket.

          La mesa se crea vacía —un documento, trescientos milisegundos— y se
          entra en ella al momento. La foto viaja en `sessionStorage` y la lee
          la propia comanda desde dentro, con la persona ya en su sala,
          escribiendo su nombre y pasando el código a los demás. La espera no
          desaparece: pasa a ocurrir detrás de algo que había que hacer igual.

          Se guarda en `sessionStorage` y no en un estado porque en medio hay un
          cambio de pantalla, y lo que hay en memoria no lo cruza.
        */
        const response = await fetch("/api/tickets", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ vacia: true }),
        });
        const data = (await response.json()) as { code?: string; error?: string };
        if (!response.ok || !data.code) {
          throw new Error(data.error ?? "No se ha podido abrir la mesa.");
        }
        try {
          window.sessionStorage.setItem(
            `divi:foto:${data.code}`,
            JSON.stringify({ image: base64, mediaType: "image/jpeg" }),
          );
        } catch {
          // Sin sitio donde dejarla —modo privado, disco lleno— la mesa existe
          // igual y se puede escribir a mano. Peor sería no entrar.
        }
        track(EV.creaDivi, { metodo: "foto" });

        /*
          La mesa se pide mientras la barra todavía corre.

          Sin esto, al llegar al 100 % había que esperar otros trescientos
          milisegundos a que el servidor mandara la página: la barra llena y la
          pantalla quieta, que es exactamente la sensación que se quería quitar.
          Pidiéndola por adelantado, esos milisegundos caben dentro de los tres
          segundos que ya se estaban esperando y el salto es instantáneo.
        */
        const destino = `/t/${data.code}?nuevo=1`;
        router.prefetch(destino);

        // Y que la barra termine su recorrido: entrar antes se ve a tirón.
        const falta = ENTRADA_MS - (Date.now() - arranque.current);
        if (falta > 0) await new Promise((listo) => setTimeout(listo, falta));
        router.push(destino);
      } catch (cause) {
        setPhase("error");
        setError(cause instanceof Error ? cause.message : "Algo ha ido mal.");
      }
    },
    [router, targetCode, onSuccess],
  );

  const busy = phase === "reading" || phase === "parsing";

  return (
    <div className="w-full">
      {/*
        Esto no es una tarjeta: es el papel.

        Era una caja oscura con borde y esquinas redondas, o sea la misma caja
        que tiene cualquier otra web, y encima llevaba dentro un pictograma de
        cámara metido en un cuadradito ámbar. Lo que se sube aquí es un ticket,
        y el ticket ya sabemos dibujarlo: `PaperTicket` y los cuatro pasos de la
        portada llevan meses pintando papel crema con los bordes dentados. Es
        raro que lo único que hay que tocar no fuera de papel.

        Sobre el fondo café oscuro, esta hoja es lo único iluminado de la
        pantalla, que es exactamente lo que dice el lenguaje visual de la casa:
        un ticket visto de noche. Y de paso el sitio donde hay que tocar deja de
        competir con nada.
      */}
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
        className={`relative transition-[filter] ${dragging ? "brightness-95" : ""}`}
      >
        {/* Los dientes de arriba, como en `ComoVa`: el mismo truco de la casa,
            una tira con la máscara y su gemela girada al final. */}
        <div className={`${PAPEL} torn-top h-2.5`} />
        <div className={`${PAPEL} relative overflow-hidden px-[var(--gutter)] pb-5 pt-4`}>
          {/*
            Un ticket impreso, no una hoja en blanco.

            La versión anterior era un rectángulo crema con un botón arriba y
            un claro de cuatrocientos píxeles debajo: tenía la forma de un
            ticket y nada de lo que hace que un ticket se lea como tal. Lo que
            lo hace es la estructura —cabecera, filetes, líneas, código de
            barras—, y aquí las dos maneras de entrar son las dos líneas del
            ticket. El alto sale de lo impreso, sin `min-h` que estirar.

            Todo lo que va en mayúsculas de impresora estaría impreso en un
            ticket de verdad: el nombre de la casa y la fecha de hoy. Nada
            más, que la regla de `.stamp` es esa.
          */}
          <div className={`flex items-baseline justify-between ${TINTA_SUAVE}`}>
            <span className="stamp">DiviFriends</span>
            {/* La de este aparato, que es la única fecha verdadera de un
                ticket que aún no existe. Con la del servidor no cuadraría
                al hidratar y sería mentira a partir de las doce. */}
            <span className="stamp" suppressHydrationWarning>{fechaDeHoy(lang)}</span>
          </div>
          <Filete className="mt-3" />

          {pidiendoCodigo ? (
            /*
              La misma tarjeta, la otra puerta.

              El código se pedía en una hoja que subía por encima de todo, y
              para una casilla de seis letras era mucho aparato. La sección
              del código se da la vuelta en su sitio: cabecera y pie se quedan.
            */
            <section className="py-6">
              <p className="text-[19px] font-bold leading-tight tracking-[-0.025em]">{t.subir.codigoTitulo}</p>
              <p className={`mt-1 text-[13px] leading-relaxed ${TINTA_SUAVE}`}>{t.subir.codigoAyuda}</p>
              <div className="mt-4">
                <JoinByCode />
              </div>
              <button
                type="button"
                onClick={() => setPidiendoCodigo(false)}
                className={`mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 text-[14px] font-semibold ${TINTA_SUAVE}`}
              >
                <span aria-hidden className="text-amber-deep">{"\u2190"}</span>
                {t.subir.conFoto}
              </button>
            </section>
          ) : (
            <>
              {/* ── línea 1: la foto */}
              <section className="flex flex-col items-center py-6 text-center">
                {vista && <Escaner src={vista} />}

                <span className={`text-[21px] font-bold leading-tight tracking-[-0.025em] ${vista ? "mt-4" : ""}`}>
                  {busy ? getDynamicCopy() : t.subir.titulo}
                </span>

                {busy && (
                  <span className={`mt-2 max-w-sm text-[13px] leading-relaxed ${TINTA_SUAVE}`}>
                    {progress < 85 ? t.subir.tardo : t.subir.cuadrando}
                  </span>
                )}

                <div className="mt-3.5 min-h-[52px] w-full">
                  {busy ? (
                    <div className="w-full pt-2 text-left">
                      <div className={`text-[12px] mb-2 flex justify-between ${TINTA_SUAVE}`}>
                        <span>{t.subir.progreso}</span>
                        <span className="tnum">{progress}%</span>
                      </div>
                      {/* Sobre el crema, el ámbar de la marca se queda en gris
                          claro: la barra la lleva el ámbar oscuro, que es el
                          mismo color un par de pasos más abajo. */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#dcd2c2]">
                        <div
                          className="h-full rounded-full bg-amber-deep transition-all ease-linear"
                          style={{
                            width: `${progress}%`,
                            // Pegada al número cuando el recorrido es corto; con
                            // holgura cuando la barra va a saltos de 400 ms.
                            transitionDuration: targetCode ? "300ms" : "90ms",
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => fileRef.current?.click()}
                      /* Tinta sobre papel. El ámbar es el color de la marca
                         sobre el fondo oscuro, pero sobre el crema pierde casi
                         todo el contraste: en un ticket, lo impreso es negro.
                         La cámara va dentro del botón y pequeña: dice «foto»
                         sin volver a ser el pictograma en tesela de antes. */
                      className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-pieza bg-[#14100d] px-4 text-[16px] font-bold text-[#f4ece0] transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
                    >
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M4 8.5h3l1.5-2h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" />
                        <circle cx="12" cy="13" r="3.2" />
                      </svg>
                      {t.subir.boton}
                    </button>
                  )}
                </div>

                {!busy && (
                  <span className={`mt-2.5 text-[12.5px] leading-relaxed ${TINTA_SUAVE}`}>{t.subir.fotoAyuda}</span>
                )}
              </section>

              {/* ── línea 2: el código. Un botón de verdad, con borde, y no
                  una línea de texto: era lo que menos parecía tocable de la
                  hoja y es la puerta por la que entra la mitad de la mesa. */}
              {!targetCode && !busy && (
                <>
                  <Filete />
                  <section className="py-5 text-center">
                    <p className="text-[14px] font-semibold">{t.subir.tienesCodigo}</p>
                    <button
                      type="button"
                      onClick={() => setPidiendoCodigo(true)}
                      className="mt-2.5 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-pieza border-[1.5px] border-[#14100d] px-4 text-[15px] font-bold transition-colors active:bg-[#e6dccc]"
                    >
                      <span aria-hidden className="text-amber-deep">#</span>
                      {t.subir.conCodigo}
                    </button>
                  </section>
                </>
              )}
            </>
          )}

          {/* ── el pie: código de barras y la letra pequeña */}
          <Filete />
          <div className="pt-4">
            <CodigoDeBarras />
            <p className={`mt-2.5 text-balance text-center text-[12px] leading-relaxed lg:hidden ${TINTA_SUAVE}`}>
              {t.pasos.asiSeVe}
            </p>
          </div>
        </div>
        {/* Los dientes de abajo: la misma tira girada, que es como se hace en
            `ComoVa` y en la página de imprimir. */}
        <div className={`${PAPEL} torn-top h-2.5 rotate-180`} />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-pieza border border-clay/40 bg-clay/10 px-4 py-3 text-[13px] leading-relaxed text-clay"
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
    <div className="relative h-40 w-32 overflow-hidden rounded-pieza border border-line bg-paper sm:h-48 sm:w-36">
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


/** El filete de la impresora, con la tinta del papel: el `.rule` de la casa
    usa `--line`, que sobre el crema se ve como un tajo negro. */
function Filete({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-px ${className}`}
      style={{
        backgroundImage: "linear-gradient(90deg, #c9bda9 0 6px, transparent 6px 12px)",
        backgroundSize: "12px 1px",
      }}
    />
  );
}

/**
 * Un código de barras que no codifica nada, y lo sabe: es lo que lleva un
 * ticket al pie, y es lo que hace que el papel se lea como impreso y no como
 * un formulario crema. Tres degradados a distinto paso, para que las barras
 * no salgan a intervalos iguales.
 */
function CodigoDeBarras() {
  return (
    <div
      aria-hidden
      className="mx-auto h-7 w-[68%] opacity-[0.82]"
      style={{
        backgroundImage: [
          "repeating-linear-gradient(90deg, #14100d 0 2px, transparent 2px 7px)",
          "repeating-linear-gradient(90deg, #14100d 0 1px, transparent 1px 4px)",
          "repeating-linear-gradient(90deg, transparent 0 9px, #f4ece0 9px 11px, transparent 11px 23px)",
        ].join(","),
      }}
    />
  );
}

/** «3 sept», en el idioma de la portada. */
function fechaDeHoy(lang: string): string {
  return new Date().toLocaleDateString(lang === "en" ? "en-GB" : "es-ES", { day: "numeric", month: "short" });
}
