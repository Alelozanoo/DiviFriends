import type { Metadata } from "next";
import Publicador from "./Publicador";
import { puedePasar } from "@/lib/tiktokSesion";

/**
 * Publicar en TikTok desde DiviFriends.
 *
 * Fuera del índice a propósito: es una herramienta de la casa para publicar en
 * el canal de la marca, no una página que deba encontrarse buscando.
 */
export const metadata: Metadata = {
  title: "Publicar en TikTok",
  description: "Sube un vídeo al canal de DiviFriends en TikTok.",
  robots: { index: false, follow: false },
};

export default async function TikTokPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string; llave?: string }>;
}) {
  const { aviso, llave } = await searchParams;
  const abierta = await puedePasar(llave);
  return (
    <main id="contenido" className="mx-auto w-full max-w-lg flex-1 px-[var(--gutter)] py-12">
      <h1 className="text-[27px] font-bold leading-tight tracking-[-0.03em]">
        Publicar en TikTok
      </h1>
      <p className="mt-3 mb-8 text-[15px] leading-relaxed text-ink-soft">
        Sube un vídeo al canal de DiviFriends. Antes de publicar verás en qué cuenta
        va, quién podrá verlo y qué permite tu cuenta.
      </p>
      {abierta ? (
        <Publicador aviso={aviso} />
      ) : (
        <p className="text-[15px] leading-relaxed text-ink-soft">
          Esta herramienta es privada. Si te toca usarla, entra con el enlace que
          lleva la llave.
        </p>
      )}
    </main>
  );
}
