import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Wordmark } from "@/components/Logo";
import RepartirPlantilla from "@/components/RepartirPlantilla";
import { PLANTILLAS, SLUGS } from "@/lib/plantillas";
import { money, quantity } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

/**
 * Las cuentas de los vídeos sí se indexan, al revés que las comandas.
 *
 * Una comanda (`/t/CÓDIGO`) es la cena de gente real y lleva `noindex` para que
 * no acabe en Google. Esto es lo contrario: una página pública, siempre la
 * misma, hecha para que alguien llegue a ella. Por eso vive fuera de `/t/` y no
 * comparte sus reglas.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = PLANTILLAS[slug];
  if (!p) return {};
  return {
    title: p.titulo,
    description: p.entradilla,
    alternates: { canonical: `/reparte/${slug}` },
    openGraph: {
      type: "website",
      siteName: "DiviFriends",
      title: p.titulo,
      description: p.entradilla,
    },
    twitter: { card: "summary_large_image", title: p.titulo, description: p.entradilla },
  };
}

export default async function RepartePage({ params }: Props) {
  const { slug } = await params;
  const p = PLANTILLAS[slug];
  if (!p) notFound();
  const { cuenta } = p;

  return (
    <main id="contenido" className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <Link href="/" className="stamp text-ink-faint transition-opacity hover:opacity-75">
        ← <Wordmark />
      </Link>

      <p className="stamp mt-6 text-amber">La cuenta del vídeo</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{p.titulo}</h1>
      <p className="mt-3 text-ink-soft">{p.entradilla}</p>

      {/* El ticket, en papel de verdad sobre el negro. Es el mismo que sale en
          la animación, línea a línea, para que quien viene del vídeo lo
          reconozca antes de leer nada. */}
      <div className="mt-8">
        <div className="torn-top h-3 bg-[#f4ece0]" />
        <div className="bg-[#f4ece0] px-5 pb-5 pt-2 text-[#14100d]">
          <p className="stamp text-[#776a5c]">{cuenta.tableLabel}</p>
          <div className="mt-3 space-y-2">
            {cuenta.items.map((item, i) => (
              <div key={`${item.name}-${i}`} className="flex items-baseline justify-between gap-4">
                <span className="min-w-0">
                  {item.qty > 1 ? (
                    <span className="tnum mr-2 text-[#776a5c]">{quantity(item.qty)}×</span>
                  ) : null}
                  {item.name}
                </span>
                <span className="tnum shrink-0 whitespace-nowrap font-semibold">
                  {money(item.totalCents)}
                </span>
              </div>
            ))}
          </div>
          <div className="rule my-3 opacity-40" />
          <div className="flex items-baseline justify-between">
            <span className="stamp text-[#776a5c]">Total</span>
            <span className="tnum whitespace-nowrap text-xl font-bold">
              {money(cuenta.totalCents)}
            </span>
          </div>
        </div>
        <div className="torn-top h-3 rotate-180 bg-[#f4ece0]" />
      </div>

      <div className="mt-8">
        <RepartirPlantilla slug={slug} />
      </div>

      <p className="mt-10 text-center text-lg font-semibold text-balance">{p.pregunta}</p>
      <p className="mt-6 text-center text-sm text-ink-faint">
        ¿Tienes tu propia cuenta que repartir?{" "}
        <Link href="/" className="text-amber underline underline-offset-4">
          Hazle una foto
        </Link>
      </p>
    </main>
  );
}
