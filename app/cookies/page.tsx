import Link from "next/link";
import type { Metadata } from "next";
import { CambiarCookies } from "@/components/Consent";

/**
 * Qué se guarda exactamente y cómo quitarlo.
 *
 * La página se mira el entorno y cuenta lo que hay: con píxel, la cookie de
 * Meta y cómo cambiar de idea; sin píxel, que no hay ninguna. Escrita así
 * porque una página de cookies que describe una cookie apagada —o que se calla
 * una encendida— es peor que no tenerla.
 */
const HAY_PIXEL = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID);

export const metadata: Metadata = {
  title: "Cookies",
  robots: { index: false, follow: true },
};

export default function CookiesPage() {
  return (
    <main id="contenido" className="mx-auto w-full max-w-2xl flex-1 px-[var(--gutter)] py-12">
      <h1 className="text-[27px] font-bold leading-tight tracking-[-0.03em]">Cookies</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        {HAY_PIXEL
          ? "Esta web no necesita cookies para repartir una cuenta. Sólo hay una, y sólo si la aceptas."
          : "Esta web no usa ninguna cookie. Ni una, ni de las nuestras ni de nadie."}
      </p>

      {HAY_PIXEL ? (
        <section className="mt-8 rounded-[15px] border border-line-soft bg-paper-2 p-5">
          <h2 className="text-[17px] font-bold tracking-[-0.02em]">La cookie de Meta (Facebook)</h2>
          <dl className="mt-3 space-y-2">
            <Fila k="Para qué">
              Saber si la gente que llega desde un anuncio acaba usando la app. Sin esto, pagar por
              un anuncio es tirar el dinero a ciegas.
            </Fila>
            <Fila k="Quién la pone">Meta Platforms Ireland Ltd.</Fila>
            <Fila k="Qué se manda">
              Que alguien ha abierto una mesa, se ha apuntado, ha marcado un plato o ha creado un
              divi. <b className="text-ink">Nunca</b> nombres, importes ni el código de la comanda.
            </Fila>
            <Fila k="Cuánto dura">Hasta 90 días.</Fila>
            <Fila k="Si dices que no">
              No se carga ni una línea de código de Facebook. La app funciona exactamente igual.
            </Fila>
          </dl>
        </section>
      ) : (
        <section className="mt-8 rounded-[15px] border border-mint/30 bg-mint/[0.06] p-5">
          <h2 className="text-[17px] font-bold tracking-[-0.02em] text-mint">
            No hay nada que aceptar
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            Hubo un píxel de Meta para medir anuncios. Está apagado: no hay campañas en marcha, y
            un píxel encendido «por si acaso» obliga a pedirte permiso para no medir nada.
          </p>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            Por eso tampoco verás cartel de cookies. Si algún día vuelve, volverá el cartel y esta
            página lo contará antes de que se cargue nada.
          </p>
        </section>
      )}

      <section className="mt-6 rounded-[15px] border border-line-soft bg-paper-2 p-5">
        <h2 className="text-[17px] font-bold tracking-[-0.02em]">Lo que se guarda en tu móvil</h2>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          Quién eres dentro de cada mesa, tu perfil por si vuelves, y la lista de tus divis. Se
          quedan en el navegador, no salen de ahí y sirven para no tener que preguntártelo cada
          vez.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Hay además <b className="text-ink">una cookie</b>, <code className="tnum">divi.lang</code>:
          guarda si prefieres la web en castellano o en inglés, dura un año y no viaja a ningún
          sitio. Es lo que la ley llama técnica, y por eso no se pide permiso para ponerla.
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Nada de esto es rastreo y nada de esto hace falta aceptarlo. Se borra vaciando los datos
          del sitio desde tu navegador.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <CambiarCookies className="min-h-[46px] rounded-xl border border-line px-5 py-3 text-[15px] font-semibold text-ink transition-colors active:bg-paper-3" />
        <Link href="/privacidad" className="text-[15px] text-amber underline underline-offset-2">
          Privacidad
        </Link>
        <Link href="/aviso-legal" className="text-[15px] text-amber underline underline-offset-2">
          Aviso legal
        </Link>
        <Link href="/" className="text-[15px] text-amber underline underline-offset-2">
          Volver
        </Link>
      </div>
    </main>
  );
}

function Fila({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line-soft pt-2 first:border-0 first:pt-0 sm:flex-row sm:gap-4">
      <dt className="stamp shrink-0 pt-1 text-ink-faint sm:w-32">{k}</dt>
      <dd className="text-[15px] leading-relaxed text-ink-soft">{children}</dd>
    </div>
  );
}
