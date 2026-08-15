import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
// `COOKIE` y `Lang` se piden a `config`, que no lleva "use client": pedírselos
// a `index` los convertía en una referencia de cliente y la cookie no se leía.
import { COOKIE, idiomaDe, type Lang } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n";
import { getTicketState } from "@/lib/store";
import { ticketQrSvg, ticketUrl } from "@/lib/ticketUrl";
import SplitApp from "@/components/SplitApp";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const state = await getTicketState(code.toUpperCase());
  // La marca la pone la plantilla del layout.
  return {
    title: state?.ticket.place
      ? `${state.ticket.place} · repartir la cuenta`
      : "Repartir la cuenta",
    // Una comanda es la cuenta de gente real y se abre con sólo tener el
    // código. Fuera de los buscadores: indexarlas dejaría cenas ajenas —con
    // el bar, la fecha y lo que pidió cada uno— a un search de distancia.
    robots: { index: false, follow: false, nocache: true },
  };
}

/**
 * El idioma de la comanda sale de la cookie, leída en el servidor.
 *
 * Aquí sale gratis porque esta página ya se pinta a demanda, y así el HTML
 * llega en el idioma bueno: decidirlo después de pintar dejaría un parpadeo en
 * español a quien recibe el enlace desde fuera.
 */
async function idioma(): Promise<Lang> {
  return idiomaDe((await cookies()).get(COOKIE)?.value);
}

export default async function TicketPage({ params }: Props) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();
  const [state, lang] = await Promise.all([getTicketState(code), idioma()]);

  if (!state) {
    const ingles = lang === "en";
    return (
      <main className="mx-auto flex max-w-md flex-1 flex-col justify-center px-6 py-20 text-center">
        <p className="stamp text-ink-faint">{ingles ? "Code" : "Código"} {code}</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {ingles ? "This bill doesn't exist" : "Esta comanda no existe"}
        </h1>
        <p className="mt-3 text-ink-soft">
          {ingles
            ? "The code may be mistyped, or the bill may already have been deleted."
            : "Puede que el código esté mal escrito o que la comanda ya se haya borrado."}
        </p>
        <Link
          href="/"
          className="mt-8 rounded-xl bg-amber px-5 py-3 font-semibold text-paper transition-colors hover:bg-ink"
        >
          {ingles ? "Back to the start" : "Volver al inicio"}
        </Link>
      </main>
    );
  }

  // El QR se pinta en el servidor y viaja con la página: así el «invita a la
  // mesa» abre al instante, sin descargar ningún generador en el móvil.
  const url = await ticketUrl(code);
  return (
    <I18nProvider lang={lang}>
      <SplitApp initial={state} shareUrl={url} qrSvg={await ticketQrSvg(url)} />
    </I18nProvider>
  );
}
