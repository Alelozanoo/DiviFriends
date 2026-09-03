import type { Metadata } from "next";
import { cookies } from "next/headers";
import { COOKIE, idiomaDe } from "@/lib/i18n/config";
import { I18nProvider } from "@/lib/i18n";
import AmigoLanding from "@/components/AmigoLanding";

/**
 * `/amigo/{código}`: el enlace que se manda por WhatsApp para hacerse amigos.
 *
 * Fuera de los buscadores: un código de amigo lleva a un nombre y una cara, y
 * eso no tiene que salir en Google.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Un amigo en DiviFriends",
  description: "Acepta para que os podáis meter en la misma mesa de un toque.",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AmigoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const lang = idiomaDe((await cookies()).get(COOKIE)?.value);
  return (
    <I18nProvider lang={lang}>
      <AmigoLanding codigo={codigo.toUpperCase().slice(0, 12)} />
    </I18nProvider>
  );
}
