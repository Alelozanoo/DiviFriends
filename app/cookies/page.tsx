import Link from "next/link";
import type { Metadata } from "next";
import { CambiarCookies } from "@/components/Consent";

/**
 * La segunda capa del cartel: qué se guarda exactamente y cómo quitarlo.
 *
 * Escrita para leerse, no para cubrirse las espaldas: si hay que explicarlo
 * con abogado delante, es que no debería estar ahí.
 */
export const metadata: Metadata = {
  title: "Cookies",
  robots: { index: false, follow: true },
};

export default function CookiesPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Cookies</h1>
      <p className="mt-3 text-ink-soft">
        Esta web no necesita cookies para repartir una cuenta. Sólo hay una, y sólo si la aceptas.
      </p>

      <section className="mt-8 rounded-2xl border border-line bg-paper-2 p-5">
        <h2 className="font-bold tracking-tight">La cookie de Meta (Facebook)</h2>
        <dl className="mt-3 space-y-2 text-sm">
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

      <section className="mt-6 rounded-2xl border border-line bg-paper-2 p-5">
        <h2 className="font-bold tracking-tight">Lo que se guarda en tu móvil</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Tu respuesta a este aviso y tu nombre dentro de la mesa en la que estés. Se quedan en el
          navegador, no salen de ahí y sirven para que no haya que preguntártelo cada vez. Eso no
          es rastreo y no hace falta aceptarlo.
        </p>
      </section>

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <CambiarCookies className="rounded-xl border border-line px-4 py-3 text-sm font-bold text-ink-soft transition-colors active:bg-paper-3" />
        <Link href="/" className="text-sm text-amber underline underline-offset-2">
          Volver
        </Link>
      </div>
    </main>
  );
}

function Fila({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-line/60 pt-2 first:border-0 first:pt-0 sm:flex-row sm:gap-4">
      <dt className="stamp shrink-0 pt-0.5 text-ink-faint sm:w-32">{k}</dt>
      <dd className="leading-relaxed text-ink-soft">{children}</dd>
    </div>
  );
}
