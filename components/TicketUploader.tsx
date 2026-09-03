"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EV, track } from "@/lib/track";
import { useT } from "@/lib/i18n";
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
        <div className={`${PAPEL} relative overflow-hidden`}>
        {/*
          La misma tarjeta, dos puertas.

          El código se pedía en una hoja que subía por encima de todo, y para
          una sola casilla de seis letras era mucho aparato: tapabas la portada
          entera para escribir un código. Ahora la tarjeta se da la vuelta en su
          sitio y el pie de abajo cambia de palabra para volver.
        */}
        {pidiendoCodigo ? (
          <div className="flex w-full flex-col items-center gap-3.5 px-[var(--gutter)] py-10 text-center">
            <span className="text-[21px] font-bold leading-tight tracking-[-0.025em]">
              {t.subir.codigoTitulo}
            </span>
            <span className={`max-w-xs text-[13px] leading-relaxed ${TINTA_SUAVE}`}>
              {t.subir.codigoAyuda}
            </span>
            <div className="w-full">
              <JoinByCode />
            </div>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center gap-3.5 px-[var(--gutter)] py-10 text-center">
            {/*
              En cuanto la foto está lista se enseña con el escáner encima. Leer
              un ticket tarda varios segundos y un icono parpadeando no dice nada:
              ver tu propia foto con la línea pasando por encima cuenta que se
              está trabajando sobre ella, y que la que has hecho vale.
            */}
            {/*
              Ya no hay pictograma de cámara esperando dentro de un cuadradito
              ámbar. Ese apilado —icono en tesela, titular en negrita, botón
              pastilla a todo el ancho— es la tarjeta de héroe que sale por
              defecto en cualquier web generada, y aquí encima sobraba: el
              objeto del que estamos hablando es la hoja sobre la que está
              puesto, no un dibujo de una cámara. Cuando hay foto de verdad sí
              se enseña, porque entonces sí hay algo que mirar.
            */}
            {vista && <Escaner src={vista} />}

            <span className="text-[21px] font-bold leading-tight tracking-[-0.025em]">
              {busy ? getDynamicCopy() : t.subir.titulo}
            </span>

            {/* Sólo mientras trabaja: al empezar, la frase de apoyo repetía lo que
                ya dicen el título y los dos botones de debajo. */}
            {busy && (
              <span className={`max-w-sm text-[13px] leading-relaxed ${TINTA_SUAVE}`}>
                {progress < 85 ? t.subir.tardo : t.subir.cuadrando}
              </span>
            )}

            <div className="min-h-[52px] w-full">
              {busy ? (
                <div className="w-full pt-2 text-left">
                  <div className={`text-[12px] mb-2 flex justify-between ${TINTA_SUAVE}`}>
                    <span>{t.subir.progreso}</span>
                    <span className="tnum">{progress}%</span>
                  </div>
                  {/* Sobre el crema, el ámbar de la marca se queda en gris
                      claro: la barra la lleva el ámbar oscuro, que es el mismo
                      color un par de pasos más abajo. */}
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
                  /* Tinta sobre papel. El ámbar es el color de la marca sobre
                     el fondo oscuro, pero sobre el crema pierde casi todo el
                     contraste y deja de leerse como el sitio donde hay que
                     tocar: en un ticket, lo impreso es negro. */
                  className="min-h-[52px] w-full rounded-pieza bg-[#14100d] px-4 text-[15px] font-bold text-[#f4ece0] transition-transform active:scale-[0.98] disabled:cursor-wait disabled:opacity-60"
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
            {/* El filete de la impresora, pintado con la tinta del papel: el
                `.rule` de la casa usa `--line`, que sobre el crema se ve como
                un tajo negro en vez de como una perforación. */}
            <div
              className="h-px"
              style={{
                backgroundImage: "linear-gradient(90deg, #c9bda9 0 6px, transparent 6px 12px)",
                backgroundSize: "12px 1px",
              }}
            />
            <button
              type="button"
              onClick={() => setPidiendoCodigo(!pidiendoCodigo)}
              className={`flex min-h-[52px] w-full items-center justify-center gap-2 whitespace-nowrap px-4 text-[15px] font-semibold transition-colors active:bg-[#e6dccc] ${TINTA_SUAVE}`}
            >
              {/* Una sola línea: la pregunta más el enlace se partían en dos en
                  390 px y el botón perdía la forma de puerta. Y es un acto, no
                  una pregunta, igual que «Subir foto». */}
              <span aria-hidden className="text-amber-deep">{pidiendoCodigo ? "\u2190" : "#"}</span>
              {pidiendoCodigo ? t.subir.conFoto : t.subir.conCodigo}
            </button>
          </>
        )}
        </div>
        {/* Los dientes de abajo: la misma tira girada, que es como se hace en
            `ComoVa` y en la p\u00e1gina de imprimir. */}
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
